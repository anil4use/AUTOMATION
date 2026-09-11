import { Schema, Document } from 'mongoose';
export interface IMemoryFact {
    key: string;
    value: any;
    confidence: number;
    source: 'extracted' | 'explicit' | 'inferred';
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}
export interface IUserMemoryProfile {
    name?: string;
    timezone?: string;
    language?: string;
    [key: string]: any;
}
export interface IUserMemory extends Document {
    organizationId: Schema.Types.ObjectId;
    automationId: Schema.Types.ObjectId;
    channel: string;
    externalUserId: string;
    profile: IUserMemoryProfile;
    facts: IMemoryFact[];
    shortTermSummary?: string;
    totalConversations: number;
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserMemoryModel: import("mongoose").Model<IUserMemory, {}, {}, {}, Document<unknown, {}, IUserMemory, {}, {}> & IUserMemory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
