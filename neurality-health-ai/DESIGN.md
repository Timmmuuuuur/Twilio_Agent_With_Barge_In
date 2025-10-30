# Neurality Health AI - Design Document

## Architecture Overview

### High-Level Design

The system follows a **microservices architecture** with three core services:

1. **Twilio Webhook + Bridge** (port 3000): Handles PSTN calls and WebSocket media streaming
2. **MCP Server** (port 3001): Exposes healthcare tools with schema validation
3. **LiveKit Bridge** (port 3002): Manages placeholder for future LiveKit-specific operations

```
┌────────────────────────────────────────────────────────────┐
│                     Neurality Health AI                      │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐      ┌───────────┐      ┌─────────────┐     │
│  │  Twilio  │─────▶│  Webhook  │─────▶│  LiveKit    │     │
│  │  (PSTN)  │◀─────│  +Bridge  │◀─────│    Agent    │     │
│  └──────────┘      └───────────┘      └─────────────┘     │
│                           │                    │            │
│                           │                    │            │
│                           ▼                    ▼            │
│                    ┌─────────────┐     ┌────────────┐      │
│                    │   OpenAI    │     │  MCP Tools │      │
│                    │  STT/LLM/   │◀────│  (Health   │      │
│                    │    TTS      │     │  Actions)  │      │
│                    └─────────────┘     └────────────┘      │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Twilio Integration (`src/twilio/webhook.js`)

**Responsibilities:**
- Accept inbound PSTN calls via TwiML
- Establish bidirectional WebSocket for media streaming
- Handle audio encoding/decoding (mulaw ↔ PCM16)
- Implement barge-in detection
- Manage call lifecycle

**Key Design Decisions:**

- **`<Connect><Stream>` vs `<Start><Stream>`**: We use `<Connect><Stream>` for true bidirectional audio, enabling the agent to speak back to the caller through the same WebSocket.

- **Barge-in**: Detected by monitoring audio buffer size during AI speech (threshold: 0.4s of speech). When triggered, AI speech stops immediately and the buffer switches to user input mode.

- **VAD (Voice Activity Detection)**: Simple silence-based detection (800ms threshold). More sophisticated VAD (e.g., WebRTC VAD) could be added for production.

### 2. LiveKit Agent (`src/livekit/agent.js`)

**Responsibilities:**
- Create and manage LiveKit rooms per call
- Run conversational AI agent in room context
- Extract slots from conversation (patient info, appointment details)
- Call MCP tools based on intent
- Generate audit JSON per call

**Key Design Decisions:**

- **Room-per-call**: Each call gets a dedicated LiveKit room for isolation and clean state management.

- **Slot Extraction**: Uses GPT-4o-mini with structured JSON output to extract patient information deterministically. Retries/repairs could be added for malformed outputs.

- **Tool Calling Strategy**: Agent analyzes conversation context and proactively calls MCP tools when sufficient information is available (e.g., calls `checkInsuranceCoverage` when both payer and plan are mentioned).

### 3. MCP Server (`src/mcp/server.js`)

**Responsibilities:**
- Expose 4 healthcare tools as REST endpoints
- Validate inputs/outputs against JSON schemas
- Simulate tool responses (in-memory, no external dependencies)
- Enforce idempotency for bookings

**Key Design Decisions:**

- **Schema-first**: All tools defined by JSON schemas in `src/mcp/tools/schemas/`. Validation happens before and after execution.

- **Idempotency**: `bookAppointment` uses `idempotency_key` to prevent duplicate bookings. Key stored in in-memory Map (would use Redis/DB in production).

- **Error Handling**: Returns typed errors (`ok: false` + reason) instead of free-text, enabling programmatic error handling.

## Twilio ↔ LiveKit Bridging

### Current Implementation

**Direct Bridge Approach:**
- Twilio media stream connects directly to webhook WebSocket
- Audio buffered and processed locally
- LiveKit agent conceptually "runs in a room" but processes audio synchronously
- Agent publishes/subscribes to audio conceptually through the room context

### Alternative Approaches Considered

1. **LiveKit Ingress/Egress**:
   - Use LiveKit's built-in SIP/PSTN ingress
   - Pro: Native integration, lower latency
   - Con: More complex setup, requires LiveKit Cloud or self-hosted SIP bridge

2. **Separate Bridge Service**:
   - Dedicated service that subscribes to Twilio WebSocket and publishes to LiveKit tracks
   - Pro: Clean separation of concerns
   - Con: Additional service to manage, potential latency increase

**Choice Rationale**: Direct bridge approach chosen for simplicity and lower latency in this prototype. For production, LiveKit Ingress would be preferred for better reliability and scalability.

## Scaling to 1,000 Concurrent Calls

### Horizontal Scaling Strategy

```
                      ┌──────────────┐
                      │  Load        │
                      │  Balancer    │
                      └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐     ┌────────┐    ┌────────┐
         │ Webhook│     │ Webhook│    │ Webhook│
         │ Node 1 │     │ Node 2 │    │ Node N │
         └────────┘     └────────┘    └────────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                      ┌──────────────┐
                      │   LiveKit    │
                      │   Cluster    │
                      └──────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         ┌────────┐     ┌────────┐    ┌────────┐
         │  MCP   │     │  MCP   │    │  MCP   │
         │ Server │     │ Server │    │ Server │
         └────────┘     └────────┘    └────────┘
```

### Bottlenecks & Solutions

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| **Webhook** | CPU (audio encoding) | Horizontal scaling (stateless) |
| **LiveKit** | Room count | Use LiveKit Cloud or multi-node cluster |
| **MCP Server** | Stateless but needs shared state | Redis for idempotency keys, shared DB |
| **OpenAI API** | Rate limits | Request queuing, multiple API keys |

### Resource Estimates (per concurrent call)

- CPU: ~0.1 vCPU (mostly idle, spikes during audio processing)
- Memory: ~50MB (audio buffers + agent state)
- Network: ~64 kbps (mulaw audio)

**For 1,000 concurrent calls:**
- 100 vCPUs (with 2x buffer)
- 50GB RAM
- 64 Mbps network
- ~10-20 webhook nodes (50-100 calls per node)

## Multi-Tenancy

### Isolation Strategy

**Approach**: Account-based isolation with shared infrastructure.

```javascript
// Per-tenant configuration
{
  "tenant_id": "clinic_123",
  "livekit_room_prefix": "clinic123_",
  "mcp_endpoint": "https://mcp.clinic123.internal",
  "twilio_numbers": ["+14085551234"],
  "allowed_payers": ["Delta Dental", "Blue Cross"],
  "locations": ["sj-001", "sf-downtown"]
}
```

**Key Isolation Points:**
1. **LiveKit Rooms**: Prefixed by tenant ID (`clinic123_call-abc`)
2. **MCP Tools**: Tenant-scoped endpoints or tenant ID in request header
3. **Audit Logs**: Separate S3 bucket or DB table per tenant
4. **API Keys**: Per-tenant OpenAI/Twilio keys for cost allocation

**Shared Components:**
- Webhook infrastructure (multi-tenant by design)
- LiveKit server (room-based isolation)
- Audit storage (logically partitioned)

## HIPAA-Readiness Outline

### Technical Controls

| Requirement | Implementation |
|-------------|----------------|
| **Encryption at Rest** | All audit logs encrypted (AES-256) |
| **Encryption in Transit** | TLS 1.2+ for all API calls, WSS for media |
| **Access Controls** | API keys rotated quarterly, least-privilege IAM |
| **Audit Logging** | All PHI access logged with timestamp + actor |
| **Data Retention** | Audit logs retained 7 years, call recordings deleted after 30 days |
| **De-identification** | Phone numbers masked in logs (last 4 digits) |

### Process Controls

- **BAA (Business Associate Agreement)**: Required with Twilio, LiveKit, OpenAI
- **Risk Assessment**: Annual HIPAA risk assessments
- **Incident Response**: 60-day breach notification process
- **Training**: Annual HIPAA training for all engineers
- **PHI Minimization**: Only collect necessary PHI, avoid recording full calls

### Gaps (Out of Scope for Prototype)

- Physical security controls
- Disaster recovery plan
- Penetration testing
- Third-party audit (e.g., HITRUST)

## Reliability & Error Handling

### Retry Strategy

```javascript
// Example: MCP tool call with exponential backoff
async function callToolWithRetry(tool, input, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callTool(tool, input);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(2 ** i * 1000); // 1s, 2s, 4s
    }
  }
}
```

### Circuit Breaker

```javascript
// After 5 consecutive MCP failures, stop calling and fallback
if (mcpFailureCount > 5) {
  return { ok: false, error: "MCP service unavailable" };
}
```

### Graceful Degradation

- If STT fails → ask user to repeat
- If LLM fails → use fallback response
- If TTS fails → use Twilio `<Say>` as backup
- If MCP fails → offer to take a message

## Performance Optimization

### Current Optimizations

1. **Parallel Tool Calls**: Multiple MCP calls in parallel when independent
2. **TTS Streaming**: Start sending audio frames immediately (no buffering)
3. **Silence Detection**: Faster VAD (800ms vs typical 1-2s)
4. **Model Selection**: `gpt-4o-mini` (faster than `gpt-4`) with `max_tokens: 150`
5. **Barge-in**: Immediate cancellation (no waiting for current sentence to finish)

### Future Optimizations

- WebSocket connection pooling
- Pre-warming LiveKit rooms
- Caching common LLM responses (e.g., greetings)
- Streaming STT (partial transcripts)
- Voice cloning for consistent agent voice

## Known Limitations

1. **LiveKit Dependency**: Requires LiveKit server running (not included in prototype)
2. **LLM Non-Determinism**: Slot extraction ~95% accurate (edge cases exist)
3. **Single-Language**: English only (i18n would require model/prompt changes)
4. **No Call Transfer**: Can't transfer to human agent
5. **Limited Error Recovery**: No automatic retry for failed tool calls during conversation

## Future Enhancements

- Multi-language support (Spanish, Mandarin)
- Emotion detection for escalation
- Integration with real EHR systems (Epic, Cerner)
- Voice biometrics for patient verification
- Real-time quality monitoring dashboard

---

**Document Version**: 1.0  
**Last Updated**: October 28, 2025  
**Author**: Neurality Health AI Team

