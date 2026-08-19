import { DAGNode } from '@automation/shared-types';
import {
  AutoFlowScheduleConnector,
  GmailConnector,
  SlackConnector,
  GoogleSheetsConnector,
  GoogleDriveConnector,
  NotionConnector,
  StripeConnector,
  WhatsAppConnector,
  HttpRequestConnector,
  AINodeConnector,
  WebSearchConnector,
} from '@automation/connector-sdk';

const connectorRegistry: Record<string, any> = {
  'autoflow-schedule': new AutoFlowScheduleConnector(),
  gmail: new GmailConnector(),
  slack: new SlackConnector(),
  'google-sheets': new GoogleSheetsConnector(),
  'google-drive': new GoogleDriveConnector(),
  notion: new NotionConnector(),
  stripe: new StripeConnector(),
  whatsapp: new WhatsAppConnector(),
  'http-request': new HttpRequestConnector(),
  'ai-agent': new AINodeConnector(),
  'web-search': new WebSearchConnector(),
};

export class StepExecutor {
  static async executeStep(node: DAGNode, previousResults: Record<string, any>, triggerPayload: Record<string, any>) {
    const connector = connectorRegistry[node.connectorId];
    if (!connector) {
      throw new Error(`Connector '${node.connectorId}' not registered in worker engine.`);
    }

    // Resolve template variables (e.g. {{nodes.n_2.output.spreadsheetUrl}})
    const resolvedInputs: Record<string, any> = { ...node.config };
    for (const [targetKey, templateStr] of Object.entries(node.fieldMapping || {})) {
      if (typeof templateStr === 'string') {
        resolvedInputs[targetKey] = StepExecutor.interpolateVariables(templateStr, {
          trigger: triggerPayload,
          nodes: previousResults,
        });
      }
    }

    const result = await connector.executeAction(node.operationId, {
      connectionCredentials: {},
      stepInput: resolvedInputs,
      workflowVariables: previousResults,
    });

    return result.data;
  }

  static interpolateVariables(template: string, context: any): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const keys = path.split('.');
      let val = context;
      for (const k of keys) {
        val = val ? val[k] : undefined;
      }
      return val !== undefined ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : '';
    });
  }
}
