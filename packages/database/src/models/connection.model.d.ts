import { Schema, Document } from 'mongoose';
export interface IConnection extends Document {
    organizationId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    connectorId: string;
    name: string;
    label?: string;
    accountEmail?: string;
    environmentTag?: 'local' | 'development' | 'staging' | 'beta' | 'production';
    connectionMethod?: 'uri' | 'fields' | 'ssh_tunnel' | 'ssl' | 'socket' | 'read_replica';
    dbType?: string;
    allowedStatements?: string[];
    lastTestedAt?: Date;
    lastTestError?: string;
    authType: 'oauth2' | 'api_key' | 'webhook' | 'basic';
    encryptedCredentials: string;
    expiresAt?: Date;
    tokenExpiresAt?: Date;
    refreshToken?: string;
    lastRefreshedAt?: Date;
    lastRefreshError?: string;
    pollingCursor?: Record<string, any>;
    status: 'connected' | 'active' | 'expired' | 'refresh_failed' | 'error' | 'pending_auth';
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectionModel: import("mongoose").Model<IConnection, {}, {}, {}, Document<unknown, {}, IConnection, {}, {}> & IConnection & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
