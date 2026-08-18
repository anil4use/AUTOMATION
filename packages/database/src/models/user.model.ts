import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  organizationId: Schema.Types.ObjectId;
  role: 'admin' | 'member';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    avatar: { type: String },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>('User', UserSchema);
