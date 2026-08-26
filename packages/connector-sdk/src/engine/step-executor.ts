import { DAGNode } from '@automation/shared-types';
import { GmailConnector } from '../integrations/gmail';
import { GoogleSheetsConnector } from '../integrations/google-sheets';
import { GoogleDriveConnector } from '../connectors/google-drive.connector';
import { GoogleCalendarConnector } from '../connectors/google-calendar.connector';
import { GoogleDocsConnector } from '../connectors/google-docs.connector';
import { SlackConnector } from '../integrations/slack';
import { NotionConnector } from '../connectors/notion.connector';
import { StripeConnector } from '../connectors/stripe.connector';
import { WhatsAppConnector } from '../connectors/whatsapp.connector';
import { HttpRequestConnector } from '../connectors/http-request.connector';
import { AINodeConnector } from '../integrations/ai-node';
import { WebSearchConnector } from '../connectors/web-search.connector';
import { AutoFlowScheduleConnector } from '../connectors/autoflow-schedule.connector';
import * as crypto from 'crypto';

export const connectorRegistry: Record<string, any> = {
  'autoflow-schedule': new AutoFlowScheduleConnector(),
  gmail: new GmailConnector(),
  slack: new SlackConnector(),
  'google-sheets': new GoogleSheetsConnector(),
  'google-drive': new GoogleDriveConnector(),
  'google-calendar': new GoogleCalendarConnector(),
  'google-docs': new GoogleDocsConnector(),
  notion: new NotionConnector(),
  stripe: new StripeConnector(),
  whatsapp: new WhatsAppConnector(),
  'http-request': new HttpRequestConnector(),
  'ai-agent': new AINodeConnector(),
  'ai-node': new AINodeConnector(),
  'web-search': new WebSearchConnector(),
};

export class StepExecutor {
  static async executeStep(
    node: DAGNode,
    previousResults: Record<string, any> = {},
    triggerPayload: Record<string, any> = {},
    orgId?: string
  ) {
    const connector = connectorRegistry[node.connectorId];
    if (!connector) {
      throw new Error(`Connector '${node.connectorId}' not registered in automation engine.`);
    }

    // Resolve real user credentials from database (AES-256 decrypted)
    const credentials = await StepExecutor.resolveCredentials(node.connectorId, orgId);

    // Context for template variable interpolation
    const context = {
      trigger: triggerPayload,
      nodes: previousResults,
      steps: previousResults,
      ...previousResults,
    };

    // Interpolate input fields & field mappings
    const resolvedInputs: Record<string, any> = { ...(node.config || {}) };
    for (const [targetKey, templateStr] of Object.entries(node.fieldMapping || {})) {
      if (typeof templateStr === 'string') {
        resolvedInputs[targetKey] = StepExecutor.interpolateVariables(templateStr, context);
      }
    }

    // Interpolate config values
    for (const [key, val] of Object.entries(resolvedInputs)) {
      if (typeof val === 'string') {
        resolvedInputs[key] = StepExecutor.interpolateVariables(val, context);
      }
    }

    // Execute REAL connector action (NO mock/sandbox fallbacks!)
    const actionId = node.operationId || (node as any).actionId || 'execute';
    const result = await connector.executeAction(actionId, {
      connectionCredentials: credentials,
      stepInput: resolvedInputs,
      workflowVariables: previousResults,
    });

    return result.data;
  }

  static async resolveCredentials(connectorId: string, orgId?: string): Promise<Record<string, any>> {
    let credentials: Record<string, any> = {};

    try {
      const { ConnectionModel } = require('@automation/database');
      let query: any = { connectorId, status: 'connected' };
      if (orgId) query.organizationId = orgId;

      const savedConn = await ConnectionModel.findOne(query).sort({ updatedAt: -1 });
      if (savedConn && savedConn.encryptedCredentials) {
        credentials = StepExecutor.parseCredentials(savedConn.encryptedCredentials);
      } else if (orgId) {
        // Fallback: search across organization if specific orgId didn't match
        const anyConn = await ConnectionModel.findOne({ connectorId, status: 'connected' }).sort({ updatedAt: -1 });
        if (anyConn && anyConn.encryptedCredentials) {
          credentials = StepExecutor.parseCredentials(anyConn.encryptedCredentials);
        }
      }
    } catch (err) {
      console.warn(`[StepExecutor] Database connection query warning for ${connectorId}:`, err);
    }

    // Auto-inject environmental AI keys for AI Native connectors
    if (connectorId === 'ai-agent' || connectorId === 'ai-node' || connectorId === 'web-search') {
      credentials.groqApiKey = credentials.groqApiKey || process.env.GROQ_API_KEY || '';
      credentials.geminiApiKey = credentials.geminiApiKey || process.env.GEMINI_API_KEY || '';
    }

    // System connectors that execute natively
    if (!Object.keys(credentials).length && ['autoflow-schedule', 'http-request', 'ai-agent', 'ai-node', 'web-search'].includes(connectorId)) {
      credentials = { status: 'system_active' };
    }

    // Real Production Safeguard: If no credentials exist for an authenticated service, THROW REAL ERROR!
    if (!Object.keys(credentials).length) {
      throw new Error(
        `Connector '${connectorId}' is not connected. Please go to http://localhost:3000/connectors to connect your real account.`
      );
    }

    return credentials;
  }

  static parseCredentials(encrypted: string): Record<string, any> {
    try {
      const [ivHex, encryptedHex] = encrypted.split(':');
      if (!ivHex || !encryptedHex) {
        try {
          return JSON.parse(encrypted);
        } catch {
          return { raw: encrypted };
        }
      }
      const key = crypto.scryptSync(process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef', 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch {
      return {};
    }
  }

  static interpolateVariables(template: any, context: any): any {
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{\s*(.*?)\s*\}\}/g, (fullMatch, rawExpr) => {
      // Support || fallback expressions (e.g. "node_2.output.summary || node_2.output.result")
      const alternatives = rawExpr.split('||').map((s: string) => s.trim());

      for (const altPath of alternatives) {
        const keys = altPath.split('.');
        let val = StepExecutor.getValueFromPath(context, keys);

        if (val === undefined && (keys[0] === 'steps' || keys[0] === 'nodes')) {
          val = StepExecutor.getValueFromPath(context.nodes || context.steps, keys.slice(1));
        }

        if (val === undefined && keys[0] === 'trigger') {
          val = StepExecutor.getValueFromPath(context.trigger, keys.slice(1));
        }

        if (val !== undefined && val !== null && val !== '') {
          return typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
      }

      return fullMatch;
    });
  }

  private static getValueFromPath(obj: any, pathKeys: string[]): any {
    let current = obj;
    for (let i = 0; i < pathKeys.length; i++) {
      const key = pathKeys[i];
      if (current === undefined || current === null) return undefined;

      if (typeof current === 'object' && !(key in current) && current.output && typeof current.output === 'object') {
        if (key in current.output) {
          current = current.output[key];
        } else if (i === pathKeys.length - 1 && (current.output.summary || current.output.result || current.output.topSnippet || current.output.emails)) {
          current = current.output.summary || current.output.result || current.output.topSnippet || current.output.emails;
        } else {
          current = current[key];
        }
      } else {
        current = current[key];
      }
    }
    return current;
  }
}
