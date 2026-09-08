import { Schema, model, Document } from 'mongoose';

export interface IAgentChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  executionPlan?: any;
  stepsExecuted?: any[];
  timestamp?: Date;
}

export interface IPendingConfirmation {
  confirmationId: string;
  confirmationMessage: string;
  plan: any;
  contextMap: any;
  pausedStepIndex: number;
  expiresAt: Date;
}

export interface IAgentConversation extends Document {
  conversationId: string;
  organizationId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  title: string;
  status: 'active' | 'awaiting_confirmation' | 'completed';
  pendingConfirmation?: IPendingConfirmation;
  messages: IAgentChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AgentConversationSchema = new Schema<IAgentConversation>(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: 'New Agent Chat' },
    status: {
      type: String,
      enum: ['active', 'awaiting_confirmation', 'completed'],
      default: 'active',
    },
    pendingConfirmation: {
      confirmationId: String,
      confirmationMessage: String,
      plan: Schema.Types.Mixed,
      contextMap: Schema.Types.Mixed,
      pausedStepIndex: Number,
      expiresAt: Date,
    },
    messages: [
      {
        id: { type: String, required: true },
        role: { type: String, enum: ['user', 'agent', 'system'], required: true },
        content: { type: String, required: true },
        executionPlan: Schema.Types.Mixed,
        stepsExecuted: Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const AgentConversationModel = model<IAgentConversation>('AgentConversation', AgentConversationSchema);
