import { DAGNode } from '@automation/shared-types';
import { GmailConnector, SlackConnector, GoogleSheetsConnector, AINodeConnector } from '@automation/connector-sdk';

const connectorRegistry: Record<string, any> = {
  gmail: new GmailConnector(),
  slack: new SlackConnector(),
  'google-sheets': new GoogleSheetsConnector(),
  'ai-agent': new AINodeConnector(),
};

export class StepExecutor {
  static async executeStep(node: DAGNode, previousResults: Record<string, any>, triggerPayload: Record<string, any>) {
    const connector = connectorRegistry[node.connectorId];
    if (!connector) {
      throw new Error(`Connector '${node.connectorId}' not registered in worker engine.`);
    }

    // Resolve template variables (e.g. {{nodes.trigger_1.output.body}})
    const resolvedInputs: Record<string, any> = { ...node.config };
    for (const [targetKey, templateStr] of Object.entries(node.fieldMapping || {})) {
      resolvedInputs[targetKey] = StepExecutor.interpolateVariables(templateStr as string, {
        trigger: triggerPayload,
        nodes: previousResults,
      });
    }

    const result = await connector.executeAction(node.operationId, {
      connectionCredentials: {},
      stepInput: resolvedInputs,
      workflowVariables: previousResults,
    });

    return result.data;
  }

  private static interpolateVariables(template: string, context: any): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
      const keys = path.split('.');
      let val = context;
      for (const k of keys) {
        val = val ? val[k] : undefined;
      }
      return val !== undefined ? String(val) : '';
    });
  }
}
