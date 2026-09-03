import { Schema, model, Document } from 'mongoose';

export type AgentModelProvider = 'gemini' | 'groq' | 'openai';

export interface IWhatsAppAutomation extends Document {
  organizationId: Schema.Types.ObjectId;
  creatorId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  enabled: boolean;

  // ── WhatsApp-specific connection ──────────────────────────────────
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId?: string;
  // Access token stored encrypted — decrypted at runtime
  encryptedAccessToken: string;
  // Token used for Meta webhook verification challenge
  verifyToken: string;

  // ── Agent / LLM ───────────────────────────────────────────────────
  agentModel: AgentModelProvider;
  // Free-form personality system prompt written by the user
  agentPersonality: string;

  // ── Access Control (all optional) ─────────────────────────────────
  allowedUsers?: string[];       // phone number whitelist (empty = all allowed)
  blockedUsers?: string[];       // always silently ignored
  allowGroupConversations?: boolean;

  // ── Conversation Settings ─────────────────────────────────────────
  conversationTimeoutMinutes?: number;  // default 60 — inactivity closes session
  maxHistoryMessages?: number;          // default 20 — messages in context window

  // ── Memory Settings ───────────────────────────────────────────────
  enableLongTermMemory?: boolean;       // default true
  memoryExtractionEnabled?: boolean;    // default true
  memoryExtractionAfterEveryN?: number; // extract memory every N turns (default 3)

  // ── Response Settings ─────────────────────────────────────────────
  typingSimulationEnabled?: boolean;    // future: simulate typing indicator
  responseDelayMs?: number;             // future: humanlike delay before replying

  // ── Journey (Phase 4) ─────────────────────────────────────────────
  journeyId?: Schema.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppAutomationSchema = new Schema<IWhatsAppAutomation>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    enabled: { type: Boolean, default: true },

    // WhatsApp connection
    whatsappPhoneNumberId: { type: String, required: true },
    whatsappBusinessAccountId: { type: String },
    encryptedAccessToken: { type: String, required: true },
    verifyToken: { type: String, required: true },

    // Agent
    agentModel: {
      type: String,
      enum: ['gemini', 'groq', 'openai'],
      default: 'gemini',
    },
    agentPersonality: {
      type: String,
      default: `You are a friendly, natural conversational assistant communicating via WhatsApp.
- Keep messages short and conversational (2-4 sentences max).
- Ask one thoughtful follow-up question at a time.
- Remember what the user told you in previous conversations.
- Never claim to be an AI unless directly asked.
- Match the user's communication style (casual or formal).
- Use the user's name if you know it.
- Be warm, empathetic, and genuinely curious about the user.`,
    },

    // Access control
    allowedUsers: [{ type: String }],
    blockedUsers: [{ type: String }],
    allowGroupConversations: { type: Boolean, default: false },

    // Conversation settings
    conversationTimeoutMinutes: { type: Number, default: 60 },
    maxHistoryMessages: { type: Number, default: 20 },

    // Memory settings
    enableLongTermMemory: { type: Boolean, default: true },
    memoryExtractionEnabled: { type: Boolean, default: true },
    memoryExtractionAfterEveryN: { type: Number, default: 3 },

    // Response settings
    typingSimulationEnabled: { type: Boolean, default: false },
    responseDelayMs: { type: Number, default: 0 },

    // Journey
    journeyId: { type: Schema.Types.ObjectId, ref: 'Journey' },
  },
  { timestamps: true }
);

export const WhatsAppAutomationModel = model<IWhatsAppAutomation>(
  'WhatsAppAutomation',
  WhatsAppAutomationSchema
);
