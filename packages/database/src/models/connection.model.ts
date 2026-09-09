import { Schema, model, Document } from 'mongoose';

export interface IConnection extends Document {
  organizationId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  connectorId: string; // e.g. 'gmail', 'slack', 'postgresql', 'mongodb'
  name: string;
  label?: string;
  accountEmail?: string;
  environmentTag?: 'local' | 'development' | 'staging' | 'beta' | 'production';
  connectionMethod?: 'uri' | 'fields' | 'ssh_tunnel' | 'ssl' | 'socket' | 'read_replica';
  dbType?: string;
  allowedStatements?: string[];
  lastTestedAt?: Date;
  lastTestError?: string;
  authType: 'oauth2' | 'api_key' | 'webhook' | 'basic';
  encryptedCredentials: string; // AES-256 encrypted JSON string
  expiresAt?: Date;
  tokenExpiresAt?: Date;
  refreshToken?: string;
  lastRefreshedAt?: Date;
  lastRefreshError?: string;
  pollingCursor?: Record<string, any>;
  status: 'connected' | 'active' | 'expired' | 'refresh_failed' | 'error' | 'pending_auth';
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    pollingCursor: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['connected', 'active', 'expired', 'refresh_failed', 'error', 'pending_auth'],
      default: 'active',
    },
  },
  { timestamps: true }
);

export const ConnectionModel = model<IConnection>('Connection', ConnectionSchema);
