"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAMessageModel = void 0;
const mongoose_1 = require("mongoose");
const WAMessageSchema = new mongoose_1.Schema({
    conversationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'WAConversation', required: true, index: true },
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
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
    normalizedMessage: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    platformMessageId: { type: String, sparse: true },
    timestamp: { type: Date, default: Date.now },
}, {
    timestamps: { createdAt: true, updatedAt: false },
});
// Fast retrieval for conversation history (sorted by time)
WAMessageSchema.index({ conversationId: 1, timestamp: 1 });
exports.WAMessageModel = (0, mongoose_1.model)('WAMessage', WAMessageSchema);
