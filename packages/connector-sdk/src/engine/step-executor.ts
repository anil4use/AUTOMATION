import { DAGNode } from '@automation/shared-types';
import { GmailConnector } from '../integrations/gmail';
import { GoogleSheetsConnector } from '../integrations/google-sheets';
import { GoogleDriveConnector } from '../connectors/google-drive.connector';
import { GoogleCalendarConnector } from '../connectors/google-calendar.connector';
import { GoogleDocsConnector } from '../connectors/google-docs.connector';
import { SlackConnector } from '../integrations/slack';
import { NotionConnector } from '../integrations/notion';
import { StripeConnector } from '../integrations/stripe';
import { WhatsAppConnector } from '../integrations/whatsapp';
import { HttpRequestConnector } from '../connectors/http-request.connector';
import { AINodeConnector } from '../integrations/ai-node';
import { WebSearchConnector } from '../connectors/web-search.connector';
import { AutoFlowScheduleConnector } from '../connectors/autoflow-schedule.connector';
import { ConditionConnector } from '../connectors/condition.connector';
import { AmazonFlipkartConnector } from '../connectors/amazon-flipkart.connector';
import { TelegramConnector } from '../integrations/telegram';
import { CommandRouterConnector } from '../connectors/command-router.connector';
import { UniversalConnector } from '../connectors/universal.connector';
import { GitHubConnector } from '../integrations/github';
import { OpenAIConnector } from '../integrations/openai';
import { AnthropicConnector } from '../integrations/anthropic';
import { JiraConnector } from '../integrations/jira';
import { HubSpotConnector } from '../integrations/hubspot';
import { GoogleSearchConnector } from '../integrations/google-search';
import { MsTeamsConnector } from '../integrations/ms-teams';
import { MsOutlookConnector } from '../integrations/ms-outlook';
import { MsExcelConnector } from '../integrations/ms-excel';
import { DropboxConnector } from '../integrations/dropbox';
import { ZoomConnector } from '../integrations/zoom';
import { WooCommerceConnector } from '../integrations/woocommerce';
import { PayPalConnector } from '../integrations/paypal';
import { MailchimpConnector } from '../integrations/mailchimp';
import { TrelloConnector } from '../integrations/trello';
import { CalendlyConnector } from '../integrations/calendly';
import { PipedriveConnector } from '../integrations/pipedrive';
import { AsanaConnector } from '../integrations/asana';
import { MondayConnector } from '../integrations/monday';
import { InstagramConnector } from '../integrations/instagram';
import { FacebookConnector } from '../integrations/facebook';
import { MetaMessengerConnector } from '../integrations/meta-messenger';
import { ActiveCampaignConnector } from '../integrations/activecampaign';
import { GoogleGeminiConnector } from '../integrations/google-gemini';
import { AIDocumentOCRConnector } from '../integrations/ai-document-ocr';
import { GitLabConnector } from '../integrations/gitlab';
import { LinearConnector } from '../integrations/linear';
import { VercelConnector } from '../integrations/vercel';
import { QuickBooksConnector } from '../integrations/quickbooks';
import { DocuSignConnector } from '../integrations/docusign';
import { WebhookTriggerConnector } from '../integrations/webhook-trigger';
import { MongodbConnector } from '../integrations/mongodb';
import { PostgresqlConnector } from '../integrations/postgresql';
import { MysqlConnector } from '../integrations/mysql';
import { SupabaseConnector } from '../integrations/supabase';
import { RedisConnector } from '../integrations/redis';
import { AmazonS3Connector } from '../integrations/amazon-s3';
import { CloudflareR2Connector } from '../integrations/cloudflare-r2';
import { DynamodbConnector } from '../integrations/dynamodb';
import * as crypto from 'crypto';

export const connectorRegistry: Record<string, any> = {
  'autoflow-schedule': new AutoFlowScheduleConnector(),
  gmail: new GmailConnector(),
  slack: new SlackConnector(),
  telegram: new TelegramConnector(),
  'command-router': new CommandRouterConnector(),
  'autoflow-command-router': new CommandRouterConnector(),
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
  'autoflow-condition': new ConditionConnector(),
  condition: new ConditionConnector(),
  'amazon-flipkart': new AmazonFlipkartConnector(),
  amazon: new AmazonFlipkartConnector(),
  flipkart: new AmazonFlipkartConnector(),
  github: new GitHubConnector(),
  openai: new OpenAIConnector(),
  anthropic: new AnthropicConnector(),
  jira: new JiraConnector(),
  hubspot: new HubSpotConnector(),
  'google-search': new GoogleSearchConnector(),
  'ms-teams': new MsTeamsConnector(),
  'ms-outlook': new MsOutlookConnector(),
  'ms-excel': new MsExcelConnector(),
  dropbox: new DropboxConnector(),
  zoom: new ZoomConnector(),
  woocommerce: new WooCommerceConnector(),
  shopify: new WooCommerceConnector(),
  paypal: new PayPalConnector(),
  mailchimp: new MailchimpConnector(),
  trello: new TrelloConnector(),
  calendly: new CalendlyConnector(),
  pipedrive: new PipedriveConnector(),
  asana: new AsanaConnector(),
  monday: new MondayConnector(),
  instagram: new InstagramConnector(),
  facebook: new FacebookConnector(),
  'meta-messenger': new MetaMessengerConnector(),
  activecampaign: new ActiveCampaignConnector(),
  'google-gemini': new GoogleGeminiConnector(),
  'ai-document-ocr': new AIDocumentOCRConnector(),
  gitlab: new GitLabConnector(),
  linear: new LinearConnector(),
  vercel: new VercelConnector(),
  quickbooks: new QuickBooksConnector(),
  docusign: new DocuSignConnector(),
  'webhook-trigger': new WebhookTriggerConnector(),
  mongodb: new MongodbConnector(),
  postgresql: new PostgresqlConnector(),
  postgres: new PostgresqlConnector(),
  mysql: new MysqlConnector(),
  supabase: new SupabaseConnector(),
  redis: new RedisConnector(),
  'amazon-s3': new AmazonS3Connector(),
  'cloudflare-r2': new CloudflareR2Connector(),
  dynamodb: new DynamodbConnector(),
};

export class StepExecutor {
  static async executeStep(
    node: DAGNode,
    previousResults: Record<string, any> = {},
    triggerPayload: Record<string, any> = {},
    orgId?: string
  ) {
    const connector = connectorRegistry[node.connectorId] || new UniversalConnector();

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

    // Generate idempotency key for safe action retries (Zapier.md Topic 37)
    const idempotencyKey = `idemp_${node.id}_${crypto.createHash('md5').update(JSON.stringify(resolvedInputs)).digest('hex').substring(0, 12)}`;
    resolvedInputs._idempotencyKey = idempotencyKey;

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
