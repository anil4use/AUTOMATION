"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorCoercionRulesModel = exports.ConnectorCoercionRuleModel = void 0;
const mongoose_1 = require("mongoose");
const CoercionExampleSchema = new mongoose_1.Schema({ input: mongoose_1.Schema.Types.Mixed, output: mongoose_1.Schema.Types.Mixed }, { _id: false });
const ConnectorCoercionRuleSchema = new mongoose_1.Schema({
    ruleId: { type: String, required: true, unique: true },
    sourceRole: { type: String, default: null },
    sourceFormat: { type: String, default: null },
    targetRole: { type: String, default: null },
    targetFormat: { type: String, default: null },
    coercionMethod: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    example: { type: CoercionExampleSchema, default: {} },
    priority: { type: Number, default: 0, index: true },
    enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });
ConnectorCoercionRuleSchema.index({ sourceRole: 1, sourceFormat: 1, targetRole: 1, targetFormat: 1 });
ConnectorCoercionRuleSchema.index({ priority: -1, enabled: 1 });
exports.ConnectorCoercionRuleModel = (0, mongoose_1.model)('ConnectorCoercionRule', ConnectorCoercionRuleSchema, 'connector_coercion_rules');
exports.ConnectorCoercionRulesModel = exports.ConnectorCoercionRuleModel;
