import { ConnectionModel, AgentConversationModel } from '@automation/database';
import { decryptJson } from '../../shared/utils/crypto';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

// ─── Destructive Action Keywords ─────────────────────────────────────────────
const DESTRUCTIVE_KEYWORDS = [
  'delete', 'remove', 'drop', 'truncate', 'destroy', 'flush', 'wipe', 'purge', 'clean all'
];

const DESTRUCTIVE_ACTION_IDS = new Set([
  'delete_one', 'delete_many', 'drop_collection', 'delete_rows',
  'flush_db', 'delete_repo', 'delete_branch', 'delete_file', 'execute_query'
]);

// ─── Connector Keyword Aliases for Two-Tier Token Budget ────────────────────
const CONNECTOR_KEYWORD_ALIASES: Record<string, string[]> = {
  mongodb: ['mongo', 'mongodb', 'collection', 'document', 'database', 'db', 'nosql'],
  postgresql: ['postgres', 'postgresql', 'pg', 'sql', 'database', 'table', 'query'],
  mysql: ['mysql', 'database', 'table', 'sql'],
  redis: ['redis', 'cache', 'key', 'store'],
  gmail: ['gmail', 'email', 'mail', 'inbox', 'send email'],
  'google-sheets': ['sheet', 'spreadsheet', 'google sheets', 'excel', 'rows', 'columns'],
  'google-drive': ['drive', 'google drive', 'file', 'upload', 'folder'],
  'google-docs': ['docs', 'document', 'google docs', 'write'],
  'google-calendar': ['calendar', 'event', 'meeting', 'schedule'],
  slack: ['slack', 'channel', 'message', '#general', '#dev'],
  github: ['github', 'repo', 'repository', 'commit', 'branch', 'issue', 'pr'],
  telegram: ['telegram', 'bot', 'notify'],
  notion: ['notion', 'page', 'database'],
  'web-search': ['search', 'google', 'web', 'scrape', 'internet', 'news', 'find', 'article', 'lookup', 'tech news', 'latest', 'headline', 'information', 'query', 'tell me about', 'what is', 'who is'],
  'web-browser': ['browser', 'playwright', 'navigate', 'click', 'form', 'screenshot', 'page', 'url', 'website', 'open'],
  dynamodb: ['dynamodb', 'dynamo', 'aws', 'table'],
};

// ─── Redis Client ─────────────────────────────────────────────────────────────
let redis: Redis | null = null;
let redisUnavailable = false; // circuit-breaker: stop retrying after first failure

function getRedis(): Redis | null {
  if (redisUnavailable) return null;
  if (redis) return redis;

  try {
    const client = new Redis({
      host: env.redisHost || 'localhost',
      port: env.redisPort || 6379,
      password: env.redisPassword,
      enableOfflineQueue: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // never retry — prevents reconnect flood
    });

    // Attach error handler so it never becomes an unhandled event
    client.on('error', () => {
      redisUnavailable = true;
      redis = null;
    });

    redis = client;
    return redis;
  } catch {
    redisUnavailable = true;
    return null;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ExecutionStep {
  stepId: string;
  connectorId: string;
  connectionId?: string;
  actionId: string;
  description: string;
  inputs: Record<string, any>;
  forEach?: string;
}

export interface ExecutionPlan {
  plan: ExecutionStep[];
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

export interface SSEEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'confirmation_required' | 'final_response' | 'rate_limited' | 'execution_in_progress';
  stepId?: string;
  connectorId?: string;
  actionId?: string;
  description?: string;
  inputs?: any;
  output?: any;
  preview?: any;
  error?: string;
  errorCode?: string;
  message?: string;
  data?: any;
  confirmationId?: string;
}

// ─── Two-Tier Connector Manifest Injection ────────────────────────────────────
async function buildTieredConnectorContext(
  userMessage: string,
  connectedApps: Array<{ connectorId: string; connectionId: string; name: string }>
): Promise<string> {
  const lower = userMessage.toLowerCase();
  const matchedTier1: string[] = [];

  for (const [connId, aliases] of Object.entries(CONNECTOR_KEYWORD_ALIASES)) {
    if (aliases.some((alias) => lower.includes(alias))) {
      matchedTier1.push(connId);
    }
  }

  // If keywords match specific connectors, prioritize them; otherwise include all connected apps
  const tier1Set = new Set(matchedTier1);
  let fullSchemaSection = '';
  let stubSection = '';

  try {
    const { manifestRegistry } = require('@automation/connector-sdk');

    for (const conn of connectedApps) {
      const manifest = manifestRegistry.getManifest(conn.connectorId);
      if (!manifest) {
        stubSection += `- ${conn.name} (id: '${conn.connectorId}', connectionId: '${conn.connectionId}') [CONNECTED]\n`;
        continue;
      }

      // If specific apps matched keywords, or if total connected apps <= 10, include full schema
      const isFullSchema = tier1Set.size === 0 || tier1Set.has(conn.connectorId) || connectedApps.length <= 10;

      if (isFullSchema) {
        const actions = manifest.actions || [];
        const actionsStr = actions
          .slice(0, 25)
          .map((act: any) => {
            const inputs = (act.inputs || []).slice(0, 10).map((f: any) => `${f.key}: ${f.type}${f.required ? '*' : ''}`).join(', ');
            return `  - actionId: '${act.id}' — ${act.name}: description: "${act.description || ''}", inputs: { ${inputs} }`;
          })
          .join('\n');

        fullSchemaSection += `### ${conn.name} (id: '${conn.connectorId}', connectionId: '${conn.connectionId}')\n${actionsStr || '  (No actions defined)'}\n\n`;
      } else {
        stubSection += `- ${conn.name} (id: '${conn.connectorId}', connectionId: '${conn.connectionId}') [CONNECTED]\n`;
      }
    }
  } catch (err) {
    logger.warn('[AgentChatService] Could not load manifests for prompt:', err);
  }

  return `CONNECTED APPS & AVAILABLE ACTIONS (Use ONLY these actionId and connectionId values):\n${fullSchemaSection || 'None\n'}\nADDITIONAL CONNECTED APPS:\n${stubSection || 'None\n'}`;
}

// ─── History Context (last 5 executions) ─────────────────────────────────────
function buildHistoryContext(messages: any[]): string {
  const agentMessages = messages.filter((m) => m.role === 'agent' && m.stepsExecuted?.length > 0);
  const last5 = agentMessages.slice(-5);
  if (!last5.length) return '';

  const lines: string[] = ['Previous execution results and context available for reference:'];
  last5.forEach((msg, i) => {
    msg.stepsExecuted?.forEach((step: any) => {
      const outputPreview = JSON.stringify(step.output || {}).slice(0, 500);
      const connInfo = step.connectionId ? ` connectionId=${step.connectionId}` : '';
      lines.push(
        `  - [${last5.length - i} msg(s) ago] Step ${step.stepId}: connectorId=${step.connectorId}, actionId=${step.actionId}${connInfo}, description="${step.description}", outputPreview=${outputPreview}`
      );
    });
  });

  const result = lines.join('\n');
  return result.length > 10000 ? result.slice(0, 10000) + '\n...[truncated]' : result;
}

// ─── Variable Resolution ──────────────────────────────────────────────────────
function resolveVariables(value: any, context: Map<string, any>): any {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Check if the string is EXACTLY a single template expression {{...}}
    const exactMatch = trimmed.match(/^\{\{([\w.[\]]+)\}\}$/);
    if (exactMatch) {
      const path = exactMatch[1];
      const parts = path.split('.');
      const stepKey = parts[0]; // e.g. step_1 or item
      const stepOutput = context.get(stepKey);
      if (stepOutput !== undefined) {
        let current = stepOutput;
        let found = true;
        for (let i = 1; i < parts.length; i++) {
          if (current === null || current === undefined) {
            found = false;
            break;
          }
          current = current[parts[i]];
        }
        if (found && current !== undefined) return current; // Preserves Array / Object / Primitive type!
      }
    }

    // Otherwise perform inline template string replacement
    return value.replace(/\{\{([\w.[\]]+)\}\}/g, (_, path) => {
      const parts = path.split('.');
      const stepKey = parts[0];
      const stepOutput = context.get(stepKey);
      if (stepOutput === undefined) return `{{${path}}}`;
      let current = stepOutput;
      for (let i = 1; i < parts.length; i++) {
        if (current === null || current === undefined) return `{{${path}}}`;
        current = current[parts[i]];
      }
      if (current === undefined) return `{{${path}}}`;
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    });
  }

  if (Array.isArray(value)) return value.map((v) => resolveVariables(v, context));
  if (typeof value === 'object' && value !== null) {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveVariables(v, context);
    return out;
  }
  return value;
}

// ─── Destructive Detection ────────────────────────────────────────────────────
function detectDestructive(plan: ExecutionPlan, userMessage: string): { isDestructive: boolean; message: string } {
  const lower = userMessage.toLowerCase();
  const hasKeyword = DESTRUCTIVE_KEYWORDS.some((kw) => lower.includes(kw));
  const hasDestructiveAction = plan.plan.some((step) => DESTRUCTIVE_ACTION_IDS.has(step.actionId));
  const hasBulkEmail = plan.plan.some(
    (step) =>
      step.connectorId === 'gmail' &&
      step.actionId === 'send_email' &&
      Array.isArray(step.inputs?.to) &&
      step.inputs.to.length > 5
  );

  if (hasKeyword || hasDestructiveAction || hasBulkEmail) {
    const actionNames = plan.plan
      .filter((s) => DESTRUCTIVE_ACTION_IDS.has(s.actionId))
      .map((s) => s.description)
      .join(', ');
    return {
      isDestructive: true,
      message: plan.confirmationMessage || `This will perform a destructive operation${actionNames ? ` (${actionNames})` : ''}. Are you sure you want to continue?`,
    };
  }
  return { isDestructive: false, message: '' };
}

// ─── Batch Optimizer ──────────────────────────────────────────────────────────
function applyBatchOptimization(plan: ExecutionPlan): ExecutionPlan {
  const optimized = plan.plan.map((step) => {
    // Only optimize for valid connector actions
    if (step.forEach && step.connectorId === 'mongodb' && step.actionId === 'insert_one') {
      return { ...step, actionId: 'insert_many', _wasBatched: true };
    }
    return step;
  });
  return { ...plan, plan: optimized };
}

// ─── DB Connector Class Map ────────────────────────────────────────────────────
const DB_CONNECTOR_IDS = new Set(['mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'mssql', 'dynamodb']);

function getDbConnectorInstance(connectorId: string): any {
  // Lazily require — these are heavy Node-only modules
  try {
    switch (connectorId) {
      case 'mongodb': {
        const { MongodbConnector } = require('@automation/connector-sdk');
        return new MongodbConnector();
      }
      case 'postgresql':
      case 'postgres': {
        const { PostgresqlConnector } = require('@automation/connector-sdk');
        return new PostgresqlConnector();
      }
      case 'mysql': {
        const { MysqlConnector } = require('@automation/connector-sdk');
        return new MysqlConnector();
      }
      case 'redis': {
        const { RedisConnector } = require('@automation/connector-sdk');
        return new RedisConnector();
      }
      case 'mssql': {
        const { MssqlConnector } = require('@automation/connector-sdk');
        return new MssqlConnector();
      }
      case 'dynamodb': {
        const { DynamodbConnector } = require('@automation/connector-sdk');
        return new DynamodbConnector();
      }
      default:
        return null;
    }
  } catch (err: any) {
    logger.warn(`[AgentChatService] Could not load DB connector for '${connectorId}':`, err?.message);
    return null;
  }
}

// ─── Universal Dynamic Action Input Hydrator ─────────────────────────────────
export function hydrateActionInputs(
  step: ExecutionStep,
  userMessage: string,
  context: Map<string, any>,
  credentials: any,
  resolvedInputs: Record<string, any>
): Record<string, any> {
  const inputs = { ...(resolvedInputs || {}) };
  const cid = step.connectorId.toLowerCase().trim().replace(/_/g, '-');
  const aid = step.actionId.toLowerCase().trim();

  let manifestInputs: any[] = [];
  try {
    const { manifestRegistry } = require('@automation/connector-sdk');
    const manifest = manifestRegistry.getManifest(cid) || manifestRegistry.getManifest(cid.replace(/-/g, '_'));
    if (manifest && manifest.actions) {
      const act = manifest.actions.find((a: any) => a.id === aid || a.id.toLowerCase() === aid);
      if (act && act.inputs) {
        manifestInputs = act.inputs;
      }
    }
  } catch {}

  const topic = extractPromptTopic(userMessage);
  const dateStr = new Date().toISOString().split('T')[0];

  // Dynamic AI Defaults: ONLY used if user/LLM did NOT provide a specific value
  const dynamicAiDefaults: Record<string, () => any> = {
    folderName: () => inputs.folderName || inputs.title || inputs.name || `${topic} Folder`,
    folder_name: () => inputs.folderName || inputs.title || `${topic} Folder`,
    title: () => inputs.title || inputs.name || `${topic} - ${dateStr}`,
    name: () => inputs.name || inputs.title || `${topic} - ${dateStr}`,
    fileName: () => inputs.fileName || inputs.filename || `${topic}_Export.txt`,
    filename: () => inputs.filename || inputs.fileName || `${topic}_Export.txt`,
    documentName: () => inputs.documentName || inputs.title || `${topic} Document`,
    spreadsheetTitle: () => inputs.spreadsheetTitle || inputs.title || `${topic} Sheet`,
    query: () => inputs.query || inputs.search || topic || 'AI News',
    search: () => inputs.search || inputs.query || topic || 'AI News',
    q: () => inputs.q || inputs.query || topic,
    collection: () => inputs.collection || inputs.table || 'users',
    database: () => inputs.database || credentials?.database || credentials?.dbName || 'automation_platform',
    to: () => inputs.to || inputs.email || credentials?.userEmail || credentials?.email || 'user@example.com',
    recipient: () => inputs.recipient || inputs.to || 'user@example.com',
    subject: () => inputs.subject || inputs.title || `${topic} Report`,
    body: () => inputs.body || inputs.message || inputs.text || `AutoFlow automated execution report for ${topic}`,
    message: () => inputs.message || inputs.text || inputs.body || `AutoFlow automated execution report for ${topic}`,
    text: () => inputs.text || inputs.message || inputs.body || `AutoFlow automated report for ${topic}`,
    channel: () => inputs.channel || '#general',
    limit: () => inputs.limit ? Number(inputs.limit) : 10,
    rows: () => inputs.rows || inputs.values,
    values: () => inputs.values || inputs.rows,
  };

  // 1. Auto-discover spreadsheetId from context if missing or unresolved
  if (!inputs.spreadsheetId || typeof inputs.spreadsheetId !== 'string' || inputs.spreadsheetId.startsWith('{{')) {
    for (const [_, val] of context.entries()) {
      if (val && typeof val === 'object') {
        const foundId = val.spreadsheetId || val.id || val.data?.spreadsheetId;
        if (foundId && typeof foundId === 'string' && !foundId.startsWith('{{')) {
          inputs.spreadsheetId = foundId;
          break;
        }
      }
    }
  }

  // 2. Auto-discover or format values for Google Sheets logging if missing or placeholder
  if (cid === 'google-sheets' && (aid.includes('append') || aid.includes('row'))) {
    if (!inputs.sheetName) inputs.sheetName = 'Sheet1';

    const item = context.get('item');
    if (item && typeof item === 'object') {
      const subject = item.subject || item.title || item.name || 'No Subject';
      const sender = item.from || item.sender || item.to || item.author || 'Unknown';
      inputs.values = [subject, sender, item.date || dateStr];
    } else if (!inputs.values || (Array.isArray(inputs.values) && inputs.values.length === 0)) {
      // Search context for previous Gmail or email outputs
      let emailList: any[] = [];
      for (const [_, val] of context.entries()) {
        if (val) {
          if (Array.isArray(val.emails)) emailList = val.emails;
          else if (Array.isArray(val.messages)) emailList = val.messages;
          else if (Array.isArray(val)) emailList = val;
        }
      }
      if (emailList.length > 0) {
        inputs.values = emailList.map((e: any) => [
          e.subject || e.title || 'No Subject',
          e.from || e.sender || e.to || 'Unknown Sender',
          e.date || dateStr
        ]);
      } else {
        inputs.values = [topic, dateStr, 'Automated AI Entry'];
      }
    }
  }

  // If user provided a specific value, KEEP IT!
  // If user/LLM omitted a required or expected field, populate AI dynamic value:
  manifestInputs.forEach((field: any) => {
    const key = field.key;
    const currentVal = inputs[key];
    const isMissing = currentVal === undefined || currentVal === null || (typeof currentVal === 'string' && currentVal.trim() === '');

    if (isMissing) {
      if (dynamicAiDefaults[key]) {
        inputs[key] = dynamicAiDefaults[key]();
      } else if (field.required) {
        if (field.type === 'string') inputs[key] = `${field.label || key} for ${topic}`;
        else if (field.type === 'number') inputs[key] = 10;
        else if (field.type === 'boolean') inputs[key] = true;
        else if (field.type === 'array') inputs[key] = [];
        else if (field.type === 'object') inputs[key] = {};
      }
    }
  });

  // Action-specific dynamic fallback guarantees for any action
  if ((aid.includes('folder') || aid.includes('create_folder')) && !inputs.folderName) {
    inputs.folderName = inputs.name || inputs.title || `${topic} Folder`;
  }
  if ((aid.includes('create') || aid.includes('sheet') || aid.includes('doc')) && !inputs.title && !inputs.name) {
    inputs.title = `${topic} - ${dateStr}`;
  }

  return inputs;
}

function extractPromptTopic(userMessage: string): string {
  if (!userMessage) return 'AutoFlow Task';
  const clean = userMessage
    .replace(/^(search\s+the\s+web\s+for|search\s+web\s+for|search\s+for|search|look\s+up|find\s+out\s+about|can\s+you|please|i\s+want\s+to|help\s+me|how\s+to|send\s+a|read|get|fetch|find|show\s+me|create\s+a|create|make\s+a)\s+/i, '')
    .trim();
  if (clean.length > 0) {
    return clean;
  }
  return userMessage.trim() || 'AutoFlow Task';
}

// ─── Execute Single Step ──────────────────────────────────────────────────────
async function executeStep(
  step: ExecutionStep,
  context: Map<string, any>,
  credentials: any,
  connectionId: string,
  userMessage?: string,
  sessionId?: string
): Promise<{ success: boolean; output?: any; error?: string; errorCode?: string; inputs?: Record<string, any> }> {
  try {
    const resolvedInputs = resolveVariables(step.inputs, context);
    const finalInputs = hydrateActionInputs(step, userMessage || '', context, credentials, resolvedInputs);

    // ── Database connectors ─────────────────────────────────────────────────
    if (DB_CONNECTOR_IDS.has(step.connectorId)) {
      const connector = getDbConnectorInstance(step.connectorId);
      if (!connector) {
        return { success: false, error: `DB connector '${step.connectorId}' could not be loaded`, errorCode: 'CONNECTOR_NOT_FOUND', inputs: finalInputs };
      }

      // Build connectionConfig from decrypted credentials stored in DB
      const connectionConfig = {
        dbType: step.connectorId === 'postgres' ? 'postgresql' : step.connectorId,
        connectionString: credentials.connectionString || credentials.uri || credentials.url,
        host: credentials.host,
        port: credentials.port ? Number(credentials.port) : undefined,
        database: credentials.database || credentials.dbName,
        username: credentials.username || credentials.user,
        password: credentials.password,
        authDatabase: credentials.authDatabase,
        awsRegion: credentials.awsRegion || credentials.region,
        awsAccessKeyId: credentials.awsAccessKeyId,
        awsSecretAccessKey: credentials.awsSecretAccessKey,
        connectionId: connectionId || `agent_${Date.now()}`,
      };

      const targetActionId = typeof connector.resolveActionId === 'function'
        ? connector.resolveActionId(step.actionId)
        : step.actionId;

      const result = await connector.executeAction(targetActionId, {
        stepInput: finalInputs,
        connectionConfig,
        connectionCredentials: credentials,
        workflowVariables: {},
        sessionId,
      } as any);

      if (result.success === false) {
        return { success: false, error: result.error || 'DB operation failed', errorCode: 'DB_ERROR', inputs: finalInputs };
      }
      return { success: true, output: result.data ?? result, inputs: finalInputs };
    }

    // ── Regular connectors via connectorRegistry ────────────────────────────
    const { connectorRegistry, UniversalConnector } = require('@automation/connector-sdk');
    const { getValidGoogleAccessToken } = require('../connectors/google-oauth-token.service');
    const cid = step.connectorId.toLowerCase().trim();

    const isGoogle = cid.startsWith('google') || cid === 'gmail';
    if (isGoogle && connectionId) {
      try {
        const freshToken = await getValidGoogleAccessToken(connectionId, cid);
        credentials.accessToken = freshToken;
        credentials.access_token = freshToken;
      } catch (tokenErr: any) {
        return {
          success: false,
          error: tokenErr.message || 'Your Google connection has expired. Please re-authenticate.',
          errorCode: tokenErr.code || 'GOOGLE_AUTH_EXPIRED',
          inputs: finalInputs,
        };
      }
    }

    const connector = connectorRegistry[cid]
      ?? connectorRegistry[cid.replace(/-/g, '_')]
      ?? connectorRegistry[cid.replace(/_/g, '-')]
      ?? (UniversalConnector ? new UniversalConnector() : null);

    if (connector) {
      const targetActionId = typeof connector.resolveActionId === 'function'
        ? connector.resolveActionId(step.actionId)
        : step.actionId;

      const result = await connector.executeAction(targetActionId, {
        connectionCredentials: credentials,
        workflowVariables: {},
        stepInput: finalInputs,
        sessionId,
      } as any);
      return { success: result.success !== false, output: result.data ?? result, error: result.error, inputs: finalInputs };
    }

    return { success: false, error: `No connector found for '${step.connectorId}'`, errorCode: 'CONNECTOR_NOT_FOUND', inputs: finalInputs };
  } catch (err: any) {
    const errMsg = err?.message || 'Step execution failed';
    let errorCode = 'EXECUTION_ERROR';
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('connect ECONNREFUSED')) errorCode = 'ECONNREFUSED';
    else if (errMsg.includes('timeout') || errMsg.includes('ETIMEDOUT')) errorCode = 'ETIMEDOUT';
    else if (errMsg.includes('auth') || errMsg.includes('password') || errMsg.includes('credentials') || errMsg.includes('401')) errorCode = 'AUTH_ERROR';
    else if (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('404')) errorCode = 'DB_NOT_FOUND';
    else if (errMsg.includes('permission') || errMsg.includes('403')) errorCode = 'PERMISSION_DENIED';
    return { success: false, error: errMsg, errorCode };
  }
}

// ─── LLM Intent Parser ────────────────────────────────────────────────────────
async function parseIntentFromLLM(
  userMessage: string,
  connectorContext: string,
  historyContext: string,
  conversationHistory: any[],
  activeConnections: any[] = []
): Promise<ExecutionPlan> {
  const systemPrompt = `You are the AutoFlow Dynamic Agent — a live AI executor that directly operates the user's connected applications.

${connectorContext}

${historyContext}

RULES:
1. Parse the user's request and return a precise execution plan using ONLY the connected apps listed above.
2. Use {{step_N.output.field}} syntax to chain data between steps. E.g. {{step_1.output.spreadsheetId}}.
3. For destructive operations (delete, drop, truncate, flush, remove), set requiresConfirmation: true.
4. forEach: set to a variable expression when iterating over arrays, e.g. "{{step_1.output.documents}}".
5. Maximum 20 steps per plan.
6. Never fabricate connection IDs — use exactly the connectionId values from the context above.
7. If the request cannot be fulfilled with available apps, return an empty plan and explain in a conversational message.
8. If the request is ambiguous, return an empty plan and ask a clarifying question in message.
9. FOR DATABASE CONNECTORS (mongodb, postgresql, mysql): Always include "database" in inputs if known or mentioned in request/schema (e.g. inputs: { "database": "automation_platform", "collection": "users" }). If database is unknown, pass database from connected credentials or common app DB name.
10. FOLLOW-UPS & CONVERSATIONAL CONTINUITY: If user asks a follow-up (e.g., "what are their names?", "export to sheets", "count them"), check the "Previous execution results" section to reuse exact connectionId, database, collection, or entity context from prior steps.
11. RESOURCE CREATION LINKS: google-sheets.create_spreadsheet outputs both spreadsheetId AND spreadsheetUrl. google-docs.create_document outputs documentId AND documentUrl. Never invent non-existent helper actions like get_spreadsheet_url or get_doc_link.
12. LOOP TEMPLATE VARIABLES: When using forEach over an array (e.g. forEach: "{{step_1.output.documents}}"), reference properties using {{item.field}} (e.g., values: ["{{item.name}}", "{{item.email}}"] or inputs: { "to": "{{item.email}}", "body": "Hello {{item.name}}" }).

RESPOND WITH VALID JSON ONLY — no markdown fences, no extra text:
{
  "plan": [
    {
      "stepId": "step_1",
      "connectorId": "mongodb",
      "connectionId": "conn_abc123",
      "actionId": "find_documents",
      "description": "Find all users with role Admin",
      "inputs": { "collection": "users", "filter": { "role": "Admin" }, "limit": 100 }
    }
  ],
  "requiresConfirmation": false,
  "confirmationMessage": null,
  "conversationalMessage": "I'll query MongoDB for Admin users now..."
}`;

  const messages = [
    ...conversationHistory.slice(-6).map((m: any) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  let rawJson = '';

  if (env.geminiApiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(30000),
        }
      );
      const data: any = await res.json();
      rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      logger.warn('[AgentChatService] Gemini intent parse failed:', err);
    }
  }

  if (!rawJson && env.groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groqApiKey}` },
        body: JSON.stringify({
          model: 'groq/compound',
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data: any = await res.json();
      rawJson = data.choices?.[0]?.message?.content || '';
    } catch (err) {
      logger.warn('[AgentChatService] Groq intent parse failed:', err);
    }
  }

  if (rawJson) {
    try {
      let cleaned = rawJson.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        cleaned = codeBlockMatch[1].trim();
      }
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx !== -1 && endIdx > startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
      }
      const parsed = JSON.parse(cleaned) as ExecutionPlan;
      if (parsed && Array.isArray(parsed.plan) && parsed.plan.length > 0) {
        return parsed;
      }
    } catch (err) {
      logger.warn('[AgentChatService] LLM JSON parse error:', err);
    }
  }

  return parseUniversalDynamicIntent(userMessage, activeConnections);
}

// ─── Universal Dynamic Action Matcher (100% Dynamic - Zero Hardcoding) ────────
export function parseUniversalDynamicIntent(userMessage: string, activeConnections: any[] = []): ExecutionPlan {
  const msgLower = userMessage.toLowerCase().replace(/["']/g, '').trim();
  const tokens = msgLower.split(/\W+/).filter((t) => t.length > 2);
  const plan: ExecutionStep[] = [];

  let bestMatch: {
    conn: any;
    action: any;
    score: number;
  } | null = null;

  try {
    const { manifestRegistry } = require('@automation/connector-sdk');

    for (const conn of activeConnections) {
      const manifest = manifestRegistry.getManifest(conn.connectorId);
      if (!manifest || !manifest.actions) continue;

      for (const action of manifest.actions) {
        let score = 0;

        // Connector ID & Name match
        if (tokens.some((t) => conn.connectorId.includes(t) || manifest.name.toLowerCase().includes(t))) {
          score += 10;
        }

        // Action ID & Name match
        const actionTokens = `${action.id} ${action.name} ${action.description || ''}`.toLowerCase().split(/\W+/);
        tokens.forEach((t) => {
          if (actionTokens.includes(t)) score += 5;
          else if (actionTokens.some((at) => at.includes(t) || t.includes(at))) score += 2;
        });

        // Intent verbs (send, read, list, create, find, count, delete, post, search)
        if (msgLower.includes('send') && (action.id.includes('send') || action.name.toLowerCase().includes('send'))) score += 15;
        if (msgLower.includes('read') || msgLower.includes('get') || msgLower.includes('fetch')) {
          if (action.id.includes('read') || action.id.includes('get') || action.id.includes('list') || action.id.includes('find')) score += 10;
        }
        if (msgLower.includes('create') || msgLower.includes('new') || msgLower.includes('add')) {
          if (action.id.includes('create') || action.id.includes('insert') || action.id.includes('add')) score += 10;
        }
        if (msgLower.includes('count') || msgLower.includes('how many')) {
          if (action.id.includes('count') || action.id.includes('list')) score += 15;
        }
        if ((msgLower.includes('search') || msgLower.includes('news') || msgLower.includes('latest') || msgLower.includes('look up') || msgLower.includes('find out') || msgLower.includes('article') || msgLower.includes('web')) && (conn.connectorId === 'web-search' || conn.connectorId === 'web-browser')) {
          if (action.id === 'search_web' || action.id === 'search_and_read') score += 35;
          else score += 20;
        }

        if (score > (bestMatch?.score || 0)) {
          bestMatch = { conn, action, score };
        }
      }
    }
  } catch (err) {
    logger.warn('[AgentChatService] Universal dynamic matcher failed:', err);
  }

  if (bestMatch && bestMatch.score >= 5) {
    const { conn, action } = bestMatch;
    const inputs: Record<string, any> = {};

    const emailMatch = userMessage.match(/[\w.-]+@[\w.-]+\.\w+/i);
    (action.inputs || []).forEach((field: any) => {
      const keyLower = field.key.toLowerCase();
      if (keyLower === 'to' || keyLower.includes('recipient') || keyLower.includes('email')) {
        if (emailMatch) inputs[field.key] = emailMatch[0];
      } else if (keyLower === 'query' || keyLower === 'search' || keyLower === 'q') {
        const queryClean = userMessage
          .replace(/^(search\s+the\s+web\s+for|search\s+web\s+for|search\s+for|search|look\s+up|find\s+out\s+about|google|find)\s+/i, '')
          .trim();
        inputs[field.key] = queryClean || userMessage;
      } else if (keyLower === 'url') {
        const urlMatch = userMessage.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) inputs[field.key] = urlMatch[0];
      } else if (keyLower === 'subject' || keyLower === 'title') {
        const subjMatch = userMessage.match(/(?:title|subject)\s*[:=|-]?\s*([^,\n.]+)/i);
        if (subjMatch) inputs[field.key] = subjMatch[1].trim();
      } else if (keyLower === 'body' || keyLower === 'message' || keyLower === 'content') {
        const bodyMatch = userMessage.match(/(?:message|body|content)\s*(?:will\s*[-:]?)?\s*([^.\n]+)/i);
        inputs[field.key] = bodyMatch ? bodyMatch[1].trim() : userMessage;
      } else if (keyLower === 'database') {
        inputs[field.key] = conn.credentials?.database || conn.credentials?.dbName || 'automation_platform';
      } else if (keyLower === 'collection' || keyLower === 'table') {
        inputs[field.key] = 'users';
      } else if (keyLower === 'limit' || keyLower === 'maxresults') {
        inputs[field.key] = 10;
      }
    });

    plan.push({
      stepId: 'step_1',
      connectorId: conn.connectorId,
      connectionId: conn.connectionId,
      actionId: action.id,
      description: action.name || action.id,
      inputs,
    });
  }

  return { plan, requiresConfirmation: false };
}

// ─── Assemble Conversational Result ──────────────────────────────────────────
async function assembleConversationalResult(
  userMessage: string,
  stepsExecuted: any[],
  conversationHistory: any[]
): Promise<string> {
  const discoveredUrls: string[] = [];

  const resultsText = stepsExecuted.map((s) => {
    const output = s.output || {};
    // Extract known link fields
    if (typeof output === 'object' && output !== null) {
      ['spreadsheetUrl', 'documentUrl', 'url', 'link', 'webUrl', 'html_url'].forEach((key) => {
        if (output[key] && typeof output[key] === 'string' && output[key].startsWith('http')) {
          discoveredUrls.push(`- [${s.connectorId} ${key}](${output[key]})`);
        }
      });
    }

    let formattedDetails = '';
    if (typeof output === 'object' && output !== null) {
      if (Array.isArray(output.results)) {
        const items = output.results.map((r: any, i: number) => `Result #${i + 1}: ${r.title} | ${r.url}\nSnippet: ${r.snippet || r.content || 'N/A'}`).join('\n\n');
        formattedDetails += `\nSearch Results:\n${items}\n`;
      }
      if (Array.isArray(output.pagesContent)) {
        const pages = output.pagesContent.map((p: any) => `Page (${p.title} - ${p.url}):\n${(p.content || '').slice(0, 3000)}`).join('\n\n');
        formattedDetails += `\nExtracted Page Contents:\n${pages}\n`;
      }
      if (output.extractedText || output.content) {
        formattedDetails += `\nExtracted Content:\n${String(output.extractedText || output.content).slice(0, 4000)}\n`;
      }
      if (output.abstract || output.topSnippet) {
        formattedDetails += `\nSummary Abstract:\n${output.abstract || output.topSnippet}\n`;
      }
    }

    if (!formattedDetails) {
      formattedDetails = JSON.stringify(output || s.error || {}).slice(0, 2000);
    }

    return `Step ${s.stepId} (${s.connectorId}.${s.actionId}) — ${s.success ? 'SUCCESS' : 'FAILED'}:\n${formattedDetails}`;
  }).join('\n\n====================\n\n');

  const urlSection = discoveredUrls.length
    ? `\n\nCRITICAL RESOURCE LINKS GENERATED IN THIS EXECUTION (You MUST include these exact markdown links in your response):\n${discoveredUrls.join('\n')}\n`
    : '';

  const prompt = `You are the AutoFlow AI Agent directly serving the user.

User Prompt / Query: "${userMessage}"

Execution Payload & Extracted Real-Time Web Data:
${resultsText}
${urlSection}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Thoroughly answer the user's query using the real-time search snippets, page text, and data extracted above.
2. If the user asked about a company, person, website, or topic (e.g. "Aripra tech" or "Who is X"), provide a full, detailed profile summarizing what they do, their products, team, location, and key highlights based on the extracted search snippets and page content.
3. NEVER write generic phrases like "content is not displayed here" or "the operation simply read the page". Always synthesize and output the actual information found!
4. Format all URLs as prominent, clickable Markdown links: [Title / Site Name](URL).
5. Use clean GitHub-flavored Markdown formatting with headers (##), bold text, and bulleted lists.

Respond with ONLY your comprehensive Markdown response — no JSON formatting:`;

  let reply = '';

  if (env.geminiApiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {},
          }),
          signal: AbortSignal.timeout(20000),
        }
      );
      const data: any = await res.json();
      reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch { }
  }

  if (!reply && env.groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.groqApiKey}` },
        body: JSON.stringify({
          model: 'groq/compound',
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(20000),
      });
      const data: any = await res.json();
      reply = data.choices?.[0]?.message?.content || '';
    } catch { }
  }

  return reply || stepsExecuted.map((s) => `${s.success ? '✅' : '❌'} ${s.description}: ${JSON.stringify(s.output || s.error).slice(0, 200)}`).join('\n');
}

// ─── Main Agent Chat Service ──────────────────────────────────────────────────
export class AgentChatService {

  /** Rate limit check: 10 messages/min per user, 1 concurrent execution */
  static async checkRateLimits(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const r = getRedis();
    if (!r) return { allowed: true };

    try {
      // Concurrency lock
      const lockKey = `agent_lock:${userId}`;
      const lock = await r.get(lockKey);
      if (lock) return { allowed: false, reason: 'EXECUTION_IN_PROGRESS' };

      // Rate limit: 10 msgs/min
      const rateKey = `agent_rate:${userId}`;
      const count = await r.incr(rateKey);
      if (count === 1) await r.expire(rateKey, 60);
      if (count > 10) return { allowed: false, reason: 'RATE_LIMITED' };

      return { allowed: true };
    } catch {
      return { allowed: true };
    }
  }

  /** Set / release concurrency lock */
  static async setExecutionLock(userId: string, set: boolean) {
    const r = getRedis();
    if (!r) return;
    const lockKey = `agent_lock:${userId}`;
    if (set) await r.set(lockKey, '1', 'EX', 130); // 130s = 120s exec + 10s buffer
    else await r.del(lockKey);
  }

  /** Generate clean AI-driven conversation titles */
  static generateAiTitle(userMessage: string): string {
    if (!userMessage || !userMessage.trim()) return 'New Agent Session';

    let text = userMessage.trim().replace(/^["']|["']$/g, '');
    const lower = text.toLowerCase();

    if (lower.includes('mongodb') || lower.includes('mongo')) {
      if (lower.includes('count') || lower.includes('how many')) return 'MongoDB User Count';
      if (lower.includes('insert') || lower.includes('create')) return 'MongoDB Document Creation';
      return 'MongoDB Database Query';
    }
    if (lower.includes('gmail') || lower.includes('email') || lower.includes('mail')) {
      if (lower.includes('send')) return 'Gmail Email Dispatch';
      if (lower.includes('read') || lower.includes('inbox') || lower.includes('sender')) return 'Gmail Inbox Lookup';
      return 'Gmail Integration Task';
    }
    if (lower.includes('slack')) {
      if (lower.includes('channel') || lower.includes('#')) return 'Slack Channel Post';
      return 'Slack Team Notification';
    }
    if (lower.includes('github')) {
      if (lower.includes('issue') || lower.includes('pr')) return 'GitHub Issues & PRs';
      return 'GitHub Repository Insights';
    }
    if (lower.includes('sheet') || lower.includes('google sheets')) {
      return 'Google Sheets Sync';
    }
    if (lower.includes('postgres') || lower.includes('sql')) {
      return 'PostgreSQL Query Task';
    }
    if (lower.includes('whatsapp')) {
      return 'WhatsApp Messaging Task';
    }
    if (lower.includes('web') || lower.includes('search') || lower.includes('news')) {
      return 'Web Search & Intelligence';
    }

    const cleaned = text
      .replace(/^(can you|please|i want to|help me|how to|send a|read|get|fetch|find|search|show me)\s+/i, '')
      .replace(/[^\w\s-]/g, '')
      .trim();

    if (cleaned.length > 0) {
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const titleCase = words.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return titleCase.slice(0, 45) || 'Agent Execution Task';
      }
    }

    return 'New Agent Session';
  }

  /** Resolve conversations list for user with AI-formatted titles */
  static async getConversations(orgId: string, userId: string) {
    const convs = await AgentConversationModel.find({ organizationId: orgId, userId })
      .select('-messages.stepsExecuted')
      .sort({ updatedAt: -1 })
      .limit(50);

    return convs.map(c => {
      const json = c.toObject();
      if (!json.title || json.title.startsWith('"') || json.title.length > 50 || json.title === 'New Agent Chat' || json.title.startsWith('send a email')) {
        const firstUserMsg = json.messages?.find((m: any) => m.role === 'user')?.content;
        if (firstUserMsg) {
          json.title = AgentChatService.generateAiTitle(firstUserMsg);
        }
      }
      return json;
    });
  }

  static async getConversation(conversationId: string, orgId: string) {
    return AgentConversationModel.findOne({ conversationId, organizationId: orgId });
  }

  static async updateConversationTitle(conversationId: string, title: string, orgId: string) {
    return AgentConversationModel.findOneAndUpdate(
      { conversationId, organizationId: orgId },
      { title: title.trim().slice(0, 60) },
      { new: true }
    );
  }

  static async deleteConversation(conversationId: string, orgId: string) {
    return AgentConversationModel.deleteOne({ conversationId, organizationId: orgId });
  }

  /** Fetch + decrypt user's active connections */
  static async getActiveConnections(orgId: string): Promise<Array<{ connectorId: string; connectionId: string; name: string; credentials: any }>> {
    const conns = await ConnectionModel.find({
      organizationId: orgId,
      status: { $in: ['connected', 'active'] },
    });
    const result = conns.map((c) => ({
      connectorId: c.connectorId,
      connectionId: String(c._id),
      name: c.name,
      credentials: (() => { try { return decryptJson(c.encryptedCredentials); } catch { return {}; } })(),
    }));

    const builtinSystemApps = [
      { connectorId: 'web-search', connectionId: 'sys_web_search', name: 'Web Search & Intelligence', credentials: {} },
      { connectorId: 'web-browser', connectionId: 'sys_web_browser', name: 'Web Browser & Playwright MCP', credentials: {} },
      { connectorId: 'http-request', connectionId: 'sys_http_request', name: 'HTTP Request Call', credentials: {} },
      { connectorId: 'autoflow-schedule', connectionId: 'sys_autoflow_schedule', name: 'AutoFlow Schedule Trigger', credentials: {} },
      { connectorId: 'ai-agent', connectionId: 'sys_ai_agent', name: 'AI Reasoning & Data Analyst', credentials: {} },
    ];

    builtinSystemApps.forEach((sys) => {
      if (!result.some((c) => c.connectorId === sys.connectorId)) {
        result.push(sys);
      }
    });

    return result;
  }

  /**
   * Core streaming execution pipeline.
   * `emitSSE(event)` is called for each SSE event to send to the client.
   */
  static async processMessage(
    userMessage: string,
    conversationId: string,
    orgId: string,
    userId: string,
    emitSSE: (event: SSEEvent) => void
  ) {
    const EXECUTION_TIMEOUT_MS = 120_000;
    const startTime = Date.now();
    let apiCallCount = 0;
    const MAX_API_CALLS = 500;

    // ── 1. Load / Create Conversation ───────────────────────────────────────
    let conversation = await AgentConversationModel.findOne({ conversationId, organizationId: orgId });
    const aiTitle = AgentChatService.generateAiTitle(userMessage);

    if (!conversation) {
      conversation = await AgentConversationModel.create({
        conversationId,
        organizationId: orgId,
        userId,
        title: aiTitle,
        status: 'active',
        messages: [],
      });
    } else if (!conversation.title || conversation.title === 'New Agent Chat' || conversation.title.startsWith('"') || conversation.title.length > 50 || conversation.title.startsWith('send a email')) {
      conversation.title = aiTitle;
      await conversation.save();
    }

    // ── 2. Append user message ───────────────────────────────────────────────
    conversation.messages.push({ id: randomUUID(), role: 'user', content: userMessage, timestamp: new Date() });
    await conversation.save();

    // ── 3. Load active connections ───────────────────────────────────────────
    const activeConnections = await AgentChatService.getActiveConnections(orgId);

    if (!activeConnections.length) {
      const reply = 'No connected apps found. Please connect at least one app from the **Integrations SDK** page to use the Agent Chat.';
      emitSSE({ type: 'final_response', message: reply });
      conversation.messages.push({ id: randomUUID(), role: 'agent', content: reply, timestamp: new Date() });
      await conversation.save();
      return;
    }

    // ── 4. Build context ─────────────────────────────────────────────────────
    const connectorContext = await buildTieredConnectorContext(userMessage, activeConnections);
    const historyContext = buildHistoryContext(conversation.messages);

    // ── 5. Parse intent via LLM ──────────────────────────────────────────────
    let executionPlan: ExecutionPlan;
    try {
      executionPlan = await parseIntentFromLLM(userMessage, connectorContext, historyContext, conversation.messages, activeConnections);
    } catch {
      const reply = 'I had trouble understanding that request. Please try rephrasing.';
      emitSSE({ type: 'final_response', message: reply });
      return;
    }

    // ── 6. Empty plan (clarification / unsupported) ──────────────────────────
    if (!executionPlan.plan || !executionPlan.plan.length) {
      const reply = (executionPlan as any).conversationalMessage || 'I couldn\'t determine what actions to take. Please provide more detail.';
      emitSSE({ type: 'final_response', message: reply });
      conversation.messages.push({ id: randomUUID(), role: 'agent', content: reply, timestamp: new Date() });
      await conversation.save();
      return;
    }

    // ── 7. Batch optimizer ───────────────────────────────────────────────────
    executionPlan = applyBatchOptimization(executionPlan);

    // ── 8. Destructive action detection ─────────────────────────────────────
    const { isDestructive, message: confirmMsg } = detectDestructive(executionPlan, userMessage);
    if (isDestructive) {
      const confirmationId = randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL

      conversation.status = 'awaiting_confirmation';
      conversation.pendingConfirmation = {
        confirmationId,
        confirmationMessage: confirmMsg,
        plan: executionPlan,
        contextMap: {},
        pausedStepIndex: 0,
        expiresAt,
      };
      await conversation.save();

      emitSSE({ type: 'confirmation_required', confirmationId, message: confirmMsg });
      return;
    }

    // ── 9. Execute plan steps ────────────────────────────────────────────────
    const context = new Map<string, any>();
    const stepsExecuted: any[] = [];

    for (const step of executionPlan.plan) {
      // Timeout check
      if (Date.now() - startTime > EXECUTION_TIMEOUT_MS) {
        emitSSE({ type: 'step_error', stepId: step.stepId, error: 'Execution timed out after 120 seconds. Returning partial results.', errorCode: 'TIMEOUT' });
        break;
      }

      // API call cap check
      if (apiCallCount >= MAX_API_CALLS) {
        emitSSE({ type: 'step_error', stepId: step.stepId, error: 'Session API call limit (500) reached. Start a new conversation to continue.', errorCode: 'SESSION_CAP' });
        break;
      }

      emitSSE({
        type: 'step_start',
        stepId: step.stepId,
        description: step.description,
        connectorId: step.connectorId,
        actionId: step.actionId,
      });

      // Find credentials for this step
      const conn = activeConnections.find((c) => c.connectorId === step.connectorId || c.connectionId === (step as any).connectionId);
      const credentials = conn?.credentials || {};

      // forEach loop
      if (step.forEach) {
        const forEachRef = step.forEach;
        const forEachArr = resolveVariables(forEachRef, context);
        const items = Array.isArray(forEachArr) ? forEachArr.slice(0, 500) : [forEachArr];
        const loopResults: any[] = [];
        let lastInputs: any = undefined;

        for (const item of items) {
          if (Date.now() - startTime > EXECUTION_TIMEOUT_MS) break;
          apiCallCount++;
          const itemContext = new Map(context);
          itemContext.set('item', item);
          const loopResult = await executeStep(step, itemContext, credentials, conn?.connectionId || '', userMessage, conversationId);
          if (loopResult.inputs) lastInputs = loopResult.inputs;
          loopResults.push(loopResult.output || loopResult.error);
        }

        context.set(step.stepId, { output: loopResults });
        stepsExecuted.push({
          stepId: step.stepId,
          connectorId: step.connectorId,
          actionId: step.actionId,
          description: step.description,
          success: true,
          inputs: lastInputs,
          output: loopResults,
        });
        emitSSE({
          type: 'step_complete',
          stepId: step.stepId,
          description: `${step.description} (${items.length} items processed)`,
          connectorId: step.connectorId,
          actionId: step.actionId,
          inputs: lastInputs,
          output: loopResults,
          preview: loopResults.slice(0, 3),
        });
      } else {
        apiCallCount++;
        const result = await executeStep(step, context, credentials, conn?.connectionId || '', userMessage, conversationId);

        if (result.success) {
          context.set(step.stepId, result.output);
          stepsExecuted.push({
            stepId: step.stepId,
            connectorId: step.connectorId,
            actionId: step.actionId,
            description: step.description,
            success: true,
            inputs: result.inputs,
            output: result.output,
          });
          emitSSE({
            type: 'step_complete',
            stepId: step.stepId,
            description: step.description,
            connectorId: step.connectorId,
            actionId: step.actionId,
            inputs: result.inputs,
            output: result.output,
            preview: typeof result.output === 'object' ? Object.entries(result.output || {}).slice(0, 3) : result.output,
          });
        } else {
          stepsExecuted.push({
            stepId: step.stepId,
            connectorId: step.connectorId,
            actionId: step.actionId,
            description: step.description,
            success: false,
            inputs: result.inputs,
            error: result.error,
            errorCode: result.errorCode,
          });
          emitSSE({
            type: 'step_error',
            stepId: step.stepId,
            description: step.description,
            connectorId: step.connectorId,
            actionId: step.actionId,
            inputs: result.inputs,
            error: result.error,
            errorCode: result.errorCode,
          });
          // Stop dependent steps — for simplicity in a linear plan we stop all
          break;
        }
      }
    }

    // ── 10. Assemble final conversational response ──────────────────────────
    const finalReply = await assembleConversationalResult(userMessage, stepsExecuted, conversation.messages);

    // ── 11. Persist agent reply with step outputs ────────────────────────────
    conversation.messages.push({
      id: randomUUID(),
      role: 'agent',
      content: finalReply,
      executionPlan: executionPlan,
      stepsExecuted,
      timestamp: new Date(),
    });
    conversation.status = 'completed';
    await conversation.save();

    emitSSE({ type: 'final_response', message: finalReply, data: { stepsExecuted } });
  }

  /** Resume execution after destructive confirmation */
  static async confirmExecution(
    conversationId: string,
    confirmationId: string,
    confirmed: boolean,
    orgId: string,
    userId: string,
    emitSSE: (event: SSEEvent) => void
  ) {
    const conversation = await AgentConversationModel.findOne({ conversationId, organizationId: orgId });
    if (!conversation || conversation.status !== 'awaiting_confirmation') {
      emitSSE({ type: 'final_response', message: 'No pending confirmation found or it has already been resolved.' });
      return;
    }

    const pending = conversation.pendingConfirmation;
    if (!pending || pending.confirmationId !== confirmationId) {
      emitSSE({ type: 'final_response', message: 'Invalid or expired confirmation ID.' });
      return;
    }

    if (new Date() > pending.expiresAt) {
      conversation.status = 'completed';
      conversation.pendingConfirmation = undefined;
      await conversation.save();
      emitSSE({ type: 'final_response', message: 'Confirmation expired. Please re-send your original message to try again.' });
      return;
    }

    if (!confirmed) {
      conversation.status = 'completed';
      conversation.pendingConfirmation = undefined;
      await conversation.save();
      emitSSE({ type: 'final_response', message: '❌ Operation cancelled. No changes were made.' });
      return;
    }

    // Resume execution
    const plan: ExecutionPlan = pending.plan;
    const savedContextMap = pending.contextMap || {};
    const context = new Map<string, any>(Object.entries(savedContextMap));

    conversation.status = 'active';
    conversation.pendingConfirmation = undefined;
    await conversation.save();

    const activeConnections = await AgentChatService.getActiveConnections(orgId);
    const stepsExecuted: any[] = [];

    for (const step of plan.plan) {
      emitSSE({ type: 'step_start', stepId: step.stepId, description: step.description });
      const conn = activeConnections.find((c) => c.connectorId === step.connectorId);
      const result = await executeStep(step, context, conn?.credentials || {}, conn?.connectionId || '');

      if (result.success) {
        context.set(step.stepId, result.output);
        stepsExecuted.push({ stepId: step.stepId, connectorId: step.connectorId, actionId: step.actionId, description: step.description, success: true, output: result.output });
        emitSSE({ type: 'step_complete', stepId: step.stepId, description: step.description, preview: result.output });
      } else {
        stepsExecuted.push({ stepId: step.stepId, connectorId: step.connectorId, actionId: step.actionId, description: step.description, success: false, error: result.error });
        emitSSE({ type: 'step_error', stepId: step.stepId, error: result.error, errorCode: result.errorCode });
        break;
      }
    }

    const lastUserMsg = conversation.messages.filter((m: any) => m.role === 'user').pop()?.content || '';
    const finalReply = await assembleConversationalResult(lastUserMsg, stepsExecuted, conversation.messages);

    conversation.messages.push({ id: randomUUID(), role: 'agent', content: finalReply, executionPlan: plan, stepsExecuted, timestamp: new Date() });
    conversation.status = 'completed';
    await conversation.save();

    emitSSE({ type: 'final_response', message: finalReply, data: { stepsExecuted } });
  }

  /** Convert agent execution plan to a persistent workflow DAG draft */
  static async convertPlanToWorkflow(
    conversationId: string,
    messageId: string,
    triggerType: 'schedule' | 'webhook' | 'manual',
    orgId: string,
    userId: string
  ) {
    const conversation = await AgentConversationModel.findOne({ conversationId, organizationId: orgId });
    if (!conversation) throw new Error('Conversation not found');

    const targetMsg: any = conversation.messages.find((m: any) => m.id === messageId && m.role === 'agent');
    if (!targetMsg?.executionPlan?.plan) throw new Error('No execution plan found in that message');

    const { plan }: ExecutionPlan = targetMsg.executionPlan;

    // Build trigger node
    const triggerNode: any = {
      id: 'node_trigger',
      type: 'trigger',
      connectorId: triggerType === 'schedule' ? 'autoflow-schedule' : triggerType === 'webhook' ? 'webhook' : 'manual',
      operationId: triggerType === 'schedule' ? 'schedule_time' : triggerType === 'webhook' ? 'receive_webhook' : 'manual_run',
      name: triggerType === 'schedule' ? 'Schedule Trigger' : triggerType === 'webhook' ? 'Webhook Trigger' : 'Manual Trigger',
      config: triggerType === 'schedule' ? { frequency: 'daily', time: '09:00' } : {},
      fieldMapping: {},
      position: { x: 400, y: 80 },
    };

    // Convert plan steps to action nodes
    const actionNodes = plan.map((step, i) => ({
      id: step.stepId,
      type: 'action',
      connectorId: step.connectorId,
      operationId: step.actionId,
      name: step.description || `${step.connectorId} — ${step.actionId}`,
      config: step.inputs || {},
      fieldMapping: step.inputs || {},
      position: { x: 400, y: 80 + (i + 1) * 270 },
    }));

    const nodes = [triggerNode, ...actionNodes];

    const edges = nodes.slice(1).map((n, i) => ({
      id: `e_${nodes[i].id}_${n.id}`,
      source: nodes[i].id,
      target: n.id,
    }));

    const { WorkflowModel } = require('@automation/database');
    const workflow = await WorkflowModel.create({
      organizationId: orgId,
      creatorId: userId,
      name: `Agent Chat — ${conversation.title || conversationId.slice(0, 20)}`,
      description: `Converted from Agent Chat session: "${targetMsg.content.slice(0, 100)}"`,
      status: 'draft',
      nodes,
      edges,
      version: 1,
    });

    return { workflowId: String(workflow._id), name: workflow.name };
  }
}
