"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowModel = void 0;
const mongoose_1 = require("mongoose");
const WorkflowSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    creatorId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft', index: true },
    version: { type: Number, default: 1 },
    environment: { type: String, enum: ['dev', 'staging', 'prod'], default: 'dev' },
    definition: {
        nodes: { type: mongoose_1.Schema.Types.Mixed, default: [] },
        edges: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    },
    triggerState: {
        pollingCursor: { type: String },
        lastPolledAt: { type: Date },
        webhookId: { type: String },
        providerHookId: { type: String }, // string (Patch 5)
        slackSharedEndpoint: { type: Boolean },
        devFallbackPolling: { type: Boolean },
    },
    history: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    isAiGenerated: { type: Boolean, default: false },
    aiPrompt: { type: String },
    lastExecutedAt: { type: Date },
    executionCount: { type: Number, default: 0 },
}, { timestamps: true });
exports.WorkflowModel = (0, mongoose_1.model)('Workflow', WorkflowSchema);
