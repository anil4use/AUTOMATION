"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorActionModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorActionSchema = new mongoose_1.Schema({
    connectorId: { type: String, required: true, index: true },
    actionId: { type: String, required: true },
    version: { type: String, default: '2.0.0' },
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['action', 'search', 'trigger'], default: 'action' },
    semanticType: {
        type: String,
        enum: [
            'create',
            'read',
            'get',
            'update',
            'delete',
            'search',
            'list',
            'send',
            'receive',
            'upload',
            'download',
            'execute',
            'analyze',
        ],
        default: 'execute',
    },
    executionType: {
        type: String,
        enum: ['http', 'adapter', 'database', 'browser', 'ai'],
        default: 'adapter',
    },
    adapterMethod: { type: String },
    httpConfig: {
        method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
        urlTemplate: { type: String },
        headers: { type: mongoose_1.Schema.Types.Mixed },
        queryParams: { type: mongoose_1.Schema.Types.Mixed },
        bodyTemplate: { type: mongoose_1.Schema.Types.Mixed },
    },
    inputSchema: { type: mongoose_1.Schema.Types.Mixed, default: { type: 'object', properties: {} } },
    uiSchema: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    outputSchema: { type: mongoose_1.Schema.Types.Mixed, default: { type: 'object', properties: {} } },
    capabilities: [{ type: String }],
    authenticationId: { type: String },
    destructive: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });
ConnectorActionSchema.index({ connectorId: 1, actionId: 1 }, { unique: true });
exports.ConnectorActionModel = (0, mongoose_1.model)('ConnectorAction', ConnectorActionSchema, 'connector_actions');
