"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorFeatureModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorFeatureSchema = new mongoose_1.Schema({
    connectorId: { type: String, required: true, index: true },
    featureId: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    status: {
        type: String,
        enum: [
            'SUPPORTED',
            'NOT_SUPPORTED',
            'REQUIRES_PROVIDER_APPROVAL',
            'CUSTOM_IMPLEMENTATION_REQUIRED',
            'DEPRECATED',
            'EXPERIMENTAL',
        ],
        default: 'SUPPORTED',
    },
    documentationUrl: { type: String },
    notes: { type: String },
}, { timestamps: true });
ConnectorFeatureSchema.index({ connectorId: 1, featureId: 1 }, { unique: true });
exports.ConnectorFeatureModel = (0, mongoose_1.model)('ConnectorFeature', ConnectorFeatureSchema, 'connector_features');
