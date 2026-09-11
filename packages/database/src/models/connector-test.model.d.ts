import { Document } from 'mongoose';
export interface IConnectorTestDefinition extends Document {
    testId: string;
    connectorId: string;
    name: string;
    actionId: string;
    sampleInput: Record<string, any>;
    expectedOutputKeys: string[];
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorTestDefinitionModel: import("mongoose").Model<IConnectorTestDefinition, {}, {}, {}, Document<unknown, {}, IConnectorTestDefinition, {}, {}> & IConnectorTestDefinition & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
