import { Schema, Document } from 'mongoose';
export type MessageRole = 'user' | 'agent';
export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'location' | 'sticker' | 'video';
export interface IWAMessage extends Document {
    conversationId: Schema.Types.ObjectId;
    organizationId: Schema.Types.ObjectId;
    role: MessageRole;
    type: MessageType;
    content: string;
    normalizedMessage: Record<string, any>;
    platformMessageId?: string;
    timestamp: Date;
    createdAt: Date;
}
export declare const WAMessageModel: import("mongoose").Model<IWAMessage, {}, {}, {}, Document<unknown, {}, IWAMessage, {}, {}> & IWAMessage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
