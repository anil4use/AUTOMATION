"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageModel = void 0;
const mongoose_1 = require("mongoose");
const UsageSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    period: { type: String, required: true, index: true },
    taskExecutionsCount: { type: Number, default: 0 },
    aiGenerationsCount: { type: Number, default: 0 },
    activeWorkflowsCount: { type: Number, default: 0 },
}, { timestamps: true });
UsageSchema.index({ organizationId: 1, period: 1 }, { unique: true });
exports.UsageModel = (0, mongoose_1.model)('Usage', UsageSchema);
