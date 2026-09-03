import { Schema, model, Document } from 'mongoose';

export type MessageRole = 'user' | 'agent';
export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'location' | 'sticker' | 'video';

export interface IWAMessage extends Document {
  conversationId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  role: MessageRole;
  type: MessageType;
  content: string;
  // Full normalized message snapshot for audit/replay
  normalizedMessage: Record<string, any>;
  // Platform-specific message ID (for deduplication)
  platformMessageId?: string;
  timestamp: Date;
  createdAt: Date;
}

const WAMessageSchema = new Schema<IWAMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'WAConversation', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: {
      type: String,
      enum: ['user', 'agent'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'document', 'location', 'sticker', 'video'],
      default: 'text',
    },
    content: { type: String, required: true },
    normalizedMessage: { type: Schema.Types.Mixed, default: {} },
    platformMessageId: { type: String, sparse: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Fast retrieval for conversation history (sorted by time)
WAMessageSchema.index({ conversationId: 1, timestamp: 1 });

export const WAMessageModel = model<IWAMessage>('WAMessage', WAMessageSchema);
