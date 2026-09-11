# AutoFlow — Execution Logging System
## What Gets Logged, API Reference & Frontend UI

---

## Overview

Every workflow execution is logged with full detail — 11 phases per step. Logs are stored in the `execution_logs` MongoDB collection and accessible via REST API.

Full schema → see [`11_database_collections.md`](./11_database_collections.md)

---

## What Gets Logged (Per Step)

| Phase | What | Why |
|---|---|---|
| **1. Raw Input** | Output from previous step (unmodified) | See exactly what came in before any transformation |
| **2. User Overrides** | `node.fieldMapping` values user set in canvas | See what was manually mapped vs AI-mapped |
| **3. Credential Resolution** | Which connection was used (ID only, not secrets) | Debug auth issues |
| **4. AI Data Bridge** | Prompt sent, AI response, mapping decisions, confidence, cost, latency | Full AI decision audit trail |
| **5. Type Coercions** | Before/after for every type conversion | Debug "why did my amount change?" |
| **6. Sanitization** | What was stripped (XSS, SQL), before/after | Security audit trail |
| **7. Validation** | Which fields passed/failed, why | Debug required field issues |
| **8. Final Inputs** | Exact JSON sent to connector (secrets masked) | "What did the connector actually receive?" |
| **9. HTTP** | Raw request (URL, headers, body) + raw response (status, body, latency) | Full API call debug |
| **10. Output** | Raw connector output | See exactly what came out |
| **11. Error** | Error code, message, stack trace, source, recovery | Debug failures |
| **12. Timing** | Duration of every phase | Performance profiling |

---

## API Endpoints

### List Executions
```http
GET /api/v1/executions
?workflowId=<id>
&status=completed|failed|running|partial
&startDate=2024-01-01
&endDate=2024-01-31
&page=1
&limit=20

Response:
{
  "data": [
    {
      "executionId": "exec_abc123",
      "workflowId": "wf_xyz789",
      "workflowName": "Stripe → HubSpot → Slack",
      "status": "completed",
      "triggeredBy": "manual",
      "summary": {
        "totalSteps": 4,
        "completedSteps": 4,
        "failedSteps": 0,
        "totalDurationMs": 2340,
        "aiCallsCount": 3,
        "aiCacheHitsCount": 0,
        "estimatedAiCostUsd": 0.000225,
        "sanitizationEvents": 1
      },
      "startedAt": "2024-01-15T10:30:00Z",
      "completedAt": "2024-01-15T10:30:02.340Z"
    }
  ],
  "pagination": { "total": 150, "page": 1, "limit": 20 }
}
```

### Get Full Execution Detail
```http
GET /api/v1/executions/:id

Response: Full execution with all steps and all 11 phases per step
```

### Get Step Detail
```http
GET /api/v1/executions/:id/steps/:nodeId

Response: Single step with all 11 phases (most detailed view)
```

### Get Only AI Bridge Logs
```http
GET /api/v1/executions/:id/steps/:nodeId/ai-bridge

Response: { aiBridge: { ... } }
```

### Get Only HTTP Logs
```http
GET /api/v1/executions/:id/steps/:nodeId/http

Response: { httpRequest: { ... }, httpResponse: { ... } }
```

### Get All Errors in an Execution
```http
GET /api/v1/executions/:id/errors

Response: List of all step errors with their source and recovery action
```

### Execution Analytics
```http
GET /api/v1/executions/analytics
?workflowId=<id>
&period=7d|30d|90d

Response:
{
  "successRate": 0.97,
  "avgDurationMs": 2340,
  "totalAiCostUsd": 0.045,
  "errorFrequency": { "HTTP_ERROR": 3, "VALIDATION_ERROR": 1 },
  "lowConfidenceSteps": [
    { "connectorPair": "telegram→notion", "avgConfidence": 0.68, "count": 12 }
  ],
  "mostExpensiveWorkflows": [ ... ]
}
```

### Real-Time Streaming (Server-Sent Events)
```http
GET /api/v1/executions/stream/:executionId
Accept: text/event-stream

Events emitted:
event: step_started
data: { "nodeId": "node_2", "nodeName": "HubSpot create_deal", "startedAt": "..." }

event: ai_bridge_complete
data: { "nodeId": "node_2", "confidence": 0.91, "latencyMs": 284, "fromCache": false }

event: step_completed
data: { "nodeId": "node_2", "status": "completed", "totalMs": 1340 }

event: step_failed
data: { "nodeId": "node_2", "error": { "code": "HTTP_ERROR", "statusCode": 429 } }

event: execution_complete
data: { "status": "completed", "totalMs": 2340, "estimatedAiCostUsd": 0.000225 }
```

---

## Example Log — Single Step (Full Detail)

```json
{
  "nodeId": "node_3",
  "nodeName": "Send Slack Message",
  "connectorId": "slack",
  "operationId": "send_message",
  "stepIndex": 2,
  "status": "completed",

  "rawInputFromPreviousStep": {
    "dealId": "hs_deal_123",
    "dealname": "John Doe — $49.99",
    "amount": "49.99",
    "customerEmail": "john@example.com"
  },

  "userFieldMappingOverrides": {
    "channel": "#sales"
  },

  "credentialResolution": {
    "connectorId": "slack",
    "connectionId": "conn_abc123",
    "connectionName": "Acme Corp Slack",
    "authType": "oauth2",
    "source": "database"
  },

  "aiBridge": {
    "enabled": true,
    "fromCache": false,
    "aiModel": "groq/llama-3.3-70b-versatile",
    "latencyMs": 284,
    "promptTokens": 312,
    "completionTokens": 98,
    "estimatedCostUsd": 0.000045,
    "confidence": 0.91,
    "mappingDecisions": {
      "channel": "User override: #sales (skipped AI for this field)",
      "text": "Built from HubSpot dealname + amount: 'New deal: John Doe — $49.99'"
    },
    "warnings": [],
    "unmappedRequired": [],
    "promptSnapshot": "You are a data transformation engine...(first 2000 chars)"
  },

  "coercions": [],

  "sanitization": [
    {
      "field": "text",
      "action": "trimmed",
      "before": "  New deal: John Doe — $49.99  ",
      "after": "New deal: John Doe — $49.99"
    }
  ],

  "validationErrors": [],
  "validationPassed": true,

  "resolvedInputs": {
    "channel": "#sales",
    "text": "New deal: John Doe — $49.99"
  },

  "httpRequest": {
    "method": "POST",
    "url": "https://slack.com/api/chat.postMessage",
    "headers": { "Authorization": "Bearer ***", "Content-Type": "application/json" },
    "body": { "channel": "#sales", "text": "New deal: John Doe — $49.99" },
    "sentAt": "2024-01-15T10:30:01.450Z"
  },

  "httpResponse": {
    "statusCode": 200,
    "statusText": "OK",
    "body": { "ok": true, "ts": "1705312201.123456", "channel": "C08XYZABC" },
    "latencyMs": 342,
    "receivedAt": "2024-01-15T10:30:01.792Z"
  },

  "retryAttempts": [],

  "rawOutput": { "ok": true, "ts": "1705312201.123456" },

  "error": null,

  "timing": {
    "credentialResolutionMs": 45,
    "aiBridgeMs": 284,
    "sanitizationMs": 2,
    "connectorExecutionMs": 342,
    "totalStepMs": 673,
    "timeline": [
      { "phase": "credential_resolve", "startMs": 0, "endMs": 45 },
      { "phase": "ai_bridge", "startMs": 45, "endMs": 329 },
      { "phase": "sanitize", "startMs": 329, "endMs": 331 },
      { "phase": "execute", "startMs": 331, "endMs": 673 }
    ]
  },

  "startedAt": "2024-01-15T10:30:01.100Z",
  "completedAt": "2024-01-15T10:30:01.773Z"
}
```

---

## Log Retention Policy

| Plan | Retention |
|---|---|
| Free | 7 days |
| Pro | 30 days |
| Enterprise | 90 days (configurable) |

Implemented via MongoDB TTL index on `startedAt` field.  
Per-org override via `organizationSettings.logRetentionDays`.

---

## Sensitive Data Masking

The following are automatically masked before writing to logs:
- **Authorization headers:** `Bearer ***` (token hidden)
- **API keys in URLs:** `?api_key=***`
- **Passwords in any field:** `***`
- **Full credit card numbers:** `4*** **** **** 1234`
- **Partial email masking** (optional, configurable): `j***@example.com`

The masking runs in `ExecutionLoggerService.maskSensitiveValues()` before any log is written to MongoDB.
