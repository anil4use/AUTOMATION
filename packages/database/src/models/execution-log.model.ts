import { Schema, model, Document } from 'mongoose';

export interface IExecutionLog extends Document {
  workflowId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  triggerPayload: Record<string, any>;
  nodeResults: Record<string, any>;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

const ExecutionLogSchema = new Schema<IExecutionLog>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: false, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'retrying'], default: 'pending', index: true },
    triggerPayload: { type: Schema.Types.Mixed, default: {} },
    nodeResults: { type: Schema.Types.Mixed, default: {} },
    error: { type: String },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const ExecutionLogModel = model<IExecutionLog>('ExecutionLog', ExecutionLogSchema);
