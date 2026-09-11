import mongoose, { Schema, model, Document } from 'mongoose';

export interface IConnectorCategory extends Document {
  categoryId: string; // e.g. 'communication', 'jobs', 'productivity', 'ai'
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectorCategorySchema = new Schema<IConnectorCategory>(
  {
    categoryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ConnectorCategoryModel =
  mongoose.models.ConnectorCategory ||
  model<IConnectorCategory>(
    'ConnectorCategory',
    ConnectorCategorySchema,
    'connector_categories'
  );
