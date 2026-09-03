import { Schema, model, Document } from 'mongoose';

export interface IWorkflow extends Document {
  organizationId: Schema.Types.ObjectId;
  creatorId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  definition: {
    nodes: Array<any>;
    edges: Array<any>;
  };
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
    definition: {
      nodes: { type: Schema.Types.Mixed, default: [] },
      edges: { type: Schema.Types.Mixed, default: [] },
    },
    isAiGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String },
    lastExecutedAt: { type: Date },
    executionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const WorkflowModel = model<IWorkflow>('Workflow', WorkflowSchema);
