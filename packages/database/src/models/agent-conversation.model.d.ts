import { Schema, Document } from 'mongoose';
export interface IAgentChatMessage {
    id: string;
    role: 'user' | 'agent' | 'system';
    content: string;
    executionPlan?: any;
    stepsExecuted?: any[];
    timestamp?: Date;
}
export interface IPendingConfirmation {
    confirmationId: string;
    confirmationMessage: string;
    plan: any;
    contextMap: any;
    pausedStepIndex: number;
    expiresAt: Date;
}
export interface IAgentConversation extends Document {
    conversationId: string;
    organizationId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    title: string;
    status: 'active' | 'awaiting_confirmation' | 'completed';
    pendingConfirmation?: IPendingConfirmation;
    messages: IAgentChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const AgentConversationModel: import("mongoose").Model<IAgentConversation, {}, {}, {}, Document<unknown, {}, IAgentConversation, {}, {}> & IAgentConversation & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
