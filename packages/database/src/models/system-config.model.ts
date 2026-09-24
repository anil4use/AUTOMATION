import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string;
  category: string;
  description?: string;
  value: any;
  isPublic: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>(
  {
    key: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, default: 'general', index: true },
    description: { type: String },
    value: { type: Schema.Types.Mixed, required: true },
    isPublic: { type: Boolean, default: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

export const SystemConfigModel =
  mongoose.models.SystemConfig || mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);
