import { Schema, Document } from 'mongoose';
export type ConversationChannel = 'whatsapp' | 'telegram' | 'slack' | 'email' | 'sms';
export type ConversationStatus = 'active' | 'closed' | 'paused';
export interface IWAConversation extends Document {
    automationId: Schema.Types.ObjectId;
    organizationId: Schema.Types.ObjectId;
    channel: ConversationChannel;
    externalUserId: string;
    status: ConversationStatus;
    messageCount: number;
    lastMessageAt: Date;
    openedAt: Date;
    closedAt?: Date;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WAConversationModel: import("mongoose").Model<IWAConversation, {}, {}, {}, Document<unknown, {}, IWAConversation, {}, {}> & IWAConversation & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
