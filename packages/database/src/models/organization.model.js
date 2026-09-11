"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationModel = void 0;
const mongoose_1 = require("mongoose");
const OrganizationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    stripeCustomerId: { type: String },
}, { timestamps: true });
exports.OrganizationModel = (0, mongoose_1.model)('Organization', OrganizationSchema);
