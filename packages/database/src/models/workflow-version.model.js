"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowVersionModel = void 0;
const mongoose_1 = require("mongoose");
const WorkflowVersionSchema = new mongoose_1.Schema({
    workflowId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    version: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    nodes: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    edges: { type: mongoose_1.Schema.Types.Mixed, default: [] },
    trigger: { type: mongoose_1.Schema.Types.Mixed, required: true },
    publishedAt: { type: Date },
}, { timestamps: true });
WorkflowVersionSchema.index({ workflowId: 1, version: 1 }, { unique: true });
exports.WorkflowVersionModel = (0, mongoose_1.model)('WorkflowVersion', WorkflowVersionSchema);
