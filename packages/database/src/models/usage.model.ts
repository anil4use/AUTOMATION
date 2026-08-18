import { Schema, model, Document } from 'mongoose';

export interface IUsage extends Document {
  organizationId: Schema.Types.ObjectId;
  period: string; // e.g. "2026-08"
  taskExecutionsCount: number;
  aiGenerationsCount: number;
  activeWorkflowsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageSchema = new Schema<IUsage>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    period: { type: String, required: true, index: true },
    taskExecutionsCount: { type: Number, default: 0 },
    aiGenerationsCount: { type: Number, default: 0 },
    activeWorkflowsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UsageSchema.index({ organizationId: 1, period: 1 }, { unique: true });

export const UsageModel = model<IUsage>('Usage', UsageSchema);
