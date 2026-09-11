import { Schema, Document } from 'mongoose';
export interface IWorkflow extends Document {
    organizationId: Schema.Types.ObjectId;
    creatorId: Schema.Types.ObjectId;
    name: string;
    description?: string;
    status: 'draft' | 'active' | 'paused' | 'archived';
    version: number;
    environment: 'dev' | 'staging' | 'prod';
    definition: {
        nodes: Array<any>;
        edges: Array<any>;
    };
    triggerState?: {
        pollingCursor?: string;
        lastPolledAt?: Date;
        webhookId?: string;
        providerHookId?: string;
        slackSharedEndpoint?: boolean;
        devFallbackPolling?: boolean;
    };
    history?: Array<{
        version: number;
        definition: any;
        savedAt: Date;
    }>;
    isAiGenerated: boolean;
    aiPrompt?: string;
    lastExecutedAt?: Date;
    executionCount?: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WorkflowModel: import("mongoose").Model<IWorkflow, {}, {}, {}, Document<unknown, {}, IWorkflow, {}, {}> & IWorkflow & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
