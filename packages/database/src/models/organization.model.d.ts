import { Document } from 'mongoose';
export interface IOrganization extends Document {
    name: string;
    slug: string;
    plan: 'free' | 'pro' | 'enterprise';
    stripeCustomerId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const OrganizationModel: import("mongoose").Model<IOrganization, {}, {}, {}, Document<unknown, {}, IOrganization, {}, {}> & IOrganization & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
