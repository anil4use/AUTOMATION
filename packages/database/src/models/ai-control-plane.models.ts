import mongoose, { Schema, Document } from 'mongoose';

// ─── 1. AI Providers ────────────────────────────────────────────────────────
export interface IAIProvider extends Document {
  providerId: string;
  name: string;
  baseUrl?: string;
  credentials?: Record<string, any>;
  enabled: boolean;
  capabilities: string[];
  createdAt: Date;
  updatedAt: Date;
}

const aiProviderSchema = new Schema<IAIProvider>(
  {
    providerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    baseUrl: { type: String },
    credentials: { type: Schema.Types.Mixed }, // Encrypted API Keys or refs
    enabled: { type: Boolean, default: true },
    capabilities: [{ type: String }],
  },
  { timestamps: true }
);

export const AIProviderModel = mongoose.models.AIProvider || mongoose.model<IAIProvider>('AIProvider', aiProviderSchema);


// ─── 2. AI Models ───────────────────────────────────────────────────────────
export interface IAIModel extends Document {
  providerId: string;
  modelId: string;
  name: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsJson: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsReasoning: boolean;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiModelSchema = new Schema<IAIModel>(
  {
    providerId: { type: String, required: true, index: true },
    modelId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    contextWindow: { type: Number, default: 4096 },
    supportsTools: { type: Boolean, default: false },
    supportsJson: { type: Boolean, default: false },
    supportsVision: { type: Boolean, default: false },
    supportsStreaming: { type: Boolean, default: false },
    supportsReasoning: { type: Boolean, default: false },
    inputCostPer1k: { type: Number },
    outputCostPer1k: { type: Number },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
  },
  { timestamps: true }
);

aiModelSchema.index({ providerId: 1, modelId: 1 }, { unique: true });

export const AIModelModel = mongoose.models.AIModel || mongoose.model<IAIModel>('AIModel', aiModelSchema);


// ─── 3. AI Prompts ──────────────────────────────────────────────────────────
export interface IAIPrompt extends Document {
  feature: string;
  promptKey: string;
  name: string;
  description?: string;
  type: 'system' | 'user' | 'assistant';
  template: string;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  outputSchema?: Record<string, any>;
  rules?: string[];
  status: 'draft' | 'test' | 'active' | 'archived';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const aiPromptSchema = new Schema<IAIPrompt>(
  {
    feature: { type: String, required: true, index: true },
    promptKey: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    template: { type: String, required: true },
    variables: [
      {
        name: { type: String },
        type: { type: String }, // 'type' is a reserved key in Mongoose schemas, must wrap it
        required: { type: Boolean },
      },
    ],
    outputSchema: { type: Schema.Types.Mixed },
    rules: [{ type: String }],
    status: { type: String, enum: ['draft', 'test', 'active', 'archived'], default: 'draft' },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

aiPromptSchema.index({ feature: 1, promptKey: 1, status: 1 });
aiPromptSchema.index({ feature: 1, promptKey: 1, version: 1 }, { unique: true });

export const AIPromptModel = mongoose.models.AIPrompt || mongoose.model<IAIPrompt>('AIPrompt', aiPromptSchema);


// ─── 4. AI Task Configs ─────────────────────────────────────────────────────
export interface IAITaskConfig extends Document {
  feature: string;
  task: string;
  promptKey: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  routingStrategy: 'fixed' | 'cheapest' | 'fastest' | 'capability';
  parameters: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  requirements: {
    structuredOutput: boolean;
    toolsEnabled: boolean;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const aiTaskConfigSchema = new Schema<IAITaskConfig>(
  {
    feature: { type: String, required: true, index: true },
    task: { type: String, required: true, unique: true },
    promptKey: { type: String, required: true },
    primaryProvider: { type: String, required: true },
    primaryModel: { type: String, required: true },
    fallbackProvider: { type: String },
    fallbackModel: { type: String },
    routingStrategy: { type: String, enum: ['fixed', 'cheapest', 'fastest', 'capability'], default: 'fixed' },
    parameters: {
      temperature: { type: Number, default: 0.1 },
      maxTokens: { type: Number, default: 4000 },
      topP: { type: Number, default: 0.95 },
    },
    requirements: {
      structuredOutput: { type: Boolean, default: false },
      toolsEnabled: { type: Boolean, default: false },
    },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const AITaskConfigModel = mongoose.models.AITaskConfig || mongoose.model<IAITaskConfig>('AITaskConfig', aiTaskConfigSchema);


// ─── 5. AI Execution Logs ───────────────────────────────────────────────────
export interface IAIExecutionLog extends Document {
  feature: string;
  task: string;
  promptKey: string;
  promptVersion: number;
  provider: string;
  llmModel: string;
  success: boolean;
  isFallback: boolean;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  errorMessage?: string;
  rawPrompt?: string;
  rawResponse?: string;
  createdAt: Date;
}

const aiExecutionLogSchema = new Schema<IAIExecutionLog>(
  {
    feature: { type: String, required: true, index: true },
    task: { type: String, required: true, index: true },
    promptKey: { type: String, required: true },
    promptVersion: { type: Number, required: true },
    provider: { type: String, required: true },
    llmModel: { type: String, required: true },
    success: { type: Boolean, required: true },
    isFallback: { type: Boolean, default: false },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    errorMessage: { type: String },
    rawPrompt: { type: String },
    rawResponse: { type: String },
  },
  { timestamps: true } // automatically adds createdAt and updatedAt
);

export const AIExecutionLogModel = mongoose.models.AIExecutionLog || mongoose.model<IAIExecutionLog>('AIExecutionLog', aiExecutionLogSchema);
