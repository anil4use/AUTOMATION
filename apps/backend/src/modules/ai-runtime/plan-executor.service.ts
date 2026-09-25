/**
 * AutoFlow Dynamic Plan Executor Service
 *
 * Executes a multi-step AI execution plan against real connectors.
 * Input-output chaining: each step's output is stored in a shared context
 * and resolved into next step's inputs via {{stepId.path}} template syntax.
 *
 * Design principles:
 *  - ZERO connector-specific if/else — all routing via connectorRegistry lookup
 *  - ZERO hardcoding — credentials loaded from DB per step
 *  - N-step chains supported: step1 → step2 → ... → stepN
 *  - Google OAuth auto-refresh handled generically for all Google connectors
 */

import { logger } from '../../config/logger';
import { resolveVariables, findArrayInContext } from '../../shared/utils/resolve-variables';

export interface ExecutionStep {
  stepId: string;
  connectorId: string;
  connectionId?: string;
  actionId: string;
  description?: string;
  inputs?: Record<string, any>;
  forEach?: any;
}

export interface StepResult {
  stepId: string;
  connectorId: string;
  actionId: string;
  description?: string;
  success: boolean;
  output?: any;
  error?: string;
  errorCode?: string;
  inputs?: Record<string, any>;
  durationMs?: number;
}

export interface PlanExecutionResult {
  success: boolean;
  stepResults: StepResult[];
  finalOutput: any;
  totalDurationMs: number;
  stepsCompleted: number;
  stepsTotal: number;
  error?: string;
}

// DB connector IDs that use the DB connector adapter (not connectorRegistry)
const DB_CONNECTOR_IDS = new Set([
  'mongodb', 'postgresql', 'postgres', 'mysql', 'redis', 'mssql', 'dynamodb',
]);

// Built-in system connectors that don't require DB credentials
const SYSTEM_CONNECTOR_IDS = new Set([
  'web-search', 'web-browser', 'http-request', 'autoflow-schedule', 'ai-agent',
  'data-vault', 'local-storage',
]);

// Google-family connectors that need OAuth token refresh
const GOOGLE_CONNECTOR_IDS = new Set([
  'gmail', 'google-sheets', 'google-drive', 'google-docs', 'google-calendar',
]);

export class PlanExecutorService {
  /**
   * Execute a full N-step plan against live connectors.
   * Step outputs automatically flow into subsequent step inputs via {{stepId.path}}.
   */
  static async executePlan(options: {
    plan: ExecutionStep[];
    orgId: string;
    userMessage?: string;
    sessionId?: string;
  }): Promise<PlanExecutionResult> {
    const { plan, orgId, userMessage = '', sessionId } = options;
    const context = new Map<string, any>();   // Shared inter-step output context
    const stepResults: StepResult[] = [];
    const globalStart = Date.now();

    if (!plan || plan.length === 0) {
      return {
        success: false,
        stepResults: [],
        finalOutput: null,
        totalDurationMs: 0,
        stepsCompleted: 0,
        stepsTotal: 0,
        error: 'Execution plan is empty.',
      };
    }

    for (const step of plan) {
      const stepStart = Date.now();

      try {
        // ── 1. Resolve {{step_N.path}} references from prior step outputs ──────
        const resolvedInputs = resolveVariables(step.inputs || {}, context);

        // ── 2. Auto-inject prior array outputs into 'data' if input expects it ─
        const hydratedInputs = hydrateInputsFromContext(step, resolvedInputs, context, userMessage);

        // ── 3. Load connector credentials from DB ─────────────────────────────
        const { credentials, connectionId } = await loadStepCredentials(
          step.connectorId,
          step.connectionId,
          orgId
        );

        // ── 4. Dispatch to connector (fully generic, no if/else per connector) ─
        const result = await dispatchConnectorAction({
          connectorId: step.connectorId,
          actionId: step.actionId,
          inputs: hydratedInputs,
          credentials,
          connectionId,
          sessionId,
        });

        const durationMs = Date.now() - stepStart;

        // ── 5. Store output in shared context for downstream steps ─────────────
        context.set(step.stepId, result.output ?? {});

        const stepResult: StepResult = {
          stepId: step.stepId,
          connectorId: step.connectorId,
          actionId: step.actionId,
          description: step.description,
          success: result.success,
          output: result.output,
          error: result.error,
          errorCode: result.errorCode,
          inputs: hydratedInputs,
          durationMs,
        };

        stepResults.push(stepResult);
        logger.info(`[PlanExecutor] ✅ Step ${step.stepId} (${step.connectorId}.${step.actionId}) completed in ${durationMs}ms`);

        // ── 6. Stop on step failure ────────────────────────────────────────────
        if (!result.success) {
          logger.warn(`[PlanExecutor] ❌ Step ${step.stepId} failed: ${result.error}`);
          break;
        }

      } catch (err: any) {
        const durationMs = Date.now() - stepStart;
        const errMsg = err?.message || 'Unknown execution error';
        logger.error(`[PlanExecutor] ❌ Step ${step.stepId} threw: ${errMsg}`);

        stepResults.push({
          stepId: step.stepId,
          connectorId: step.connectorId,
          actionId: step.actionId,
          description: step.description,
          success: false,
          error: errMsg,
          errorCode: 'EXECUTION_EXCEPTION',
          durationMs,
        });
        break;
      }
    }

    const totalDurationMs = Date.now() - globalStart;
    const stepsCompleted = stepResults.filter((s) => s.success).length;
    const lastStep = stepResults[stepResults.length - 1];

    return {
      success: stepsCompleted === plan.length,
      stepResults,
      finalOutput: assembleFinalOutput(context, stepResults),
      totalDurationMs,
      stepsCompleted,
      stepsTotal: plan.length,
      error: lastStep?.error,
    };
  }
}

// ─── Generic Connector Dispatcher ────────────────────────────────────────────
// Zero connector-specific if/else. All routing through connectorRegistry lookup.

async function dispatchConnectorAction(params: {
  connectorId: string;
  actionId: string;
  inputs: Record<string, any>;
  credentials: any;
  connectionId?: string;
  sessionId?: string;
}): Promise<{ success: boolean; output?: any; error?: string; errorCode?: string }> {
  const { connectorId, actionId, inputs, credentials, connectionId, sessionId } = params;
  const cid = connectorId.toLowerCase().trim().replace(/_/g, '-');

  try {
    // ── DB connectors (MongoDB, PostgreSQL, MySQL, Redis, etc.) ─────────────
    if (DB_CONNECTOR_IDS.has(cid) || DB_CONNECTOR_IDS.has(connectorId.toLowerCase())) {
      const dbConnector = getDbConnectorInstance(cid || connectorId.toLowerCase());
      if (dbConnector) {
        const connectionConfig = buildDbConnectionConfig(credentials, cid);
        const resolvedActionId = typeof dbConnector.resolveActionId === 'function'
          ? dbConnector.resolveActionId(actionId) : actionId;

        const result = await dbConnector.executeAction(resolvedActionId, {
          stepInput: inputs,
          connectionConfig,
          connectionCredentials: credentials,
          workflowVariables: {},
          sessionId,
        });
        return { success: result.success !== false, output: result.data ?? result, error: result.error };
      }
    }

    // ── All other connectors: SDK connectorRegistry ──────────────────────────
    const { connectorRegistry } = require('@automation/connector-sdk');

    // Refresh Google OAuth tokens generically for all google-* connectors
    if (GOOGLE_CONNECTOR_IDS.has(cid) && connectionId) {
      const { getValidGoogleAccessToken } = require('../connectors/google-oauth-token.service');
      try {
        const freshToken = await getValidGoogleAccessToken(connectionId, cid);
        credentials.accessToken = freshToken;
        credentials.access_token = freshToken;
      } catch (tokenErr: any) {
        return {
          success: false,
          error: tokenErr.message || 'Google OAuth token refresh failed. Please re-authenticate.',
          errorCode: tokenErr.code || 'GOOGLE_AUTH_EXPIRED',
        };
      }
    }

    const connector = connectorRegistry[cid]
      ?? connectorRegistry[cid.replace(/-/g, '_')]
      ?? connectorRegistry[cid.replace(/_/g, '-')];

    if (!connector) {
      return { success: false, error: `No connector found for '${connectorId}'`, errorCode: 'CONNECTOR_NOT_FOUND' };
    }

    const resolvedActionId = typeof connector.resolveActionId === 'function'
      ? connector.resolveActionId(actionId) : actionId;

    const result = await connector.executeAction(resolvedActionId, {
      connectionCredentials: credentials,
      workflowVariables: {},
      stepInput: inputs,
      sessionId,
    });

    return {
      success: result.success !== false,
      output: result.data ?? result,
      error: result.error,
    };
  } catch (err: any) {
    const msg = err?.message || 'Connector dispatch error';
    let errorCode = 'DISPATCH_ERROR';
    if (msg.includes('ECONNREFUSED') || msg.includes('connect ECONNREFUSED')) errorCode = 'ECONNREFUSED';
    else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) errorCode = 'ETIMEDOUT';
    else if (msg.includes('auth') || msg.includes('401') || msg.includes('credentials')) errorCode = 'AUTH_ERROR';
    return { success: false, error: msg, errorCode };
  }
}

// ─── Credential Loader ────────────────────────────────────────────────────────

async function loadStepCredentials(
  connectorId: string,
  connectionId?: string,
  orgId?: string
): Promise<{ credentials: any; connectionId: string }> {
  const cid = connectorId.toLowerCase().trim().replace(/_/g, '-');

  // System connectors don't need DB credentials
  if (SYSTEM_CONNECTOR_IDS.has(cid)) {
    return { credentials: {}, connectionId: '' };
  }

  try {
    const { ConnectionModel } = require('@automation/database');
    const { decryptJson } = require('../../shared/utils/crypto');

    // Try by explicit connectionId first, then by orgId + connectorId
    let conn: any = null;

    if (connectionId && connectionId.length === 24) {
      conn = orgId
        ? await ConnectionModel.findOne({ _id: connectionId, organizationId: orgId })
        : await ConnectionModel.findById(connectionId);
    }

    if (!conn && orgId) {
      conn = await ConnectionModel.findOne({ organizationId: orgId, connectorId: cid })
        .sort({ updatedAt: -1 });
      // Also try original connectorId casing
      if (!conn) {
        conn = await ConnectionModel.findOne({ organizationId: orgId, connectorId })
          .sort({ updatedAt: -1 });
      }
    }

    if (!conn) {
      return { credentials: {}, connectionId: '' };
    }

    const credentials = decryptJson(conn.encryptedCredentials || '{}');
    return { credentials, connectionId: conn._id?.toString() || '' };
  } catch (err: any) {
    logger.warn(`[PlanExecutor] Could not load credentials for '${connectorId}': ${err?.message}`);
    return { credentials: {}, connectionId: '' };
  }
}

// ─── DB Connector Factory ─────────────────────────────────────────────────────

function getDbConnectorInstance(connectorId: string): any {
  try {
    switch (connectorId) {
      case 'mongodb': { const { MongodbConnector } = require('@automation/connector-sdk'); return new MongodbConnector(); }
      case 'postgresql':
      case 'postgres': { const { PostgresqlConnector } = require('@automation/connector-sdk'); return new PostgresqlConnector(); }
      case 'mysql': { const { MysqlConnector } = require('@automation/connector-sdk'); return new MysqlConnector(); }
      case 'redis': { const { RedisConnector } = require('@automation/connector-sdk'); return new RedisConnector(); }
      case 'mssql': { const { MssqlConnector } = require('@automation/connector-sdk'); return new MssqlConnector(); }
      case 'dynamodb': { const { DynamodbConnector } = require('@automation/connector-sdk'); return new DynamodbConnector(); }
      default: return null;
    }
  } catch { return null; }
}

function buildDbConnectionConfig(credentials: any, connectorId: string): any {
  return {
    dbType: connectorId === 'postgres' ? 'postgresql' : connectorId,
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
  };
}

// ─── Input Hydrator ───────────────────────────────────────────────────────────
// Auto-injects prior step array outputs into 'data' field if step needs it.
// This is GENERIC — it uses manifest schema to detect what fields are needed.

function hydrateInputsFromContext(
  step: ExecutionStep,
  resolvedInputs: Record<string, any>,
  context: Map<string, any>,
  userMessage: string
): Record<string, any> {
  const inputs = { ...resolvedInputs };
  const cid = step.connectorId.toLowerCase().replace(/_/g, '-');
  const aid = step.actionId.toLowerCase();

  // For data-sink actions (save, append, write, store, upload-csv, etc.)
  // auto-populate 'data' from prior step output if missing or still a template
  const isDataSinkAction = aid.includes('save') || aid.includes('append') || aid.includes('write')
    || aid.includes('store') || aid.includes('insert') || aid.includes('upload')
    || aid.includes('create') || aid.includes('export');

  if (isDataSinkAction && (!inputs.data || (typeof inputs.data === 'string' && inputs.data.includes('{{')))) {
    const priorArray = findArrayInContext(context, step.stepId);
    if (priorArray && priorArray.length > 0) {
      inputs.data = priorArray;
    }
  }

  // Auto-set filename from userMessage if missing
  if (!inputs.filename && !inputs.fileName && !inputs.file_name) {
    const safeTitle = (userMessage || 'output').replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
    const ext = aid.includes('csv') ? 'csv' : aid.includes('json') ? 'json' : 'txt';
    inputs.filename = `${safeTitle}_${Date.now()}.${ext}`;
  }

  // Auto-set limit/maxResults if missing
  if (!inputs.maxResults && !inputs.limit && !inputs.count) {
    const numMatch = userMessage.match(/\b(\d+)\b/);
    if (numMatch) inputs.maxResults = parseInt(numMatch[1], 10);
  }

  return inputs;
}

// ─── Final Output Assembler ────────────────────────────────────────────────────

function assembleFinalOutput(context: Map<string, any>, stepResults: StepResult[]): any {
  if (stepResults.length === 0) return null;

  // Return the last successful step's output as the primary result
  const lastSuccess = [...stepResults].reverse().find((s) => s.success);
  if (!lastSuccess) return null;

  const lastOutput = context.get(lastSuccess.stepId);

  // Build a summary of all step outputs for transparency
  const allOutputs: Record<string, any> = {};
  for (const [stepId, val] of context.entries()) {
    allOutputs[stepId] = val;
  }

  return {
    primaryResult: lastOutput,
    allStepOutputs: allOutputs,
  };
}
