"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppAutomationModel = void 0;
const mongoose_1 = require("mongoose");
const WhatsAppAutomationSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    creatorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
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
    journeyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Journey' },
}, { timestamps: true });
exports.WhatsAppAutomationModel = (0, mongoose_1.model)('WhatsAppAutomation', WhatsAppAutomationSchema);
