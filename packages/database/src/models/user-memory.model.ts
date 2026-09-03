import { Schema, model, Document } from 'mongoose';

export interface IMemoryFact {
  key: string;           // dot-notation key, e.g. "daily_routine.wake_up"
  value: any;            // could be string, number, boolean, or nested object
  confidence: number;    // 0.0 – 1.0
  source: 'extracted' | 'explicit' | 'inferred';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;      // optional TTL for time-sensitive facts
}

export interface IUserMemoryProfile {
  name?: string;
  timezone?: string;
  language?: string;
  [key: string]: any;    // extensible for user-specific profile fields
}

export interface IUserMemory extends Document {
  organizationId: Schema.Types.ObjectId;
  automationId: Schema.Types.ObjectId;
  channel: string;
  externalUserId: string;      // phone number / platform user ID
  profile: IUserMemoryProfile;
  facts: IMemoryFact[];
  // A compact text summary of memory for quick context building
  shortTermSummary?: string;
  totalConversations: number;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MemoryFactSchema = new Schema<IMemoryFact>(
  {
    key: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
    source: {
      type: String,
      enum: ['extracted', 'explicit', 'inferred'],
      default: 'extracted',
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

const UserMemorySchema = new Schema<IUserMemory>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: 'WhatsAppAutomation', required: true, index: true },
    channel: { type: String, required: true, default: 'whatsapp' },
    externalUserId: { type: String, required: true, index: true },
    profile: {
      name: { type: String },
      timezone: { type: String },
      language: { type: String },
    },
    facts: [MemoryFactSchema],
    shortTermSummary: { type: String },
    totalConversations: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One memory record per user per automation
UserMemorySchema.index({ organizationId: 1, automationId: 1, externalUserId: 1 }, { unique: true });

export const UserMemoryModel = model<IUserMemory>('UserMemory', UserMemorySchema);
