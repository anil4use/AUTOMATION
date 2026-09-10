import { Schema, model, Document } from 'mongoose';

export interface IConnectorAuthField {
  key: string;
  label: string;
  type: 'string' | 'password' | 'textarea' | 'number' | 'boolean';
  required: boolean;
  placeholder?: string;
  help?: string;
  docUrl?: string;
}

export interface IConnectorAuthSetupGuide {
  summary: string;
  steps: string[];
  redirectUriRequirement?: string;
}

export interface IConnectorAuth extends Document {
  authenticationId: string;
  connectorId: string;
  type: 'oauth2' | 'oauth2_pkce' | 'api_key' | 'bearer_token' | 'basic_auth' | 'connection_string' | 'none';
  name: string;
  description: string;
  recommended: boolean;
  providerConsoleUrl?: string;
  setupGuide?: IConnectorAuthSetupGuide;
  fields: IConnectorAuthField[];
  scopes?: string[];
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshTokenSupported: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorAuthSchema = new Schema<IConnectorAuth>(
  {
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
  },
  { timestamps: true }
);

export const ConnectorAuthModel = model<IConnectorAuth>(
  'ConnectorAuth',
  ConnectorAuthSchema,
  'connector_authentications'
);
