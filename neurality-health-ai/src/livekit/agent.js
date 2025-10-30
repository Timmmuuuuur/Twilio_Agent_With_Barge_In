import OpenAI from "openai";
import { roomManager } from "./roomManager.js";
import { logger, createAudit } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * LiveKit Agent that runs in a room and handles conversation
 * Note: Uses server-side room management, audio bridging handled by Twilio webhook
 */
export class ConversationAgent {
  constructor(callId) {
    this.callId = callId;
    this.roomName = null;
    this.connected = false;
    this.transcript = [];
    this.toolTrace = [];
    this.slots = {};
    this.intents = [];
    this.audit = createAudit(callId);
  }

  /**
   * Connect agent to LiveKit room (server-side management)
   */
  async connect() {
    try {
      this.roomName = await roomManager.createRoom(this.callId);
      this.connected = true;
      
      console.log(`🤖 Agent connected to room: ${this.roomName} (server-side)`);
      
      return { roomName: this.roomName };
    } catch (err) {
      // Graceful degradation - continue without LiveKit if unavailable
      console.warn(`⚠️ LiveKit unavailable, running in standalone mode:`, err.message);
      this.roomName = `call-${this.callId}`;
      this.connected = true;
      return { roomName: this.roomName };
    }
  }

  /**
   * Handle disconnect
   */
  async handleDisconnect() {
    console.log(`🔌 Agent disconnected from room`);
    this.connected = false;
    this.saveAudit();
  }

  /**
   * Process user utterance and generate response
   */
  async processUtterance(userText) {
    const timestamp = new Date().toISOString();
    
    // Add to transcript
    this.transcript.push({
      role: "user",
      text: userText,
      ts: timestamp
    });

    console.log(`🗣️ User (${this.callId}):`, userText);

    // Call MCP tools based on conversation context
    await this.extractSlotsAndCallTools(userText);

    // Generate AI response
    const aiResponse = await this.generateResponse(userText);
    
    this.transcript.push({
      role: "agent",
      text: aiResponse,
      ts: new Date().toISOString()
    });

    console.log(`🤖 Agent (${this.callId}):`, aiResponse);
    
    return aiResponse;
  }

  /**
   * Extract slots and call appropriate MCP tools
   */
  async extractSlotsAndCallTools(userText) {
    // Use LLM to extract structured information
    try {
      const extraction = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract patient information from the conversation. Return JSON with:
{
  "patient_first": "string or null",
  "patient_last": "string or null",
  "phone": "E.164 format or null",
  "payer": "insurance company or null",
  "plan": "insurance plan or null",
  "appointment_type": "cleaning|checkup|filling|root_canal|extraction|consultation or null",
  "time_pref": "time preference or null",
  "location_id": "location or null",
  "needs_coverage_check": boolean,
  "needs_availability": boolean,
  "needs_booking": boolean
}`
          },
          { role: "user", content: userText }
        ],
        response_format: { type: "json_object" }
      });

      const extracted = JSON.parse(extraction.choices[0].message.content);
      
      // Merge extracted slots
      Object.assign(this.slots, extracted);

      // Call MCP tools based on extracted intents
      if (extracted.needs_coverage_check && extracted.payer && extracted.plan) {
        await this.callCheckInsurance(extracted.payer, extracted.plan);
      }

      if (extracted.needs_availability && extracted.location_id) {
        await this.callGetAvailability(extracted.location_id, extracted.appointment_type);
      }

    } catch (err) {
      console.error("Slot extraction error:", err);
    }
  }

  /**
   * Call MCP checkInsuranceCoverage tool
   */
  async callCheckInsurance(payer, plan) {
    try {
      const response = await fetch(`http://localhost:${process.env.PORT_MCP || 3001}/checkInsuranceCoverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payer,
          plan,
          procedure_code: "D1110" // Default to cleaning
        })
      });

      const result = await response.json();
      
      this.toolTrace.push({
        tool: "check_insurance_coverage",
        input: { payer, plan, procedure_code: "D1110" },
        output: result,
        ok: response.ok
      });

      if (!this.intents.includes("coverage_check")) {
        this.intents.push("coverage_check");
      }

      return result;
    } catch (err) {
      console.error("Insurance check failed:", err);
      return null;
    }
  }

  /**
   * Call MCP getProviderAvailability tool
   */
  async callGetAvailability(locationId, appointmentType) {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      
      const endDate = new Date(tomorrow);
      endDate.setDate(endDate.getDate() + 7);

      const response = await fetch(`http://localhost:${process.env.PORT_MCP || 3001}/getProviderAvailability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          date_range: {
            start: tomorrow.toISOString(),
            end: endDate.toISOString()
          },
          appointment_type: appointmentType || "cleaning"
        })
      });

      const result = await response.json();
      
      this.toolTrace.push({
        tool: "get_provider_availability",
        input: {
          location_id: locationId,
          date_range: { start: tomorrow.toISOString(), end: endDate.toISOString() },
          appointment_type: appointmentType || "cleaning"
        },
        output: result,
        ok: response.ok
      });

      if (!this.intents.includes("availability")) {
        this.intents.push("availability");
      }

      return result;
    } catch (err) {
      console.error("Availability check failed:", err);
      return null;
    }
  }

  /**
   * Generate conversational response
   */
  async generateResponse(userText) {
    const contextMessages = [
      {
        role: "system",
        content: `You are a professional front-desk assistant at Neurality Health. Be concise and helpful.
Current context:
- Patient: ${this.slots.patient_first || "unknown"} ${this.slots.patient_last || ""}
- Phone: ${this.slots.phone || "unknown"}
- Insurance: ${this.slots.payer || "unknown"} ${this.slots.plan || ""}
- Recent tool calls: ${this.toolTrace.length} tools used

Keep responses under 2 sentences. Guide the conversation toward booking.`
      }
    ];

    // Add recent transcript
    this.transcript.slice(-4).forEach(msg => {
      contextMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text
      });
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: contextMessages,
      max_tokens: 150,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  }

  /**
   * Save audit JSON
   */
  saveAudit() {
    const auditData = {
      call_id: this.callId,
      transcript: this.transcript,
      intents: this.intents,
      slots: this.slots,
      tool_trace: this.toolTrace,
      outcome: {
        booked: this.intents.includes("book_appointment"),
        confirmation_id: this.toolTrace.find(t => t.tool === "book_appointment")?.output?.confirmation_id || null,
        next_steps: this.intents.includes("send_sms") ? "SMS sent" : "Pending"
      }
    };

    this.audit.push(auditData);
    console.log(`💾 Saved audit for call ${this.callId}`);
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    if (this.connected) {
      await this.handleDisconnect();
    }
    this.saveAudit();
    
    try {
      await roomManager.deleteRoom(this.callId);
    } catch (err) {
      console.warn(`Failed to delete room:`, err.message);
    }
  }
}

