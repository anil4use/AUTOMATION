"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    organizationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    avatar: { type: String },
}, { timestamps: true });
exports.UserModel = (0, mongoose_1.model)('User', UserSchema);
