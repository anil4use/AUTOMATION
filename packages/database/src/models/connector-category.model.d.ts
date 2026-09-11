import { Document } from 'mongoose';
export interface IConnectorCategory extends Document {
    categoryId: string;
    name: string;
    displayName: string;
    description: string;
    icon?: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorCategoryModel: import("mongoose").Model<IConnectorCategory, {}, {}, {}, Document<unknown, {}, IConnectorCategory, {}, {}> & IConnectorCategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
