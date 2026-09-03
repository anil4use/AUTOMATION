import { Schema, model, Document } from 'mongoose';

export interface IWorkflowVersion extends Document {
  workflowId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  version: number;
  status: 'draft' | 'published' | 'archived';
  nodes: any[];
  edges: any[];
  trigger: any;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowVersionSchema = new Schema<IWorkflowVersion>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    version: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    nodes: { type: Schema.Types.Mixed, default: [] },
    edges: { type: Schema.Types.Mixed, default: [] },
    trigger: { type: Schema.Types.Mixed, required: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

WorkflowVersionSchema.index({ workflowId: 1, version: 1 }, { unique: true });

export const WorkflowVersionModel = model<IWorkflowVersion>('WorkflowVersion', WorkflowVersionSchema);
