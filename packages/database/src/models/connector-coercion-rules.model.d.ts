import { Document } from 'mongoose';
/**
 * connector_coercion_rules
 *
 * Stores type conversion rules as data, not code.
 * When source field has sourceRole+sourceFormat and target has targetRole+targetFormat,
 * the TypeCoercer applies the named coercionMethod automatically.
 *
 * These rules are UNIVERSAL — they apply across all connectors.
 * Seeded by: packages/database/src/seeds/seed-coercion-rules.ts
 * Adding a new coercion rule = insert a document. Zero code change.
 */
export interface IConnectorCoercionRule extends Document {
    ruleId: string;
    sourceRole: string | null;
    sourceFormat: string | null;
    targetRole: string | null;
    targetFormat: string | null;
    coercionMethod: string;
    name: string;
    description: string;
    example: {
        input: any;
        output: any;
    };
    priority: number;
    enabled: boolean;
}
export declare const ConnectorCoercionRuleModel: import("mongoose").Model<IConnectorCoercionRule, {}, {}, {}, Document<unknown, {}, IConnectorCoercionRule, {}, {}> & IConnectorCoercionRule & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const ConnectorCoercionRulesModel: import("mongoose").Model<IConnectorCoercionRule, {}, {}, {}, Document<unknown, {}, IConnectorCoercionRule, {}, {}> & IConnectorCoercionRule & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
