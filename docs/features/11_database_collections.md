# AutoFlow — MongoDB Collections
## Database Schema Reference for Smart Mapping System

> All field roles, coercion rules, and synonym groups live here — never in code.

---

## Collection 1: `connector_field_catalog`

**Purpose:** Stores the semantic meaning of every field across every connector's every operation. The AI Bridge and TypeCoercer query this at runtime.

### Schema

```javascript
{
  // ── Identity ──────────────────────────────────────
  _id: ObjectId,
  connectorId:   String,   // "gmail", "stripe", "hubspot"
  operationId:   String,   // "new_email", "new_charge", "create_deal"
  operationType: String,   // "trigger" | "action"
  direction:     String,   // "input" | "output"
  fieldKey:      String,   // "from", "amount", "customerEmail"

  // ── Schema Info (mirrored from manifest) ─────────
  fieldLabel:    String,   // "Sender Email (From)"
  fieldType:     String,   // "string" | "number" | "boolean" | "json" | "array" | "object"
  required:      Boolean,

  // ── AI Bridge Intelligence (the important part) ──
  semanticRole:  String,   // "email_address" | "amount_money" | "timestamp" | ...
  format:        String,   // "email" | "currency_cents" | "unix_timestamp" | "iso_date" | ...

  // ── Transform Hints ──────────────────────────────
  synonyms:      [String], // ["email", "sender", "from_email"] — other names for this field
  transformHints:[String], // ["extract_email_from_name_format", "e164_required"]
  notes:         String,   // human notes: "Stripe outputs in cents (integer)"

  // ── Metadata ─────────────────────────────────────
  autoDetected:  Boolean,  // true = seeded by script, false = manually reviewed
  confidence:    Number,   // 0–1 — how confident the auto-detection was
  version:       String,   // connector version this applies to, e.g. "2.0.0"
  enabled:       Boolean,  // false = disable this entry (soft delete)
  createdAt:     Date,
  updatedAt:     Date,
}
```

### Indexes
```javascript
{ connectorId: 1, operationId: 1, direction: 1, fieldKey: 1 }  // unique compound
{ semanticRole: 1 }                                              // lookup by role
{ connectorId: 1, direction: 1 }                                 // list all outputs of a connector
```

### Example Documents

```json
[
  {
    "connectorId": "gmail",
    "operationId": "new_email",
    "operationType": "trigger",
    "direction": "output",
    "fieldKey": "from",
    "fieldLabel": "Sender Email Address",
    "fieldType": "string",
    "required": true,
    "semanticRole": "email_address",
    "format": "email",
    "synonyms": ["email", "sender", "from_email"],
    "transformHints": ["extract_email_from_name_format"],
    "notes": "May contain 'John Doe <john@example.com>' — extract email address only when target needs plain email",
    "autoDetected": true,
    "confidence": 0.95
  },
  {
    "connectorId": "stripe",
    "operationId": "new_charge",
    "operationType": "trigger",
    "direction": "output",
    "fieldKey": "amount",
    "fieldLabel": "Charge Amount",
    "fieldType": "number",
    "required": true,
    "semanticRole": "amount_money",
    "format": "currency_cents",
    "synonyms": ["price", "cost", "chargeAmount", "total"],
    "transformHints": ["cents_to_dollars_required"],
    "notes": "Stripe ALWAYS outputs amounts in cents as integers. 4999 = $49.99. MUST divide by 100 when target expects dollars.",
    "autoDetected": false,
    "confidence": 1.0
  },
  {
    "connectorId": "stripe",
    "operationId": "new_charge",
    "operationType": "trigger",
    "direction": "output",
    "fieldKey": "created",
    "fieldLabel": "Charge Created At",
    "fieldType": "number",
    "required": true,
    "semanticRole": "timestamp",
    "format": "unix_timestamp",
    "synonyms": ["createdAt", "timestamp", "date", "time"],
    "transformHints": ["unix_to_iso_date"],
    "notes": "Unix timestamp in SECONDS (not milliseconds). Multiply by 1000 for JS Date.",
    "autoDetected": true,
    "confidence": 0.92
  },
  {
    "connectorId": "whatsapp",
    "operationId": "send_message",
    "operationType": "action",
    "direction": "input",
    "fieldKey": "phone",
    "fieldLabel": "Recipient Phone Number",
    "fieldType": "string",
    "required": true,
    "semanticRole": "phone_number",
    "format": "phone_e164",
    "synonyms": ["to", "recipient", "mobile"],
    "transformHints": ["normalize_to_e164", "add_plus_prefix"],
    "notes": "WhatsApp REQUIRES E.164 format: +14155552671. Any other format will fail the API call.",
    "autoDetected": false,
    "confidence": 1.0
  },
  {
    "connectorId": "hubspot",
    "operationId": "create_deal",
    "operationType": "action",
    "direction": "input",
    "fieldKey": "amount",
    "fieldLabel": "Deal Amount (USD)",
    "fieldType": "string",
    "required": false,
    "semanticRole": "amount_money",
    "format": "currency_dollars",
    "synonyms": ["price", "value", "dealAmount"],
    "transformHints": [],
    "notes": "HubSpot expects dollar amount as string, e.g. '49.99'. NOT cents.",
    "autoDetected": true,
    "confidence": 0.88
  },
  {
    "connectorId": "slack",
    "operationId": "send_message",
    "operationType": "action",
    "direction": "input",
    "fieldKey": "text",
    "fieldLabel": "Message Text",
    "fieldType": "string",
    "required": true,
    "semanticRole": "message_content",
    "format": null,
    "synonyms": ["message", "body", "content", "message_text", "bodyPlain"],
    "transformHints": ["strip_html_tags"],
    "notes": "Slack text field supports mrkdwn format. Strip HTML from email bodies before passing.",
    "autoDetected": true,
    "confidence": 0.97
  }
]
```

---

## Collection 2: `connector_coercion_rules`

**Purpose:** Defines all type conversion rules as data. TypeCoercer queries this at runtime. Adding a new coercion = insert a document, no code change.

### Schema

```javascript
{
  _id: ObjectId,

  // ── Matching Criteria ─────────────────────────────
  // A rule fires when: source field has sourceRole+sourceFormat
  // AND target field has targetRole+targetFormat
  sourceRole:   String,   // "amount_money" — or "*" for wildcard
  sourceFormat: String,   // "currency_cents" — or "*" for any format
  targetRole:   String,   // "amount_money"
  targetFormat: String,   // "currency_dollars"

  // ── The Conversion ────────────────────────────────
  coercionMethod: String, // Named method — see TypeCoercer class
  // Supported methods:
  // "divide_by_100"        — cents → dollars
  // "multiply_by_100"      — dollars → cents
  // "unix_seconds_to_iso"  — 1699900000 → "2023-11-13T12:26:40Z"
  // "iso_to_unix_seconds"  — inverse
  // "unix_ms_to_iso"       — 1699900000000 → ISO
  // "extract_email"        — "John <j@ex.com>" → "j@ex.com"
  // "normalize_e164"       — "(555) 123" → "+15551234567"
  // "join_array_csv"       — ["a","b"] → "a,b"
  // "split_csv_array"      — "a,b" → ["a","b"]
  // "json_stringify"       — {a:1} → '{"a":1}'
  // "json_parse"           — '{"a":1}' → {a:1}
  // "to_string"            — any → String(value)
  // "to_number"            — any → parseFloat(value)
  // "to_boolean"           — "true"/"false" → boolean
  // "split_fullname"       — "John Doe" → {firstName:"John",lastName:"Doe"}
  // "join_fullname"        — {firstName,lastName} → "John Doe"
  // "strip_html"           — "<p>Hello</p>" → "Hello"
  // "format_currency"      — 49.99 → "$49.99" (display)

  // ── Metadata ─────────────────────────────────────
  name:          String,  // "Stripe Cents to HubSpot Dollars"
  description:   String,  // Human-readable explanation
  example: {
    input:  Mixed,        // 4999
    output: Mixed,        // "49.99"
  },
  priority:      Number,  // higher = checked first (default 0)
  enabled:       Boolean,
  createdAt:     Date,
  updatedAt:     Date,
}
```

### Example Documents

```json
[
  {
    "sourceRole": "amount_money",
    "sourceFormat": "currency_cents",
    "targetRole": "amount_money",
    "targetFormat": "currency_dollars",
    "coercionMethod": "divide_by_100",
    "name": "Cents to Dollars",
    "description": "Stripe, Braintree output amounts as integer cents. Most CRMs (HubSpot, Pipedrive) expect dollars as string.",
    "example": { "input": 4999, "output": "49.99" },
    "priority": 10,
    "enabled": true
  },
  {
    "sourceRole": "timestamp",
    "sourceFormat": "unix_timestamp",
    "targetRole": "timestamp",
    "targetFormat": "iso_date",
    "coercionMethod": "unix_seconds_to_iso",
    "name": "Unix Seconds to ISO Date",
    "description": "Stripe, PayPal output unix timestamps. Most apps (Google Calendar, HubSpot) expect ISO 8601.",
    "example": { "input": 1699900000, "output": "2023-11-13T12:26:40.000Z" },
    "priority": 10,
    "enabled": true
  },
  {
    "sourceRole": "email_address",
    "sourceFormat": "email",
    "targetRole": "email_address",
    "targetFormat": "email",
    "coercionMethod": "extract_email",
    "name": "Extract Email from Name+Email String",
    "description": "Gmail outputs 'John Doe <john@example.com>'. WhatsApp, Mailchimp need plain email.",
    "example": { "input": "John Doe <john@example.com>", "output": "john@example.com" },
    "priority": 5,
    "enabled": true
  },
  {
    "sourceRole": "phone_number",
    "sourceFormat": null,
    "targetRole": "phone_number",
    "targetFormat": "phone_e164",
    "coercionMethod": "normalize_e164",
    "name": "Normalize Phone to E.164",
    "description": "WhatsApp, Twilio, Vonage require E.164 format. Any phone string → +country_code_number.",
    "example": { "input": "(555) 123-4567", "output": "+15551234567" },
    "priority": 10,
    "enabled": true
  },
  {
    "sourceRole": "full_name",
    "sourceFormat": null,
    "targetRole": "first_name",
    "targetFormat": null,
    "coercionMethod": "split_fullname",
    "name": "Full Name to First + Last Name",
    "description": "Shopify/Stripe output customerName as full name. HubSpot/Salesforce need firstName and lastName separately.",
    "example": { "input": "John Doe", "output": { "firstName": "John", "lastName": "Doe" } },
    "priority": 8,
    "enabled": true
  },
  {
    "sourceRole": "message_content",
    "sourceFormat": "html",
    "targetRole": "message_content",
    "targetFormat": null,
    "coercionMethod": "strip_html",
    "name": "Strip HTML from Plain Text Fields",
    "description": "Gmail bodyHtml → Slack text. Slack does not render HTML — strip tags first.",
    "example": { "input": "<p>Hello <b>World</b></p>", "output": "Hello World" },
    "priority": 7,
    "enabled": true
  }
]
```

---

## Collection 3: `connector_synonym_groups`

**Purpose:** Groups of field names that mean the same thing. Used by SemanticFieldMatcher to match fields across connectors when exact key names differ.

### Schema

```javascript
{
  _id: ObjectId,
  groupName:    String,   // "message_content" — matches FieldSemanticRole
  semanticRole: String,   // the role this group belongs to
  synonyms:     [String], // all field key names that mean this concept
  description:  String,
  enabled:      Boolean,
  createdAt:    Date,
  updatedAt:    Date,
}
```

### Example Documents

```json
[
  {
    "groupName": "message_content",
    "semanticRole": "message_content",
    "synonyms": [
      "text", "body", "content", "message", "message_text",
      "bodyPlain", "bodyHtml", "description", "msg", "payload",
      "prompt", "result", "summary", "note", "comment"
    ],
    "description": "Main text content field across messaging and AI connectors"
  },
  {
    "groupName": "email_address",
    "semanticRole": "email_address",
    "synonyms": [
      "email", "from", "to", "customerEmail", "email_address",
      "sender", "recipient", "emailAddress", "replyTo", "cc", "bcc",
      "subscriberEmail", "userEmail", "contactEmail", "ownerEmail"
    ],
    "description": "Email address fields across all connectors"
  },
  {
    "groupName": "title_subject",
    "semanticRole": "title_subject",
    "synonyms": [
      "subject", "title", "name", "summary", "headline",
      "dealname", "issueTitle", "taskName", "pageTitle",
      "projectName", "cardName", "boardName", "topic"
    ],
    "description": "Title or subject of an item — email subject, issue title, deal name, etc."
  },
  {
    "groupName": "timestamp",
    "semanticRole": "timestamp",
    "synonyms": [
      "date", "created", "createdAt", "updatedAt", "timestamp",
      "createdate", "appendedAt", "receivedAt", "sentAt",
      "startTime", "endTime", "dueDate", "closedAt", "resolvedAt"
    ],
    "description": "Any date/time field — may be unix seconds, unix ms, or ISO string"
  },
  {
    "groupName": "amount_money",
    "semanticRole": "amount_money",
    "synonyms": [
      "amount", "price", "total", "totalPrice", "cost",
      "chargeAmount", "value", "dealAmount", "revenue", "fee",
      "subtotal", "grandTotal", "unitPrice", "salePrice"
    ],
    "description": "Monetary amount — may be cents (Stripe) or dollars (HubSpot/Shopify)"
  },
  {
    "groupName": "phone_number",
    "semanticRole": "phone_number",
    "synonyms": [
      "phone", "mobile", "telephone", "tel", "phoneNumber",
      "mobileNumber", "contactPhone", "whatsapp", "from", "to"
    ],
    "description": "Phone number fields — target WhatsApp/Twilio/SMS require E.164 format"
  },
  {
    "groupName": "unique_id",
    "semanticRole": "unique_id",
    "synonyms": [
      "id", "orderId", "messageId", "chargeId", "vid",
      "leadId", "issueKey", "taskId", "dealId", "contactId",
      "recordId", "itemId", "referenceId", "externalId"
    ],
    "description": "System identifier fields — usually should NOT be mapped between different connectors"
  }
]
```

---

## Collection 4: `execution_logs` (Enhanced)

**Purpose:** Full execution audit trail — every input, AI decision, HTTP call, coercion, sanitization, error, and timing for every step.

### Schema

```javascript
{
  _id: ObjectId,

  // ── Execution Context ─────────────────────────────
  workflowId:          ObjectId,
  organizationId:      ObjectId,
  triggeredBy:         String,   // "schedule" | "webhook" | "manual" | "api"
  triggeredByUserId:   String,
  status:              String,   // "pending" | "running" | "completed" | "failed" | "partial"
  triggerPayload:      Mixed,    // the original trigger data

  // ── Summary (computed after execution) ─────────────
  summary: {
    totalSteps:          Number,
    completedSteps:      Number,
    failedSteps:         Number,
    skippedSteps:        Number,
    totalDurationMs:     Number,
    aiCallsCount:        Number,  // how many AI bridge calls were made
    aiCacheHitsCount:    Number,  // how many were served from cache
    estimatedAiCostUsd:  Number,  // total estimated AI API cost
    dataTransformed:     Boolean, // was any data transformed by AI bridge?
    sanitizationEvents:  Number,  // how many sanitization actions were taken
    retryCount:          Number,
  },

  // ── Per-Step Logs (array — one entry per DAG node) ─
  steps: [
    {
      nodeId:       String,
      nodeName:     String,
      connectorId:  String,
      operationId:  String,
      stepIndex:    Number,   // 0-based execution order
      status:       String,   // "completed" | "failed" | "skipped" | "retried"

      // Phase 1: What came in
      rawInputFromPreviousStep:  Mixed,   // previous step's output
      userFieldMappingOverrides: Mixed,   // node.fieldMapping (user-set templates)
      nodeConfig:                Mixed,   // node.config (static values)

      // Phase 2: Credential resolution
      credentialResolution: {
        connectorId:    String,
        connectionId:   String,   // DB ObjectId of the connection used
        connectionName: String,   // "My Gmail Account"
        authType:       String,   // "oauth2" | "api_key"
        source:         String,   // "database" | "env" | "system"
      },

      // Phase 3: AI Data Bridge
      aiBridge: {
        enabled:          Boolean,
        fromCache:        Boolean,
        cacheKey:         String,
        aiModel:          String,   // "groq/llama-3.3-70b"
        promptTokens:     Number,
        completionTokens: Number,
        estimatedCostUsd: Number,
        latencyMs:        Number,
        confidence:       Number,   // 0–1
        mappingDecisions: Mixed,    // { fieldKey: "why mapped this way" }
        warnings:         [String],
        unmappedRequired: [String], // required target fields AI could not fill
        promptSnapshot:   String,   // first 2000 chars of prompt sent
        rawAiResponse:    String,   // first 2000 chars of AI JSON response
      },

      // Phase 4: Type coercions applied
      coercions: [
        {
          field:      String,
          fromType:   String,
          toType:     String,
          fromFormat: String,
          toFormat:   String,
          before:     Mixed,    // value before coercion
          after:      Mixed,    // value after coercion
          rule:       String,   // "unix_seconds_to_iso"
        }
      ],

      // Phase 5: Sanitization
      sanitization: [
        {
          field:     String,
          action:    String,    // "xss_stripped" | "sql_stripped" | "trimmed" | "truncated"
          before:    String,    // (truncated to 500 chars)
          after:     String,
          flaggedAs: String,    // "xss" | "sql_injection" | "length_exceeded"
        }
      ],

      // Phase 6: Validation result
      validationErrors: [
        {
          field:    String,
          rule:     String,     // "required" | "type" | "format" | "enum" | "length"
          expected: String,
          got:      String,
          severity: String,     // "error" | "warning"
        }
      ],
      validationPassed: Boolean,

      // Phase 7: Final inputs (what was actually sent to connector)
      resolvedInputs: Mixed,    // secrets masked (token → "***")

      // Phase 8: HTTP execution (for HTTP-based connectors)
      httpRequest: {
        method:  String,       // "POST"
        url:     String,       // full URL (credentials masked)
        headers: Mixed,        // Authorization: "Bearer ***"
        body:    Mixed,        // request body
        sentAt:  Date,
      },
      httpResponse: {
        statusCode: Number,
        statusText: String,
        headers:    Mixed,
        body:       Mixed,     // raw API response
        latencyMs:  Number,
        receivedAt: Date,
      },
      retryAttempts: [
        {
          attempt:   Number,
          error:     String,
          delayMs:   Number,
          timestamp: Date,
        }
      ],

      // Phase 9: Output
      rawOutput:        Mixed,
      normalizedOutput: Mixed,

      // Phase 10: Error (if step failed)
      error: {
        code:           String,  // "VALIDATION_ERROR" | "HTTP_ERROR" | "AI_BRIDGE_ERROR"
        message:        String,
        stack:          String,  // stack trace (dev/staging only)
        source:         String,  // "bridge" | "sanitizer" | "connector" | "http"
        recoveryAction: String,  // "retried" | "fallback_used" | "skipped" | "fatal"
        httpStatusCode: Number,
      },

      // Phase 11: Timing
      timing: {
        credentialResolutionMs: Number,
        aiBridgeMs:             Number,
        sanitizationMs:         Number,
        connectorExecutionMs:   Number,
        totalStepMs:            Number,
        timeline: [
          { phase: String, startMs: Number, endMs: Number }
        ],
      },

      startedAt:   Date,
      completedAt: Date,
    }
  ],

  // ── Top-level error (if entire workflow failed) ────
  error:       String,
  startedAt:   Date,
  completedAt: Date,
  createdAt:   Date,
  updatedAt:   Date,
}
```

### Indexes

```javascript
// Fast list queries
{ organizationId: 1, startedAt: -1 }
{ workflowId: 1, startedAt: -1 }
{ status: 1, startedAt: -1 }

// Step-level queries (for drill-down)
{ "steps.connectorId": 1 }
{ "steps.status": 1 }
{ "steps.aiBridge.confidence": 1 }   // find low-confidence steps
{ "steps.error.code": 1 }             // find error types

// Analytics
{ "summary.estimatedAiCostUsd": -1 }  // most expensive workflows
{ organizationId: 1, "summary.failedSteps": -1 }
```

### Retention Policy

```javascript
// TTL index — auto-delete old logs based on org plan
{ startedAt: 1 }, { expireAfterSeconds: 2592000 }  // 30 days default
// Can be overridden per-org via organizationSettings.logRetentionDays
```
