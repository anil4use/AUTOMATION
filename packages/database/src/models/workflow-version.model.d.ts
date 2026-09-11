import { Schema, Document } from 'mongoose';
export interface IWorkflowVersion extends Document {
    workflowId: Schema.Types.ObjectId;
    organizationId: Schema.Types.ObjectId;
    version: number;
    status: 'draft' | 'published' | 'archived';
    nodes: any[];
    edges: any[];
    trigger: any;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WorkflowVersionModel: import("mongoose").Model<IWorkflowVersion, {}, {}, {}, Document<unknown, {}, IWorkflowVersion, {}, {}> & IWorkflowVersion & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
