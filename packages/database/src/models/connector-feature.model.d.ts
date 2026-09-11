import { Document } from 'mongoose';
export interface IConnectorFeature extends Document {
    connectorId: string;
    featureId: string;
    name: string;
    category: string;
    status: 'SUPPORTED' | 'NOT_SUPPORTED' | 'REQUIRES_PROVIDER_APPROVAL' | 'CUSTOM_IMPLEMENTATION_REQUIRED' | 'DEPRECATED' | 'EXPERIMENTAL';
    documentationUrl?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorFeatureModel: import("mongoose").Model<IConnectorFeature, {}, {}, {}, Document<unknown, {}, IConnectorFeature, {}, {}> & IConnectorFeature & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
