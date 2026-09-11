"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIChatModel = void 0;
const mongoose_1 = require("mongoose");
const AIChatSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messages: [
        {
            id: String,
            role: String,
            content: String,
            isGreeting: Boolean,
            suggestedConnectors: [String],
            userConnectionsStatus: mongoose_1.Schema.Types.Mixed,
            workflowDraft: mongoose_1.Schema.Types.Mixed,
            createdAt: { type: Date, default: Date.now },
        },
    ],
}, { timestamps: true });
exports.AIChatModel = (0, mongoose_1.model)('AIChat', AIChatSchema);
