# AutoFlow — AI Data Bridge
## Runtime Design, Prompt Format, Caching & Fallback

---

## What It Does

The AI Data Bridge sits between EVERY pair of connected nodes in a workflow. At runtime, when Step N produces output, the bridge:

1. Queries MongoDB for the semantic role of each source field
2. Queries MongoDB for the semantic role of each target field
3. Builds a compact AI prompt (< 800 tokens)
4. Calls Groq Llama 3.3-70b (or Gemini Flash fallback)
5. Returns perfectly transformed data for the next connector

**Zero manual `{{template}}` strings needed by the user.**

---

## Package Structure

```
packages/ai-data-bridge/
├── src/
│   ├── index.ts                    ← public exports
│   ├── ai-data-bridge.ts           ← main orchestrator (AIDataBridge class)
│   ├── bridge-prompt-builder.ts    ← builds compact AI prompt from DB context
│   ├── bridge-response-parser.ts   ← parses AI JSON response with error recovery
│   ├── bridge-cache.ts             ← two-level cache (Redis)
│   ├── post-bridge-validator.ts    ← post-AI type enforcement + enum fuzzy match
│   └── sanitizer.ts               ← XSS, SQL injection, length guard
├── package.json
└── tsconfig.json
```

---

## Runtime Flow

```
StepExecutor.executeStep(nodeB, previousResults)
       │
       ├── Gets nodeA output from previousResults
       ├── Gets nodeB input schema from manifestRegistry
       │
       ▼
AIDataBridge.transform({
  sourceConnectorId: nodeA.connectorId,
  sourceOperationId: nodeA.operationId,
  sourceOutput:      nodeA_runtime_output,     ← actual data
  targetConnectorId: nodeB.connectorId,
  targetOperationId: nodeB.operationId,
  targetSchema:      nodeB_input_fields,        ← from manifest
  userOverrides:     nodeB.fieldMapping || {},  ← user always wins
})
       │
       ├── [1] Apply user overrides (these keys are pre-filled, skip AI for them)
       ├── [2] Check Redis cache → HIT? return instantly
       ├── [3] Query connector_field_catalog for source + target field roles
       ├── [4] Query connector_coercion_rules for applicable conversions
       ├── [5] Query connector_synonym_groups for field name synonyms
       ├── [6] Build AI prompt with all context
       ├── [7] Call Groq → parse response
       ├── [8] Post-AI: TypeCoercer → Sanitizer → Validator
       ├── [9] Merge: user overrides > AI result > defaults
       └── [10] Cache result + emit logs
       │
       ▼
{ transformedInputs, mappingLog, confidence, warnings }
       │
       ▼
connector.executeAction(actionId, { stepInput: transformedInputs })
```

---

## AI Prompt Format

**Design principles:**
- Under 800 tokens (fast, cheap)
- Constrained: "Only use source data, never invent"
- Context-aware: includes semantic roles from MongoDB
- Structured output: JSON mode enforced

```
You are a data transformation engine for an automation platform.

SOURCE APP: {sourceConnectorId} ({sourceOperationId})
SOURCE FIELDS WITH ROLES:
{
  "from":    { "value": "john@example.com", "role": "email_address", "format": "email" },
  "subject": { "value": "Order #1234",      "role": "title_subject"                    },
  "amount":  { "value": 4999,               "role": "amount_money",  "format": "currency_cents" },
  "created": { "value": 1699900000,          "role": "timestamp",     "format": "unix_timestamp" }
}

TARGET APP: {targetConnectorId} ({targetOperationId})
TARGET INPUT FIELDS (to fill):
- email    (string, REQUIRED) → role: email_address
- dealname (string, REQUIRED) → role: title_subject
- amount   (string, optional) → role: amount_money, format: currency_dollars
- closedate(string, optional) → role: timestamp, format: iso_date

ALREADY MAPPED (skip these — user defined):
- pipeline = "default"

TRANSFORMATION RULES:
1. Use ONLY values from SOURCE FIELDS — never invent or hallucinate
2. currency_cents → currency_dollars: divide by 100  (4999 → "49.99")
3. unix_timestamp → iso_date: new Date(val * 1000).toISOString()
4. email: extract plain email from "Name <email>" if present
5. phone: normalize to E.164 format (+country_code_number)
6. For REQUIRED fields with no match: use most reasonable default
7. Strip HTML tags from any plain text target field

SYNONYMS REFERENCE:
- email_address: [email, from, to, customerEmail, sender]
- title_subject: [subject, title, name, summary, dealname]
- message_content: [text, body, content, message, bodyPlain]

Respond ONLY with this JSON:
{
  "inputs": { ...all unmapped target field keys with values... },
  "mappingLog": { "fieldKey": "explanation of source + any transformation" },
  "confidence": 0.0-1.0,
  "warnings": ["any issues or assumptions"]
}
```

---

## Caching Strategy

Two-level Redis cache to minimize AI API calls:

### Level 1: Schema-Pair Cache (24 hours)
- **Key:** `bridge:schema:{hash(sourceConnectorId + sourceOpId + targetConnectorId + targetOpId + targetSchema)}`
- **Value:** The AI-generated **mapping logic** (field paths, not values)
- **When hit:** Apply cached logic to new source data — no AI call
- **Example:** `gmail/new_email → slack/send_message` — always maps `from→text`, `subject→text`
  → First call: AI decides this mapping → cached
  → All subsequent calls with different emails: apply same mapping logic

### Level 2: Data Fingerprint Cache (5 minutes)
- **Key:** `bridge:data:{schemaKey}:{hash(sourceOutput)}`
- **Value:** The fully transformed result
- **When hit:** Return instantly — same input data, same result
- **Example:** Same webhook fires twice with identical payload → instant

### Expected Cache Hit Rates
| Scenario | Cache Level | Hit Rate |
|---|---|---|
| Same workflow fires repeatedly (cron) | Level 2 | ~80% |
| Same connector pair, different data | Level 1 | ~95% after first run |
| New connector pair | None | 0% (AI called once, then cached) |
| New workflow (never run before) | None | 0% for first run of each step pair |

---

## AI Provider Priority

```
Primary:  Groq (llama-3.3-70b-versatile)
          → Free tier, ~250-400ms, JSON mode supported
          → Used for 95% of calls

Fallback: Google Gemini Flash (gemini-1.5-flash)
          → Used if Groq API is down or rate-limited
          → ~200-350ms, cheap ($0.000075/call)

Emergency Fallback: Legacy interpolation
          → If both AI providers fail, fall back to existing
            {{template}} interpolation — NEVER break production
```

---

## AI Provider Configuration

AI provider is configured via environment variables — no code changes:

```bash
# .env
AI_BRIDGE_PRIMARY_PROVIDER=groq              # "groq" | "gemini" | "openai"
AI_BRIDGE_FALLBACK_PROVIDER=gemini
AI_BRIDGE_ENABLED=true                       # false = disable bridge, use legacy
AI_BRIDGE_CONFIDENCE_THRESHOLD=0.60          # log warning if confidence < this
AI_BRIDGE_MAX_TOKENS=800                     # max prompt size
AI_BRIDGE_CACHE_SCHEMA_TTL=86400             # 24h schema cache TTL (seconds)
AI_BRIDGE_CACHE_DATA_TTL=300                 # 5min data cache TTL (seconds)
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
```

---

## Backward Compatibility

| Scenario | Behavior |
|---|---|
| Node has `fieldMapping` set | User mappings applied FIRST — AI only fills unmapped fields |
| `node.config.disableAIBridge: true` | Bridge skipped, legacy interpolation only |
| AI call throws an error | Silent fallback to legacy `{{template}}` interpolation |
| `connector_field_catalog` has no entry for a field | AI uses field label as hint instead of semantic role |
| Target has no required fields | Bridge runs but is low priority |
| Trigger node (first step) | Bridge skipped — nothing to transform from |
| Condition/router nodes | Bridge skipped — these evaluate, not transform |

---

## Cost Estimate

| Workflow | Steps | AI Calls (first run) | AI Calls (cached) | Estimated Cost |
|---|---|---|---|---|
| 2-step workflow | 1 bridge | 1 | 0 | ~$0.000075 |
| 5-step workflow | 4 bridges | 4 | 0 | ~$0.0003 |
| 100 workflow runs/day | 4 bridges | 4 (first) + 0 (cached) | 396 | ~$0.0003/day |
| 1000 connectors, 10-step workflow | 9 bridges | 9 | 0 | ~$0.000675 first run |
