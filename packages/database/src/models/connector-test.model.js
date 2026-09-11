"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorTestDefinitionModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorTestDefinitionSchema = new mongoose_1.Schema({
    testId: { type: String, required: true, unique: true, index: true },
    connectorId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    actionId: { type: String, required: true },
    sampleInput: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    expectedOutputKeys: [{ type: String }],
    enabled: { type: Boolean, default: true },
}, { timestamps: true });
exports.ConnectorTestDefinitionModel = (0, mongoose_1.model)('ConnectorTestDefinition', ConnectorTestDefinitionSchema, 'connector_test_definitions');
