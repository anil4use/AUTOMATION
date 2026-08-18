import { Schema, model, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    stripeCustomerId: { type: String },
  },
  { timestamps: true }
);

export const OrganizationModel = model<IOrganization>('Organization', OrganizationSchema);
