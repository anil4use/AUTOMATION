import { Schema, Document } from 'mongoose';
export interface IExecutionLog extends Document {
    workflowId: Schema.Types.ObjectId;
    organizationId: Schema.Types.ObjectId;
    triggeredBy: string;
    triggeredByUserId?: string;
    status: string;
    triggerPayload: Record<string, any>;
    steps: any[];
    nodeResults: Record<string, any>;
    summary: {
        totalSteps: number;
        completedSteps: number;
        failedSteps: number;
        skippedSteps: number;
        totalDurationMs: number;
        aiCallsCount: number;
        aiCacheHitsCount: number;
        estimatedAiCostUsd: number;
        dataTransformed: boolean;
        sanitizationEvents: number;
        retryCount: number;
    };
    error?: string;
    startedAt: Date;
    completedAt?: Date;
}
export declare const ExecutionLogModel: import("mongoose").Model<IExecutionLog, {}, {}, {}, Document<unknown, {}, IExecutionLog, {}, {}> & IExecutionLog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
