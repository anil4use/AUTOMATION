import { Schema, model, Document } from 'mongoose';

export interface IWorkflow extends Document {
  organizationId: Schema.Types.ObjectId;
  creatorId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  environment: 'dev' | 'staging' | 'prod';
  definition: {
    nodes: Array<any>;
    edges: Array<any>;
  };
  triggerState?: {
    pollingCursor?: string;
    lastPolledAt?: Date;
    webhookId?: string;
    providerHookId?: string; // Always string (Patch 5)
    slackSharedEndpoint?: boolean;
    devFallbackPolling?: boolean;
  };
  history?: Array<{ version: number; definition: any; savedAt: Date }>;
  isAiGenerated: boolean;
  aiPrompt?: string;
  lastExecutedAt?: Date;
  executionCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft', index: true },
    version: { type: Number, default: 1 },
    environment: { type: String, enum: ['dev', 'staging', 'prod'], default: 'dev' },
    definition: {
      nodes: { type: Schema.Types.Mixed, default: [] },
      edges: { type: Schema.Types.Mixed, default: [] },
    },
    triggerState: {
      pollingCursor: { type: String },
      lastPolledAt: { type: Date },
      webhookId: { type: String },
      providerHookId: { type: String }, // string (Patch 5)
      slackSharedEndpoint: { type: Boolean },
      devFallbackPolling: { type: Boolean },
    },
    history: { type: Schema.Types.Mixed, default: [] },
    isAiGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String },
    lastExecutedAt: { type: Date },
    executionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WorkflowModel = model<IWorkflow>('Workflow', WorkflowSchema);
