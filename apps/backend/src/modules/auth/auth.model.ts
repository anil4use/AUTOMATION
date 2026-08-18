import { Schema, model, Document } from 'mongoose';

export interface IAuthUserDoc extends Document {
  email: string;
  passwordHash: string;
  name: string;
  organizationId: Schema.Types.ObjectId;
  role: 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

const AuthUserSchema = new Schema<IAuthUserDoc>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
  },
  { timestamps: true }
);

export const AuthUserModel = model<IAuthUserDoc>('AuthUser', AuthUserSchema);
