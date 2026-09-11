import { Schema, Document } from 'mongoose';
export interface IUsage extends Document {
    organizationId: Schema.Types.ObjectId;
    period: string;
    taskExecutionsCount: number;
    aiGenerationsCount: number;
    activeWorkflowsCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UsageModel: import("mongoose").Model<IUsage, {}, {}, {}, Document<unknown, {}, IUsage, {}, {}> & IUsage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
