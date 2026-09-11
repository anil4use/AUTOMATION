import { Document } from 'mongoose';
/**
 * connector_synonym_groups
 *
 * Groups of field key names that mean the SAME THING across connectors.
 * The SemanticFieldMatcher uses these to find matching fields when exact
 * key names differ.
 *
 * Example: "text", "body", "content", "message_text", "bodyPlain" all mean
 * the same thing — the main text/content field.
 *
 * These are UNIVERSAL — apply across all connectors.
 * Seeded by: packages/database/src/seeds/seed-synonym-groups.ts
 * Adding new synonyms = update a document. Zero code change.
 */
export interface IConnectorSynonymGroup extends Document {
    groupName: string;
    semanticRole: string;
    synonyms: string[];
    description: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorSynonymGroupModel: import("mongoose").Model<IConnectorSynonymGroup, {}, {}, {}, Document<unknown, {}, IConnectorSynonymGroup, {}, {}> & IConnectorSynonymGroup & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const ConnectorSynonymGroupsModel: import("mongoose").Model<IConnectorSynonymGroup, {}, {}, {}, Document<unknown, {}, IConnectorSynonymGroup, {}, {}> & IConnectorSynonymGroup & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
