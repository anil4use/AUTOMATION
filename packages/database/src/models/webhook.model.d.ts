import { Schema, Document } from 'mongoose';
export interface IWebhook extends Document {
    organizationId: Schema.Types.ObjectId;
    workflowId: Schema.Types.ObjectId;
    webhookId: string;
    secret: string;
    providerType: string;
    expiresAt?: Date;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
export declare const WebhookModel: import("mongoose").Model<IWebhook, {}, {}, {}, Document<unknown, {}, IWebhook, {}, {}> & IWebhook & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
