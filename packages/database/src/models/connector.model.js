"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorSchema = new mongoose_1.Schema({
    connectorId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String, required: true },
    provider: { type: String, required: true },
    categoryId: { type: String, required: true, index: true },
    icon: { type: String, required: true },
    website: { type: String },
    documentationUrl: { type: String },
    version: { type: String, default: '2.0.0' },
    sdkVersion: { type: String, default: '2.0.0' },
    status: {
        type: String,
        enum: ['draft', 'testing', 'published', 'disabled', 'deprecated'],
        default: 'published',
        index: true,
    },
    enabled: { type: Boolean, default: true, index: true },
    isSystemConnector: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    runtimeType: {
        type: String,
        enum: ['http', 'oauth_api', 'sdk', 'database', 'browser', 'webhook', 'polling', 'ai', 'built_in', 'adapter'],
        required: true,
        default: 'adapter',
    },
    adapterType: { type: String },
    tags: [{ type: String }],
    capabilities: [{ type: String }],
    limitations: [{ type: String }],
}, { timestamps: true });
exports.ConnectorModel = (0, mongoose_1.model)('Connector', ConnectorSchema, 'connectors');
