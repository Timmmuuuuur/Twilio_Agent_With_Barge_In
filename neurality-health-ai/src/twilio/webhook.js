import express from "express";
import pkg from "twilio";
import { WebSocketServer } from "ws";
import OpenAI from "openai";
import wav from "node-wav";
import { encode as muLawEncode } from "mulaw-js";
import { respondToUser } from "../agent/AiAgent.js";
import { ConversationAgent } from "../livekit/agent.js";
import { v4 as uuidv4 } from "uuid";
const { twiml } = pkg;

export async function startTwilioWebhook(port) {
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  app.post("/voice", (req, res) => {
    const vr = new twiml.VoiceResponse();
    
    // Use ngrok URL if available, otherwise construct from request
    const publicUrl = process.env.PUBLIC_URL || `https://${req.headers["host"]}`;
    const host = publicUrl.replace(/^https?:\/\//, "").replace(/^http:\/\//, ""); // e.g., abc.ngrok-free.app
    const wssUrl = `wss://${host}/bridge`;
    
    console.log(`📡 Using WebSocket URL: ${wssUrl}`);

    // Start stream in background, play greeting via TTS, then keep call open
    const start = vr.start();
    start.stream({ url: wssUrl });
    
    vr.say({ voice: "alice" }, "Hello! You are connected to Neurality Health. How can I help you today?");
    
    // Keep call alive for conversation
    vr.pause({ length: 600 });

    res.type("text/xml").send(vr.toString());
  });

  // Start HTTP server and attach a WebSocket server at /bridge so Twilio can connect
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`✅ Twilio webhook running on port ${port}`);
    });

    const wss = new WebSocketServer({ server, path: "/bridge" });
    wss.on("connection", async (ws) => {
      console.log("🔗 Twilio Media Stream connected (on /bridge)");
      
      ws.on("error", (error) => {
        console.error("❌ WebSocket error:", error);
      });

      // ----- Per-connection state -----
      const callId = uuidv4();
      const agent = new ConversationAgent(callId);
      
      // Connect agent to LiveKit room
      try {
        await agent.connect();
        console.log(`✅ LiveKit agent connected for call ${callId}`);
      } catch (err) {
        console.error("Failed to connect LiveKit agent:", err);
      }
      
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      let pcmBuffer = [];
      let lastMediaAt = Date.now();
      let firstMediaAt = 0;
      let processing = false;
      let aiSpeaking = false; // Flag to prevent buffering while AI talks
      let aiSpeakingTimeout = null; // Timeout handle for AI speech
      let streamSid = null;
      const SILENCE_MS = 800; // 0.8s inactivity ⇒ end of utterance (fast responses)
      const MAX_UTTERANCE_MS = 6000; // hard cap per utterance
      const MIN_AUDIO_SAMPLES = 4000; // Minimum 0.5 second of audio at 8kHz before processing (reduced for speed)
      const BARGE_IN_THRESHOLD = 3200; // 0.4s of audio triggers barge-in

      function base64ToBytes(b64){
        return Buffer.from(b64, "base64");
      }

      function mulawToPcm16(muBuf){
        // mulaw-js encode takes PCM16 -> mu-law, but we need decode.
        // Implement μ-law decode (256 values) quickly here.
        const MULAW_MAX = 0x1FFF;
        const BIAS = 0x84;
        const SIGN_BIT = 0x80;
        const QUANT_MASK = 0x0F;
        const SEG_SHIFT = 4;
        const SEG_MASK = 0x70;

        const out = new Int16Array(muBuf.length);
        for (let i = 0; i < muBuf.length; i++){
          let uVal = ~muBuf[i] & 0xff;
          let t = ((uVal & QUANT_MASK) << 3) + BIAS;
          t <<= ((uVal & SEG_MASK) >>> SEG_SHIFT);
          t -= BIAS;
          out[i] = (uVal & SIGN_BIT) ? -t : t;
        }
        return out;
      }

      function concatInt16(chunks){
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const out = new Int16Array(total);
        let o = 0;
        for (const c of chunks){ out.set(c, o); o += c.length; }
        return out;
      }

      function int16ToWav(int16, sampleRate = 8000){
        const float32 = new Float32Array(int16.length);
        for (let i=0;i<int16.length;i++) float32[i] = int16[i] / 32768;
        const buffer = wav.encode([float32], { sampleRate, float: true, bitDepth: 32 });
        return Buffer.from(buffer);
      }

      async function transcribePcm16(int16){
        try {
          const wavBuf = int16ToWav(int16, 8000);
          // OpenAI SDK in Node expects a File object
          const file = new File([wavBuf], "audio.wav", { type: "audio/wav" });
          const resp = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1"
          });
          return resp.text?.trim() || "";
        } catch (e){
          console.error("STT error (whisper-1)", e);
          return "";
        }
      }

      async function textToAudio(text){
        // Use tts-1 with speed optimization for fastest response
        try {
          const speech = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
            response_format: "pcm",
            speed: 1.1 // Slightly faster for snappier responses
          });
          const arrayBuffer = await speech.arrayBuffer();
          const int16Buffer = new Int16Array(arrayBuffer);
          return { int16: int16Buffer, sampleRate: 24000 }; // tts-1 default is 24kHz
        } catch (e){
          console.error("TTS error (tts-1)", e);
          return null;
        }
      }

      async function sendPcm16AsMulaw(int16, sampleRate){
        // Resample if not 8000 (simple drop/downsample for demo)
        let src = int16;
        if (sampleRate !== 8000){
          const ratio = sampleRate / 8000;
          const outLen = Math.floor(int16.length / ratio);
          const out = new Int16Array(outLen);
          for (let i=0;i<outLen;i++) out[i] = int16[Math.floor(i*ratio)];
          src = out;
        }
        console.log(`📤 Sending ${src.length} samples as mulaw over ${Math.ceil(src.length/160)} frames`);
        
        // 20ms frames at 8kHz ⇒ 160 samples per frame
        const FRAME_SAMPLES = 160;
        let frameCount = 0;
        
        for (let i=0;i<src.length; i+=FRAME_SAMPLES){
          const slice = src.subarray(i, i+FRAME_SAMPLES);
          if (slice.length < FRAME_SAMPLES) break;
          // Use mulaw-js encode on the whole frame
          const muArr = Buffer.from(muLawEncode(slice));
          try {
            if (ws.readyState === 1) { // WebSocket.OPEN
              ws.send(JSON.stringify({
                event: "media",
                streamSid,
                media: { payload: muArr.toString("base64") }
              }));
              frameCount++;
            } else {
              console.error(`WebSocket not open (readyState=${ws.readyState}), stopping at frame ${frameCount}`);
              break;
            }
          } catch (e) {
            console.error("Error sending media frame:", e);
            break;
          }
          // No delay - send all frames immediately and let Twilio buffer them
        }
        console.log(`✅ Sent ${frameCount} frames of audio`);
      }

      async function processUtterance(){
        if (processing) return;
        processing = true;
        try {
          const samples = concatInt16(pcmBuffer);
          pcmBuffer = [];
          
          // Skip if too short (likely noise or echo)
          if (samples.length < MIN_AUDIO_SAMPLES) {
            console.log(`⏭️ Skipping short audio (${samples.length} samples)`);
            return;
          }
          
          const text = await transcribePcm16(samples);
          if (!text || text.length < 3) {
            console.log("⏭️ Skipping empty or very short transcript");
            return;
          }
          console.log("🗣️ User:", text);

          // Use LiveKit agent to process utterance (includes tool calling)
          const reply = await agent.processUtterance(text);
          console.log("🤖 AI:", reply);

          const audioResult = await textToAudio(reply);
          if (!audioResult){
            console.error("No TTS audio produced");
            return;
          }
          console.log(`🔊 Generated audio: ${audioResult.int16.length} samples at ${audioResult.sampleRate}Hz`);
          
          // Block audio buffering while AI speaks
          aiSpeaking = true;
          pcmBuffer = []; // Clear any buffered audio
          
          await sendPcm16AsMulaw(audioResult.int16, audioResult.sampleRate);
          
          // Calculate playback duration (reduced buffer for faster interaction)
          const durationMs = (audioResult.int16.length / audioResult.sampleRate) * 1000;
          aiSpeakingTimeout = setTimeout(() => {
            aiSpeaking = false;
            aiSpeakingTimeout = null;
            console.log("🎤 AI finished, listening for user...");
          }, durationMs + 200); // Reduced to 200ms buffer for faster response
        } catch (e){
          console.error("processUtterance error:", e);
        } finally {
          processing = false;
          firstMediaAt = 0;
        }
      }
      ws.on("message", (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          switch (data.event) {
            case "start":
              ws._streamSid = data.start.streamSid;
              streamSid = ws._streamSid;
              console.log(`📞 Stream started (${ws._streamSid}), streamSid=${streamSid}`);
              console.log(`🎙️ VAD active: SILENCE_MS=${SILENCE_MS}, aiSpeaking=${aiSpeaking}`);
              // Greeting handled by Twilio Say in TwiML
              break;
            case "media":
              const mu = base64ToBytes(data.media.payload);
              const pcm16 = mulawToPcm16(mu);
              
              // BARGE-IN: If AI is speaking and user starts talking, interrupt AI
              if (aiSpeaking) {
                pcmBuffer.push(pcm16);
                const totalSamples = pcmBuffer.reduce((sum, buf) => sum + buf.length, 0);
                
                if (totalSamples > BARGE_IN_THRESHOLD) {
                  console.log("🛑 BARGE-IN detected! Stopping AI...");
                  aiSpeaking = false;
                  if (aiSpeakingTimeout) {
                    clearTimeout(aiSpeakingTimeout);
                    aiSpeakingTimeout = null;
                  }
                  // Continue buffering for user input
                  firstMediaAt = Date.now();
                  lastMediaAt = Date.now();
                }
                break;
              }
              
              // Append mu-law -> PCM16 to buffer
              const now = Date.now();
              lastMediaAt = now;
              if (!firstMediaAt) firstMediaAt = now;
              pcmBuffer.push(pcm16);
              
              // Debug: log buffer size periodically
              if (pcmBuffer.length % 100 === 0) {
                console.log(`📊 Buffer size: ${pcmBuffer.length} chunks, ${pcmBuffer.reduce((s,b)=>s+b.length,0)} samples`);
              }
              break;
            case "stop":
              console.log("📴 Stream stopped");
              break;
          }
        } catch (err) {
          console.error("Parse error:", err);
        }
      });
      ws.on("close", async () => {
        console.log("❌ Socket closed");
        await agent.disconnect();
      });

      // Silence timeout checker
      const interval = setInterval(() => {
        // Always log to verify interval is running
        const hasBuffer = pcmBuffer.length > 0;
        const now = Date.now();
        
        if (!streamSid) {
          if (hasBuffer) console.log(`⚠️ VAD blocked: no streamSid (buffer=${pcmBuffer.length})`);
          return;
        }
        if (aiSpeaking) {
          if (hasBuffer) console.log(`⚠️ VAD blocked: aiSpeaking=true (buffer=${pcmBuffer.length})`);
          return;
        }
        
        if (hasBuffer){
          const silenceDuration = now - lastMediaAt;
          const utteranceDuration = now - (firstMediaAt || now);
          
          // Always log when we have buffer
          console.log(`🔍 VAD: buffer=${pcmBuffer.length} chunks (${pcmBuffer.reduce((s,b)=>s+b.length,0)} samples), silence=${silenceDuration}ms, utterance=${utteranceDuration}ms, threshold=${SILENCE_MS}ms`);
          
          if (silenceDuration > SILENCE_MS){
            console.log(`⏸️ Silence detected (${silenceDuration}ms > ${SILENCE_MS}ms), processing...`);
            processUtterance();
          } else if (firstMediaAt && utteranceDuration > MAX_UTTERANCE_MS){
            console.log(`⏱️ Max utterance time (${utteranceDuration}ms > ${MAX_UTTERANCE_MS}ms), processing...`);
            processUtterance();
          }
        }
      }, 150);
      ws.on("close", () => clearInterval(interval));
    });

    console.log(`✅ WebSocket bridge attached at wss://<host>/bridge`);
    resolve();
  });
}
