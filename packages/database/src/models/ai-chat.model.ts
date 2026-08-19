import { Schema, model, Document } from 'mongoose';

export interface IAIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isGreeting?: boolean;
  suggestedConnectors?: string[];
  userConnectionsStatus?: any[];
  workflowDraft?: any;
  createdAt?: Date;
}

export interface IAIChat extends Document {
  organizationId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  messages: IAIChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AIChatSchema = new Schema<IAIChat>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messages: [
      {
        id: String,
        role: String,
        content: String,
        isGreeting: Boolean,
        suggestedConnectors: [String],
        userConnectionsStatus: Schema.Types.Mixed,
        workflowDraft: Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const AIChatModel = model<IAIChat>('AIChat', AIChatSchema);
