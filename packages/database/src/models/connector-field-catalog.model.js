"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorFieldCatalogModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorFieldCatalogSchema = new mongoose_1.Schema({
    connectorId: { type: String, required: true, index: true },
    operationId: { type: String, required: true },
    operationType: { type: String, enum: ['trigger', 'action'], required: true },
    direction: { type: String, enum: ['input', 'output'], required: true },
    fieldKey: { type: String, required: true },
    fieldLabel: { type: String, required: true },
    fieldType: { type: String, enum: ['string', 'number', 'boolean', 'select', 'json', 'array', 'object'], default: 'string' },
    required: { type: Boolean, default: false },
    semanticRole: { type: String, default: null },
    format: { type: String, default: null },
    synonyms: { type: [String], default: [] },
    transformHints: { type: [String], default: [] },
    notes: { type: String, default: '' },
    autoDetected: { type: Boolean, default: true },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    version: { type: String, default: '2.0.0' },
    enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });
// Compound unique index — one entry per (connector, operation, direction, field)
ConnectorFieldCatalogSchema.index({ connectorId: 1, operationId: 1, direction: 1, fieldKey: 1 }, { unique: true });
ConnectorFieldCatalogSchema.index({ semanticRole: 1 });
ConnectorFieldCatalogSchema.index({ connectorId: 1, direction: 1 });
ConnectorFieldCatalogSchema.index({ enabled: 1 });
exports.ConnectorFieldCatalogModel = (0, mongoose_1.model)('ConnectorFieldCatalog', ConnectorFieldCatalogSchema, 'connector_field_catalog');
