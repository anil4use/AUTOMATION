import { Schema, model, Document } from 'mongoose';

/**
 * execution_logs (enhanced)
 *
 * Full 11-phase per-step execution audit trail.
 * Captures every input, AI bridge decision, type coercion, sanitization event,
 * HTTP request/response, output, error, and timing breakdown for every step
 * of every workflow execution.
 *
 * See docs: docs/features/15_execution_logging.md
 */

// ─── Sub-Schemas (reusable) ────────────────────────────────────────────────────

const TimelineEntrySchema = new Schema(
  { phase: String, startMs: Number, endMs: Number },
  { _id: false }
);

const StepTimingSchema = new Schema(
  {
    credentialResolutionMs: { type: Number, default: 0 },
    aiBridgeMs:             { type: Number, default: 0 },
    sanitizationMs:         { type: Number, default: 0 },
    connectorExecutionMs:   { type: Number, default: 0 },
    totalStepMs:            { type: Number, default: 0 },
    timeline:               { type: [TimelineEntrySchema], default: [] },
  },
  { _id: false }
);

const HttpRequestLogSchema = new Schema(
  {
    method:  { type: String },
    url:     { type: String },
    headers: { type: Schema.Types.Mixed },  // Authorization values masked → "Bearer ***"
    body:    { type: Schema.Types.Mixed },
    sentAt:  { type: Date },
  },
  { _id: false }
);

const HttpResponseLogSchema = new Schema(
  {
    statusCode: { type: Number },
    statusText: { type: String },
    headers:    { type: Schema.Types.Mixed },
    body:       { type: Schema.Types.Mixed },
    latencyMs:  { type: Number },
    receivedAt: { type: Date },
  },
  { _id: false }
);

const AiBridgeLogSchema = new Schema(
  {
    enabled:           { type: Boolean, default: false },
    fromCache:         { type: Boolean, default: false },
    cacheKey:          { type: String },
    aiModel:           { type: String },           // "groq/llama-3.3-70b-versatile"
    promptTokens:      { type: Number, default: 0 },
    completionTokens:  { type: Number, default: 0 },
    estimatedCostUsd:  { type: Number, default: 0 },
    latencyMs:         { type: Number, default: 0 },
    confidence:        { type: Number, default: 0, min: 0, max: 1 },
    mappingDecisions:  { type: Schema.Types.Mixed }, // { fieldKey: "explanation" }
    warnings:          { type: [String], default: [] },
    unmappedRequired:  { type: [String], default: [] }, // required fields AI couldn't fill
    promptSnapshot:    { type: String },              // first 2000 chars of prompt
    rawAiResponse:     { type: String },              // first 2000 chars of AI response
  },
  { _id: false }
);

const CoercionEventSchema = new Schema(
  {
    field:      { type: String },
    fromType:   { type: String },
    toType:     { type: String },
    fromFormat: { type: String },
    toFormat:   { type: String },
    before:     { type: Schema.Types.Mixed },
    after:      { type: Schema.Types.Mixed },
    rule:       { type: String },  // "unix_seconds_to_iso"
  },
  { _id: false }
);

const SanitizationEventSchema = new Schema(
  {
    field:     { type: String },
    action:    { type: String }, // "xss_stripped" | "sql_stripped" | "trimmed" | "truncated" | "masked"
    before:    { type: String }, // truncated to 500 chars
    after:     { type: String },
    flaggedAs: { type: String }, // "xss" | "sql_injection" | "pii" | "length_exceeded"
  },
  { _id: false }
);

const ValidationErrorSchema = new Schema(
  {
    field:    { type: String },
    rule:     { type: String },     // "required" | "type" | "format" | "enum" | "length"
    expected: { type: String },
    got:      { type: String },
    severity: { type: String, enum: ['error', 'warning'], default: 'error' },
  },
  { _id: false }
);

const CredentialResolutionSchema = new Schema(
  {
    connectorId:    { type: String },
    connectionId:   { type: String }, // MongoDB ObjectId (NOT the actual credentials)
    connectionName: { type: String }, // "My Gmail Account"
    authType:       { type: String }, // "oauth2" | "api_key" | "none"
    source:         { type: String }, // "database" | "env" | "system"
    resolvedAt:     { type: Date },
  },
  { _id: false }
);

const RetryAttemptSchema = new Schema(
  {
    attempt:   { type: Number },
    error:     { type: String },
    delayMs:   { type: Number },
    timestamp: { type: Date },
  },
  { _id: false }
);

const StepErrorSchema = new Schema(
  {
    code:           { type: String }, // "VALIDATION_ERROR" | "HTTP_ERROR" | "AI_BRIDGE_ERROR"
    message:        { type: String },
    stack:          { type: String }, // full stack trace (masked in prod)
    source:         { type: String }, // "bridge" | "sanitizer" | "connector" | "http" | "dag"
    recoveryAction: { type: String }, // "retried" | "fallback_used" | "skipped" | "fatal"
    httpStatusCode: { type: Number },
  },
  { _id: false }
);

// ─── Per-Step Log Schema ────────────────────────────────────────────────────────

const StepExecutionLogSchema = new Schema(
  {
    nodeId:      { type: String, required: true },
    nodeName:    { type: String },
    connectorId: { type: String },
    operationId: { type: String },
    stepIndex:   { type: Number, default: 0 }, // 0-based DAG execution order

    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped', 'retried'],
      default: 'pending',
    },

    // Phase 1: What came in
    rawInputFromPreviousStep:  { type: Schema.Types.Mixed },
    userFieldMappingOverrides: { type: Schema.Types.Mixed },
    nodeConfig:                { type: Schema.Types.Mixed },

    // Phase 2: Credential resolution
    credentialResolution: { type: CredentialResolutionSchema },

    // Phase 3: AI Data Bridge
    aiBridge: { type: AiBridgeLogSchema },

    // Phase 4: Type coercions
    coercions: { type: [CoercionEventSchema], default: [] },

    // Phase 5: Sanitization
    sanitization: { type: [SanitizationEventSchema], default: [] },

    // Phase 6: Validation
    validationErrors: { type: [ValidationErrorSchema], default: [] },
    validationPassed: { type: Boolean, default: true },

    // Phase 7: Final resolved inputs (what was actually sent to connector)
    resolvedInputs: { type: Schema.Types.Mixed }, // secrets masked (token → "***")

    // Phase 8: HTTP execution
    httpRequest:   { type: HttpRequestLogSchema },
    httpResponse:  { type: HttpResponseLogSchema },
    retryAttempts: { type: [RetryAttemptSchema], default: [] },

    // Phase 9: Output
    rawOutput:        { type: Schema.Types.Mixed },
    normalizedOutput: { type: Schema.Types.Mixed },

    // Phase 10: Error
    error: { type: StepErrorSchema, default: null },

    // Phase 11: Timing
    timing: { type: StepTimingSchema },

    startedAt:   { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

// ─── Top-Level Execution Log ────────────────────────────────────────────────────

export interface IExecutionLog extends Document {
  workflowId:         Schema.Types.ObjectId;
  organizationId:     Schema.Types.ObjectId;
  triggeredBy:        string;
  triggeredByUserId?: string;
  status:             string;
  triggerPayload:     Record<string, any>;
  steps:              any[];
  nodeResults:        Record<string, any>; // backward compat — kept alongside steps[]
  summary: {
    totalSteps:          number;
    completedSteps:      number;
    failedSteps:         number;
    skippedSteps:        number;
    totalDurationMs:     number;
    aiCallsCount:        number;
    aiCacheHitsCount:    number;
    estimatedAiCostUsd:  number;
    dataTransformed:     boolean;
    sanitizationEvents:  number;
    retryCount:          number;
  };
  error?:       string;
  startedAt:    Date;
  completedAt?: Date;
}

const ExecutionSummarySchema = new Schema(
  {
    totalSteps:         { type: Number, default: 0 },
    completedSteps:     { type: Number, default: 0 },
    failedSteps:        { type: Number, default: 0 },
    skippedSteps:       { type: Number, default: 0 },
    totalDurationMs:    { type: Number, default: 0 },
    aiCallsCount:       { type: Number, default: 0 },
    aiCacheHitsCount:   { type: Number, default: 0 },
    estimatedAiCostUsd: { type: Number, default: 0 },
    dataTransformed:    { type: Boolean, default: false },
    sanitizationEvents: { type: Number, default: 0 },
    retryCount:         { type: Number, default: 0 },
  },
  { _id: false }
);

const ExecutionLogSchema = new Schema<IExecutionLog>(
  {
    workflowId:       { type: Schema.Types.ObjectId, ref: 'Workflow', index: true },
    organizationId:   { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    triggeredBy:      { type: String, enum: ['schedule', 'webhook', 'manual', 'api'], default: 'manual' },
    triggeredByUserId:{ type: String },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'retrying', 'partial'],
      default: 'pending',
      index: true,
    },
    triggerPayload: { type: Schema.Types.Mixed, default: {} },
    steps:          [StepExecutionLogSchema],
    nodeResults:    { type: Schema.Types.Mixed, default: {} }, // backward compat
    summary:        { type: ExecutionSummarySchema, default: () => ({}) },
    error:          { type: String },
    startedAt:      { type: Date, default: Date.now, index: true },
    completedAt:    { type: Date },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────────
ExecutionLogSchema.index({ organizationId: 1, startedAt: -1 });
ExecutionLogSchema.index({ workflowId: 1, startedAt: -1 });
ExecutionLogSchema.index({ status: 1, startedAt: -1 });
ExecutionLogSchema.index({ 'steps.connectorId': 1 });
ExecutionLogSchema.index({ 'steps.status': 1 });
ExecutionLogSchema.index({ 'steps.aiBridge.confidence': 1 });
ExecutionLogSchema.index({ 'steps.error.code': 1 });
ExecutionLogSchema.index({ 'summary.estimatedAiCostUsd': -1 });

export const ExecutionLogModel = model<IExecutionLog>('ExecutionLog', ExecutionLogSchema);
