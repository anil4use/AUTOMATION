import { Schema, model, Document } from 'mongoose';

export interface IUserProfileDoc extends Document {
  email: string;
  name: string;
  organizationId: Schema.Types.ObjectId;
  role: 'admin' | 'member';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfileDoc>(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    avatar: { type: String },
  },
  { timestamps: true }
);

export const UserProfileModel = model<IUserProfileDoc>('UserProfile', UserProfileSchema);
