import { Document } from 'mongoose';
export interface IConnectorAuthField {
    key: string;
    label: string;
    type: 'string' | 'password' | 'textarea' | 'number' | 'boolean';
    required: boolean;
    placeholder?: string;
    help?: string;
    docUrl?: string;
}
export interface IConnectorAuthSetupGuide {
    summary: string;
    steps: string[];
    redirectUriRequirement?: string;
}
export interface IConnectorAuth extends Document {
    authenticationId: string;
    connectorId: string;
    type: 'oauth2' | 'oauth2_pkce' | 'api_key' | 'bearer_token' | 'basic_auth' | 'connection_string' | 'none';
    name: string;
    description: string;
    recommended: boolean;
    providerConsoleUrl?: string;
    setupGuide?: IConnectorAuthSetupGuide;
    fields: IConnectorAuthField[];
    scopes?: string[];
    authorizationUrl?: string;
    tokenUrl?: string;
    refreshTokenSupported: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorAuthModel: import("mongoose").Model<IConnectorAuth, {}, {}, {}, Document<unknown, {}, IConnectorAuth, {}, {}> & IConnectorAuth & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
