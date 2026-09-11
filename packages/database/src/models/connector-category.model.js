"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorCategoryModel = void 0;
const mongoose_1 = require("mongoose");
const ConnectorCategorySchema = new mongoose_1.Schema({
    categoryId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    displayName: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String },
    sortOrder: { type: Number, default: 0 },
}, { timestamps: true });
exports.ConnectorCategoryModel = (0, mongoose_1.model)('ConnectorCategory', ConnectorCategorySchema, 'connector_categories');
