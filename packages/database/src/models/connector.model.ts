import { Schema, model, Document } from 'mongoose';

export interface IConnector extends Document {
  connectorId: string; // e.g. 'gmail', 'slack', 'github'
  slug: string;
  name: string;
  displayName: string;
  description: string;
  provider: string;
  categoryId: string; // e.g. 'communication', 'jobs'
  icon: string;
  website?: string;
  documentationUrl?: string;
  version: string;
  sdkVersion: string;
  status: 'draft' | 'testing' | 'published' | 'disabled' | 'deprecated';
  enabled: boolean;
  isSystemConnector: boolean;
  isPremium: boolean;
  runtimeType: 'http' | 'oauth_api' | 'sdk' | 'database' | 'browser' | 'webhook' | 'polling' | 'ai' | 'built_in' | 'adapter';
  adapterType?: string;
  tags: string[];
  capabilities: string[];
  limitations?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorSchema = new Schema<IConnector>(
  {
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
  },
  { timestamps: true }
);

export const ConnectorModel = model<IConnector>('Connector', ConnectorSchema, 'connectors');
