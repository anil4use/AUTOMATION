import { Schema, Document } from 'mongoose';
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
export declare const UserModel: import("mongoose").Model<IUser, {}, {}, {}, Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
