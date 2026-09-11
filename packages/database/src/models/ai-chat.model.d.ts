import { Schema, Document } from 'mongoose';
export interface IAIChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    isGreeting?: boolean;
    suggestedConnectors?: string[];
    userConnectionsStatus?: any[];
    workflowDraft?: any;
    createdAt?: Date;
}
export interface IAIChat extends Document {
    organizationId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    messages: IAIChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const AIChatModel: import("mongoose").Model<IAIChat, {}, {}, {}, Document<unknown, {}, IAIChat, {}, {}> & IAIChat & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
