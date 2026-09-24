export type AuthType = 'oauth2' | 'api_key' | 'webhook' | 'basic' | 'none';

// ─── AI Data Bridge — Semantic Role & Format ──────────────────────────────────
//
// These two types are used by the AI Data Bridge and deterministic safety layer
// to understand the MEANING of a field across all 70+ connectors so it can
// automatically transform, coerce, and sanitize values without manual mapping.
//
// ALL fields are optional — existing connectors work without changes.

/** Semantic role describes WHAT a field represents across all connectors */
export type FieldSemanticRole =
  | 'email_address'    // any email field: gmail.from, hubspot.email, stripe.customerEmail
  | 'phone_number'     // any phone: whatsapp.phone, twilio.to — E.164 format required
  | 'full_name'        // combined name: "John Doe" — may need firstName/lastName split
  | 'first_name'       // first name only: hubspot.firstname, salesforce.firstName
  | 'last_name'        // last name only: hubspot.lastname, salesforce.lastName
  | 'message_content'  // main text body: slack.text, telegram.message_text, gmail.bodyPlain
  | 'title_subject'    // title/subject: github.title, jira.summary, gmail.subject
  | 'description_body' // longer description: jira.description, github.body
  | 'url_link'         // any URL: github.issueUrl, google-drive.fileUrl, notion.pageUrl
  | 'timestamp'        // date/time: gmail.date, stripe.created, hubspot.createdate
  | 'amount_money'     // monetary amount: stripe.amount (cents), hubspot.amount (dollars)
  | 'currency_code'    // ISO 4217: "usd", "eur", "inr"
  | 'unique_id'        // system ID: orderId, messageId, chargeId, vid, leadId
  | 'status'           // state value: dealstage, issueType, deliveryStatus
  | 'tags_list'        // tags/labels: comma-separated or array
  | 'file_content'     // binary or base64 file: google-drive.fileContent
  | 'json_data'        // arbitrary JSON blob
  | 'count_number'     // numeric count/quantity
  | 'channel_id';      // messaging channel: slack.channel, discord.webhookUrl

/** Format specifies HOW the value is encoded — used for coercion rules */
export type FieldFormat =
  | 'email'              // RFC 5321 email string
  | 'phone_e164'         // "+14155552671" E.164 format
  | 'url'                // "https://..." full URL
  | 'iso_date'           // "2024-01-15T10:30:00.000Z" ISO 8601
  | 'unix_timestamp'     // 1699900000 (seconds since epoch, integer)
  | 'unix_timestamp_ms'  // 1699900000000 (milliseconds, integer)
  | 'currency_cents'     // 4999 (Stripe-style, integer)
  | 'currency_dollars'   // 49.99 (float string or number)
  | 'json_string'        // '{"key":"value"}' — JSON encoded as string
  | 'markdown'           // Markdown formatted text
  | 'html'               // HTML formatted text
  | 'csv'                // comma-separated values string
  | 'base64';            // base64-encoded data

// ─── Field Schema ──────────────────────────────────────────────────────────────

export interface ConnectorFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'array' | 'object';
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  description?: string;
  placeholder?: string;
  // ── AI Data Bridge metadata (optional — backward compatible) ──
  /** Semantic role for cross-connector automatic field mapping */
  semanticRole?: FieldSemanticRole;
  /** Format hint — used by TypeCoercer for automatic type conversion */
  format?: FieldFormat;
  // Dynamic choices — dropdown populated via live API call at config time
  hasDynamicChoices?: boolean;
  choicesFieldId?: string;        // fieldId passed to /connectors/:appId/choices/:fieldId
  requiredScopes?: string[];      // OAuth scopes needed to fetch choices for this field
  // Dependent choices — this field's choices depend on another field's value
  dependsOn?: string;             // key of the parent field (e.g. 'spreadsheetId' → 'sheetName')
  dynamicChoice?: {
    endpoint: string;
    dependsOn?: string[];
  };
}

// ─── JSON Schema (for inputSchema / outputSchema on actions) ─────────────────

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title?: string;
  description?: string;
  enum?: string[];
  default?: any;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  format?: string;
  dynamicOptions?: {
    endpoint: string;
    dependsOn?: string[];
  };
}

export interface JSONSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, JSONSchemaProperty>;
  additionalProperties?: boolean;
}

// ─── Operation (Trigger or Action) ────────────────────────────────────────────

export interface RateLimitInfo {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  minPollIntervalSeconds?: number; // minimum interval for polling triggers
  maxResultsPerPoll?: number;
  notes?: string;                  // human-readable notes shown in UI
}

export interface ConnectorOperation {
  id: string;
  name: string;
  description: string;
  type: 'trigger' | 'action';
  inputs: ConnectorFieldSchema[];
  outputs: ConnectorFieldSchema[];
  // ── V2 Schema Fields (dynamic form rendering + test drawer) ──────────────
  /** Full JSON Schema for input fields — drives dynamic form rendering */
  inputSchema?: JSONSchema;
  /** Full JSON Schema for output fields — drives output visualizer */
  outputSchema?: JSONSchema;
  /** UI hints for each field: placeholders, default test values, visibility */
  uiSchema?: Record<string, {
    defaultTestValue?: any;
    placeholder?: string;
    hidden?: boolean;
    widget?: 'textarea' | 'code' | 'password' | 'select' | 'date';
  }>;
  // Trigger-specific
  deliveryMethod?: 'webhook' | 'polling'; // how the trigger receives events
  pollingCursorField?: string;            // field used as poll cursor (e.g. 'updated_at', 'max_id')
  // Auth
  requiredScopes?: string[];              // OAuth scopes required for this specific operation
  // API metadata (for documentation and AI engine)
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;                      // e.g. '/repos/{owner}/{repo}/issues'
  // Rate limiting
  rateLimitInfo?: RateLimitInfo;
}

// ─── Wizard Metadata (for auth setup flow) ────────────────────────────────────

export interface WizardStepMetadata {
  id: 'setup' | 'configure' | 'test';
  label: string;
  subtitle?: string;
  description?: string;
}

export interface ConnectorWizardMetadata {
  step1: WizardStepMetadata;
  step2: WizardStepMetadata;
  step3: WizardStepMetadata;
}

// ─── Connector Manifest ────────────────────────────────────────────────────────

export interface ConnectorManifest {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;                   // SVG or image URL
  authType: AuthType;
  authConfig?: Record<string, any>;
  triggers: ConnectorOperation[];
  actions: ConnectorOperation[];
  wizardMetadata?: ConnectorWizardMetadata;
  // Full-power capability map additions
  authScopes?: string[];          // all possible OAuth scopes for this connector
  docsUrl?: string;               // link to official API docs
  version?: string;               // connector version string e.g. '1.0.0'
}

// ─── AI Engine Export Types ───────────────────────────────────────────────────

/** Compact stub used in the AI prompt for unconnected connectors */
export interface ConnectorStub {
  id: string;
  name: string;
}

/** Full scoped export from ManifestRegistry.exportForAI() */
export interface AIConnectorIndex {
  /** Full manifest schemas for the top selected connected apps (max 4) */
  fullSchemas: ConnectorManifest[];
  /** Lightweight stubs for all other connectors */
  catalog: ConnectorStub[];
  /** Connected app IDs that were dropped due to the 4-connector cap */
  droppedConnectedApps: string[];
}

/** Dynamic choices option (used by /connectors/:appId/choices/:fieldId) */
export interface ChoiceOption {
  label: string;
  value: string;
  description?: string;           // optional subtitle shown in dropdown
  group?: string;                 // optional group/category header in dropdown
}
