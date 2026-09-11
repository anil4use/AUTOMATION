"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectionSchema = new mongoose_1.Schema({
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    connectorId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    label: { type: String },
    accountEmail: { type: String },
    environmentTag: { type: String, enum: ['local', 'development', 'staging', 'beta', 'production'], default: 'development' },
    connectionMethod: { type: String, enum: ['uri', 'fields', 'ssh_tunnel', 'ssl', 'socket', 'read_replica'], default: 'fields' },
    dbType: { type: String },
    allowedStatements: [{ type: String }],
    lastTestedAt: { type: Date },
    lastTestError: { type: String },
    authType: { type: String, enum: ['oauth2', 'api_key', 'webhook', 'basic'], required: true },
    encryptedCredentials: { type: String, required: true },
    expiresAt: { type: Date },
    tokenExpiresAt: { type: Date },
    refreshToken: { type: String },
    lastRefreshedAt: { type: Date },
    lastRefreshError: { type: String },
    pollingCursor: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    status: {
        type: String,
        enum: ['connected', 'active', 'expired', 'refresh_failed', 'error', 'pending_auth'],
        default: 'active',
    },
}, { timestamps: true });
exports.ConnectionModel = (0, mongoose_1.model)('Connection', ConnectionSchema);
