import { Document } from 'mongoose';
export interface IConnector extends Document {
    connectorId: string;
    slug: string;
    name: string;
    displayName: string;
    description: string;
    provider: string;
    categoryId: string;
    icon: string;
    website?: string;
    documentationUrl?: string;
    version: string;
    sdkVersion: string;
    status: 'draft' | 'testing' | 'published' | 'disabled' | 'deprecated';
    enabled: boolean;
    isSystemConnector: boolean;
    isPremium: boolean;
    runtimeType: 'http' | 'oauth_api' | 'sdk' | 'database' | 'browser' | 'webhook' | 'polling' | 'ai' | 'built_in' | 'adapter';
    adapterType?: string;
    tags: string[];
    capabilities: string[];
    limitations?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorModel: import("mongoose").Model<IConnector, {}, {}, {}, Document<unknown, {}, IConnector, {}, {}> & IConnector & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
