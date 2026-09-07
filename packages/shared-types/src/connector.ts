export type AuthType = 'oauth2' | 'api_key' | 'webhook' | 'basic' | 'none';

// ─── Field Schema ──────────────────────────────────────────────────────────────

export interface ConnectorFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'array' | 'object';
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  description?: string;
  placeholder?: string;
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
