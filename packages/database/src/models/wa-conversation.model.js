"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAConversationModel = void 0;
const mongoose_1 = require("mongoose");
const WAConversationSchema = new mongoose_1.Schema({
    automationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'WhatsAppAutomation', required: true, index: true },
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
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
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
// Compound index: one active session per user per automation
WAConversationSchema.index({ automationId: 1, externalUserId: 1, status: 1 });
exports.WAConversationModel = (0, mongoose_1.model)('WAConversation', WAConversationSchema);
