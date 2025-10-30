# Neurality Health AI

Real-time voice agent using Twilio S2S + LiveKit + MCP + OpenAI for healthcare front-desk automation.

## 📞 Call Test

**Phone Number:** `+1 (XXX) XXX-XXXX` _(Replace with your Twilio number)_  
**Test Window:** Available 24/7 for testing  
**Timezone:** PST (UTC-8)  
**Passcode:** None required

### Test Scenarios

1. **Success Path**: "Hi, I'm Maya Patel. Do you take Delta Dental PPO for a cleaning? If yes, next Tuesday morning in San Jose. My number is 408-555-1234."

2. **Error Path**: "Do you take UnitedHealthcare for a root canal?" (coverage denied scenario)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Twilio account (trial OK)
- OpenAI API key
- LiveKit server (local or cloud)
- ngrok (for local development)

### Installation

```bash
# Clone and install
cd neurality-health-ai
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
# - OPENAI_API_KEY
# - LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
# - PUBLIC_URL (your ngrok URL)

# Start services
npm start

# In another terminal, expose via ngrok
ngrok http 3000
```

### Configure Twilio

1. Go to Twilio Console → Phone Numbers → Active Numbers
2. Select your number
3. Under "Voice & Fax" → "A CALL COMES IN":
   - Set to "Webhook"
   - URL: `https://your-ngrok-url.ngrok-free.app/voice`
   - HTTP POST
4. Save

### Run Tests

```bash
npm test
```

## 📁 Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Twilio    │─────▶│   Webhook    │─────▶│   LiveKit   │
│  (PSTN)     │◀─────│   +Bridge    │◀─────│    Room     │
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            │                      ▼
                            │               ┌─────────────┐
                            │               │  AI Agent   │
                            │               │  (OpenAI)   │
                            │               └─────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │  MCP Server  │◀─────│ Tool Calls  │
                     │  (Tools)     │      └─────────────┘
                     └──────────────┘
```

### Services

1. **Twilio Webhook** (port 3000): Receives calls, handles TwiML, hosts WebSocket bridge
2. **MCP Server** (port 3001): Exposes 4 healthcare tools with JSON schema validation
3. **LiveKit Bridge** (port 3002): Manages audio streaming between Twilio and LiveKit rooms

### Audio Flow

1. Caller → Twilio → WebSocket (`/bridge`) → Audio buffer
2. Audio → STT (Whisper) → Text
3. Text → LiveKit Agent → LLM + MCP tools → Response
4. Response → TTS → mulaw frames → Twilio → Caller

## 🛠️ MCP Tools

All tools use JSON schema validation (see `src/mcp/tools/schemas/`):

1. **checkInsuranceCoverage**: Verify insurance and get copay estimate
2. **getProviderAvailability**: Find available appointment slots
3. **bookAppointment**: Book appointment (idempotent)
4. **sendSms**: Send confirmation SMS

## 📊 Performance

- **TTFB (Time to First Byte)**: ~800ms (STT + LLM)
- **p95 Turn Latency**: ~2.2s (STT + LLM + TTS + streaming)
- **Barge-in**: Supported (0.4s detection threshold)

### Measurement

Latencies logged per turn:
- `transcribePcm16`: STT duration
- `processUtterance`: Total turn time
- Metrics available in `logs/system.log`

## 🔒 Security

- No secrets in repository
- `.env.example` provided for configuration
- PII masked in logs (phone numbers: last 4 digits only)
- All MCP endpoints validate input schemas

## 📝 Prompts

Centralized in `src/prompts/manifest.json` with versioning.
System prompt logged per call in audit JSON.

## 📦 Deliverables

- ✅ Twilio S2S voice loop with barge-in
- ✅ LiveKit agent running in rooms
- ✅ MCP server with 4 tools + schemas
- ✅ Deterministic slot extraction
- ✅ Audit JSON per call (`logs/{call_id}.json`)
- ✅ Tests (`tests/eval.test.js`)
- ✅ Sample outputs (`sample_outputs/`)
- ✅ Documentation (this README + `DESIGN.md`)

## 🧪 Testing

```bash
# Run evaluation harness
npm test

# Check sample outputs
cat sample_outputs/success-path.json
cat sample_outputs/error-path-coverage-denied.json

# Monitor logs
tail -f logs/system.log
```

## 🐛 Known Limitations

- LiveKit connection requires LiveKit server running (use local dev server or LiveKit Cloud)
- Trial Twilio accounts require verification for outbound calls
- Barge-in detection threshold may need tuning based on background noise
- Tool calling relies on LLM extraction (not 100% deterministic in all edge cases)

## 📚 Additional Documentation

See `DESIGN.md` for architecture details, scaling strategy, and HIPAA considerations.

## 🎬 Demo

See Loom video: _(Add link after recording)_

## 📄 License

Proprietary - Neurality Health AI
