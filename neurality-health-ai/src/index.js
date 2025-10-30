// src/index.js
import dotenv from "dotenv";
dotenv.config(); // ✅ Load .env first
console.log("🔍 ENV prefix:", process.env.OPENAI_API_KEY?.slice(0, 10));

// Lazy load modules after dotenv is ready
const { startBridgeServer } = await import("./bridge/livekitBridge.js");
const { startTwilioWebhook } = await import("./twilio/webhook.js");
const { startMCPServer } = await import("./mcp/server.js");

await startMCPServer(process.env.PORT_MCP || 3001);
await startBridgeServer(process.env.PORT_BRIDGE || 3002);
await startTwilioWebhook(process.env.PORT_TWILIO || 3000);

console.log("✅ Neurality Health AI system fully started");
