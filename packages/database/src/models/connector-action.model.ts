import { Schema, model, Document } from 'mongoose';

export interface IConnectorAction extends Document {
  connectorId: string;
  actionId: string; // e.g. 'send_email', 'create_issue'
  version: string;
  name: string;
  description: string;
  type: 'action' | 'search' | 'trigger';
  semanticType:
    | 'create'
    | 'read'
    | 'get'
    | 'update'
    | 'delete'
    | 'search'
    | 'list'
    | 'send'
    | 'receive'
    | 'upload'
    | 'download'
    | 'execute'
    | 'analyze';
  executionType: 'http' | 'adapter' | 'database' | 'browser' | 'ai';
  adapterMethod?: string;
  httpConfig?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    urlTemplate: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    bodyTemplate?: any;
  };
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
  capabilities: string[];
  authenticationId?: string;
  destructive: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorActionSchema = new Schema<IConnectorAction>(
  {
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
      headers: { type: Schema.Types.Mixed },
      queryParams: { type: Schema.Types.Mixed },
      bodyTemplate: { type: Schema.Types.Mixed },
    },
    inputSchema: { type: Schema.Types.Mixed, default: { type: 'object', properties: {} } },
    outputSchema: { type: Schema.Types.Mixed, default: { type: 'object', properties: {} } },
    capabilities: [{ type: String }],
    authenticationId: { type: String },
    destructive: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ConnectorActionSchema.index({ connectorId: 1, actionId: 1 }, { unique: true });

export const ConnectorActionModel = model<IConnectorAction>(
  'ConnectorAction',
  ConnectorActionSchema,
  'connector_actions'
);
