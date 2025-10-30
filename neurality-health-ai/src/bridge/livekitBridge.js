// src/bridge/livekitBridge.js
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

export async function startBridgeServer(port) {
  const wss = new WebSocketServer({ port });
  console.log(`✅ Bridge WS on ${port}`);

  wss.on("connection", (ws) => {
    const streamId = uuidv4().slice(0, 8);
    console.log(`🔗 Twilio Media Stream connected (${streamId})`);

    ws.on("message", (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        switch (data.event) {
          case "start":
            ws._streamSid = data.start.streamSid;
            console.log(`📞 Stream started (${ws._streamSid})`);
            ws.send(JSON.stringify({ event: "connected" }));
            break;

          case "media":
            // echo the same frame straight back
            ws.send(
              JSON.stringify({
                event: "media",
                streamSid: ws._streamSid,
                media: { payload: data.media.payload },
              })
            );
            break;

          case "stop":
            console.log("📴 Stream stopped");
            break;
        }
      } catch (err) {
        console.error("Parse error:", err);
      }
    });

    ws.on("close", () => console.log("❌ Socket closed"));
  });
}
