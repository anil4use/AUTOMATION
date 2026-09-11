"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConversationModel = void 0;
const mongoose_1 = require("mongoose");
const AgentConversationSchema = new mongoose_1.Schema({
    conversationId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: 'New Agent Chat' },
    status: {
        type: String,
        enum: ['active', 'awaiting_confirmation', 'completed'],
        default: 'active',
    },
    pendingConfirmation: {
        confirmationId: String,
        confirmationMessage: String,
        plan: mongoose_1.Schema.Types.Mixed,
        contextMap: mongoose_1.Schema.Types.Mixed,
        pausedStepIndex: Number,
        expiresAt: Date,
    },
    messages: [
        {
            id: { type: String, required: true },
            role: { type: String, enum: ['user', 'agent', 'system'], required: true },
            content: { type: String, required: true },
            executionPlan: mongoose_1.Schema.Types.Mixed,
            stepsExecuted: mongoose_1.Schema.Types.Mixed,
            timestamp: { type: Date, default: Date.now },
        },
    ],
}, { timestamps: true });
exports.AgentConversationModel = (0, mongoose_1.model)('AgentConversation', AgentConversationSchema);
