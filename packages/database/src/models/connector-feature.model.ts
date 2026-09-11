import mongoose, { Schema, model, Document } from 'mongoose';

export interface IConnectorFeature extends Document {
  connectorId: string;
  featureId: string;
  name: string;
  category: string;
  status:
    | 'SUPPORTED'
    | 'NOT_SUPPORTED'
    | 'REQUIRES_PROVIDER_APPROVAL'
    | 'CUSTOM_IMPLEMENTATION_REQUIRED'
    | 'DEPRECATED'
    | 'EXPERIMENTAL';
  documentationUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorFeatureSchema = new Schema<IConnectorFeature>(
  {
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
  },
  { timestamps: true }
);

ConnectorFeatureSchema.index({ connectorId: 1, featureId: 1 }, { unique: true });

export const ConnectorFeatureModel =
  mongoose.models.ConnectorFeature ||
  model<IConnectorFeature>(
    'ConnectorFeature',
    ConnectorFeatureSchema,
    'connector_features'
  );
