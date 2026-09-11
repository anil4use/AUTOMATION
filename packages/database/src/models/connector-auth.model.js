"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorAuthModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorAuthSchema = new mongoose_1.Schema({
    authenticationId: { type: String, required: true, unique: true, index: true },
    connectorId: { type: String, required: true, index: true },
    type: {
        type: String,
        enum: ['oauth2', 'oauth2_pkce', 'api_key', 'bearer_token', 'basic_auth', 'connection_string', 'none'],
        required: true,
    },
    name: { type: String, required: true },
    description: { type: String, required: true },
    recommended: { type: Boolean, default: true },
    providerConsoleUrl: { type: String },
    setupGuide: {
        summary: { type: String },
        steps: [{ type: String }],
        redirectUriRequirement: { type: String },
    },
    fields: [
        {
            key: { type: String, required: true },
            label: { type: String, required: true },
            type: {
                type: String,
                enum: ['string', 'password', 'textarea', 'number', 'boolean'],
                default: 'string',
            },
            required: { type: Boolean, default: true },
            placeholder: { type: String },
            help: { type: String },
            docUrl: { type: String },
        },
    ],
    scopes: [{ type: String }],
    authorizationUrl: { type: String },
    tokenUrl: { type: String },
    refreshTokenSupported: { type: Boolean, default: false },
}, { timestamps: true });
exports.ConnectorAuthModel = (0, mongoose_1.model)('ConnectorAuth', ConnectorAuthSchema, 'connector_authentications');
