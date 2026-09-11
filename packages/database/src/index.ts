export * from './connection';
export * from './models/user.model';
export * from './models/organization.model';
export * from './models/workflow.model';
export * from './models/connection.model';
export * from './models/execution-log.model';
export * from './models/usage.model';
export * from './models/ai-chat.model';

// Conversational Agent Models
export * from './models/whatsapp-automation.model';
export * from './models/wa-conversation.model';
export * from './models/wa-message.model';
export * from './models/user-memory.model';
export * from './models/workflow-version.model';
export * from './models/webhook.model';
export * from './models/agent-conversation.model';

// V2 Connector Platform & Capability Registry Models
export * from './models/connector-category.model';
export * from './models/connector.model';
export * from './models/connector-action.model';
export * from './models/connector-auth.model';
export * from './models/connector-feature.model';
export * from './models/connector-test.model';

// Smart Data Mapping & AI Bridge — Knowledge Base Collections
// These are database-driven so adding 1000+ connectors never requires code changes.
// See: docs/features/11_database_collections.md
export * from './models/connector-field-catalog.model';
export * from './models/connector-coercion-rules.model';
export * from './models/connector-synonym-groups.model';



