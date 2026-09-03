import { Schema, model, Document } from 'mongoose';

export type ConversationChannel = 'whatsapp' | 'telegram' | 'slack' | 'email' | 'sms';
export type ConversationStatus = 'active' | 'closed' | 'paused';

export interface IWAConversation extends Document {
  automationId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  channel: ConversationChannel;
  externalUserId: string;        // phone number or platform-specific user ID
  status: ConversationStatus;
  messageCount: number;
  lastMessageAt: Date;
  openedAt: Date;
  closedAt?: Date;
  metadata: Record<string, any>; // channel-specific extras
  createdAt: Date;
  updatedAt: Date;
}

const WAConversationSchema = new Schema<IWAConversation>(
  {
    automationId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAutomation', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    channel: {
      type: String,
      enum: ['whatsapp', 'telegram', 'slack', 'email', 'sms'],
      required: true,
      default: 'whatsapp',
    },
    externalUserId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'closed', 'paused'],
      default: 'active',
    },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index: one active session per user per automation
WAConversationSchema.index({ automationId: 1, externalUserId: 1, status: 1 });

export const WAConversationModel = model<IWAConversation>('WAConversation', WAConversationSchema);
