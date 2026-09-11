"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./connection"), exports);
__exportStar(require("./models/user.model"), exports);
__exportStar(require("./models/organization.model"), exports);
__exportStar(require("./models/workflow.model"), exports);
__exportStar(require("./models/connection.model"), exports);
__exportStar(require("./models/execution-log.model"), exports);
__exportStar(require("./models/usage.model"), exports);
__exportStar(require("./models/ai-chat.model"), exports);
// Conversational Agent Models
__exportStar(require("./models/whatsapp-automation.model"), exports);
__exportStar(require("./models/wa-conversation.model"), exports);
__exportStar(require("./models/wa-message.model"), exports);
__exportStar(require("./models/user-memory.model"), exports);
__exportStar(require("./models/workflow-version.model"), exports);
__exportStar(require("./models/webhook.model"), exports);
__exportStar(require("./models/agent-conversation.model"), exports);
// V2 Connector Platform & Capability Registry Models
__exportStar(require("./models/connector-category.model"), exports);
__exportStar(require("./models/connector.model"), exports);
__exportStar(require("./models/connector-action.model"), exports);
__exportStar(require("./models/connector-auth.model"), exports);
__exportStar(require("./models/connector-feature.model"), exports);
__exportStar(require("./models/connector-test.model"), exports);
// Smart Data Mapping & AI Bridge — Knowledge Base Collections
// These are database-driven so adding 1000+ connectors never requires code changes.
// See: docs/features/11_database_collections.md
__exportStar(require("./models/connector-field-catalog.model"), exports);
__exportStar(require("./models/connector-coercion-rules.model"), exports);
__exportStar(require("./models/connector-synonym-groups.model"), exports);
