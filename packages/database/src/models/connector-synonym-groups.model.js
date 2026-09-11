"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorSynonymGroupsModel = exports.ConnectorSynonymGroupModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorSynonymGroupSchema = new mongoose_1.Schema({
    groupName: { type: String, required: true, unique: true },
    semanticRole: { type: String, required: true, index: true },
    synonyms: { type: [String], default: [] },
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true, index: true },
}, { timestamps: true });
exports.ConnectorSynonymGroupModel = (0, mongoose_1.model)('ConnectorSynonymGroup', ConnectorSynonymGroupSchema, 'connector_synonym_groups');
exports.ConnectorSynonymGroupsModel = exports.ConnectorSynonymGroupModel;
