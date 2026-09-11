"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookModel = void 0;
const mongoose_1 = require("mongoose");
const WebhookSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    workflowId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    webhookId: { type: String, required: true, unique: true, index: true },
    secret: { type: String, required: true },
    providerType: { type: String, required: true },
    expiresAt: { type: Date },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
exports.WebhookModel = (0, mongoose_1.model)('Webhook', WebhookSchema);
