import { Document } from 'mongoose';
export interface IConnectorAction extends Document {
    connectorId: string;
    actionId: string;
    version: string;
    name: string;
    description: string;
    type: 'action' | 'search' | 'trigger';
    semanticType: 'create' | 'read' | 'get' | 'update' | 'delete' | 'search' | 'list' | 'send' | 'receive' | 'upload' | 'download' | 'execute' | 'analyze';
    executionType: 'http' | 'adapter' | 'database' | 'browser' | 'ai';
    adapterMethod?: string;
    httpConfig?: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        urlTemplate: string;
        headers?: Record<string, string>;
        queryParams?: Record<string, string>;
        bodyTemplate?: any;
    };
    inputSchema: Record<string, any>;
    uiSchema?: Record<string, any>;
    outputSchema: Record<string, any>;
    capabilities: string[];
    authenticationId?: string;
    destructive: boolean;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorActionModel: import("mongoose").Model<IConnectorAction, {}, {}, {}, Document<unknown, {}, IConnectorAction, {}, {}> & IConnectorAction & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
