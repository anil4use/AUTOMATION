"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserMemoryModel = void 0;
const mongoose_1 = require("mongoose");
const MemoryFactSchema = new mongoose_1.Schema({
    key: { type: String, required: true },
    value: { type: mongoose_1.Schema.Types.Mixed, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 },
    source: {
        type: String,
        enum: ['extracted', 'explicit', 'inferred'],
        default: 'extracted',
    },
    expiresAt: { type: Date },
}, { timestamps: true });
const UserMemorySchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    automationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'WhatsAppAutomation', required: true, index: true },
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
}, { timestamps: true });
// One memory record per user per automation
UserMemorySchema.index({ organizationId: 1, automationId: 1, externalUserId: 1 }, { unique: true });
exports.UserMemoryModel = (0, mongoose_1.model)('UserMemory', UserMemorySchema);
