import { Schema, Document } from 'mongoose';
export type AgentModelProvider = 'gemini' | 'groq' | 'openai';
export interface IWhatsAppAutomation extends Document {
    organizationId: Schema.Types.ObjectId;
    creatorId: Schema.Types.ObjectId;
    name: string;
    description?: string;
    enabled: boolean;
    whatsappPhoneNumberId: string;
    whatsappBusinessAccountId?: string;
    encryptedAccessToken: string;
    verifyToken: string;
    agentModel: AgentModelProvider;
    agentPersonality: string;
    allowedUsers?: string[];
    blockedUsers?: string[];
    allowGroupConversations?: boolean;
    conversationTimeoutMinutes?: number;
    maxHistoryMessages?: number;
    enableLongTermMemory?: boolean;
    memoryExtractionEnabled?: boolean;
    memoryExtractionAfterEveryN?: number;
    typingSimulationEnabled?: boolean;
    responseDelayMs?: number;
    journeyId?: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WhatsAppAutomationModel: import("mongoose").Model<IWhatsAppAutomation, {}, {}, {}, Document<unknown, {}, IWhatsAppAutomation, {}, {}> & IWhatsAppAutomation & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
