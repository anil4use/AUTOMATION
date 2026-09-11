import { Document } from 'mongoose';
/**
 * connector_field_catalog
 *
 * Stores the semantic meaning of every input/output field for every
 * operation across every connector. The AI Data Bridge and TypeCoercer
 * query this collection at runtime — NOT hardcoded TypeScript.
 *
 * Seeded by: packages/database/src/seeds/seed-field-catalog.ts
 * Admin API: PATCH /api/v1/admin/field-catalog/:id
 */
export interface IConnectorFieldCatalog extends Document {
    connectorId: string;
    operationId: string;
    operationType: string;
    direction: string;
    fieldKey: string;
    fieldLabel: string;
    fieldType: string;
    required: boolean;
    semanticRole: string | null;
    format: string | null;
    synonyms: string[];
    transformHints: string[];
    notes: string;
    autoDetected: boolean;
    confidence: number;
    version: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ConnectorFieldCatalogModel: import("mongoose").Model<IConnectorFieldCatalog, {}, {}, {}, Document<unknown, {}, IConnectorFieldCatalog, {}, {}> & IConnectorFieldCatalog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
