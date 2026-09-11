"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
async function connectDatabase(uri) {
    try {
        const conn = await mongoose_1.default.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`[MongoDB] Connected successfully to ${conn.connection.host}`);
        return conn;
    }
    catch (error) {
        console.error('[MongoDB] Connection error:', error);
        throw error;
    }
}
