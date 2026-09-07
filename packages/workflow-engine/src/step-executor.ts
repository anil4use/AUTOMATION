import { DAGNode } from '@automation/shared-types';
import { manifestRegistry } from '@automation/connector-sdk';
import { createLogger } from '@automation/observability';
import * as crypto from 'crypto';

const logger = createLogger('StepExecutor');

export class StepExecutor {
  static async executeStep(
    node: DAGNode,
    previousResults: Record<string, any> = {},
    triggerPayload: Record<string, any> = {},
    orgId?: string
  ) {
    const manifest = manifestRegistry.getManifest(node.connectorId);
    
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

    for (const [key, val] of Object.entries(resolvedInputs)) {
      if (typeof val === 'string') {
        resolvedInputs[key] = StepExecutor.interpolateVariables(val, context);
      }
    }

    const idempotencyKey = `idemp_${node.id}_${crypto.createHash('md5').update(JSON.stringify(resolvedInputs)).digest('hex').substring(0, 12)}`;
    resolvedInputs._idempotencyKey = idempotencyKey;

    const actionId = node.operationId || (node as any).actionId || 'execute';
    
    // Execute connector action if connector class registered in manifestRegistry
    const connectorInstance = (manifestRegistry as any).getConnectorInstance ? (manifestRegistry as any).getConnectorInstance(node.connectorId) : null;
    if (connectorInstance) {
      const result = await connectorInstance.executeAction(actionId, {
        connectionCredentials: {},
        stepInput: resolvedInputs,
        workflowVariables: previousResults,
      });
      return result.data;
    }

    logger.info(`Executing step logic for connector: ${node.connectorId}`, { actionId, inputs: resolvedInputs });
    return { success: true, actionId, inputs: resolvedInputs, executedAt: new Date().toISOString() };
  }

  static interpolateVariables(template: string, context: Record<string, any>): any {
    if (!template || typeof template !== 'string') return template;

    const exactMatch = template.match(/^\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}$/);
    if (exactMatch) {
      const val = StepExecutor.resolvePath(exactMatch[1], context);
      if (val !== undefined) return val;
    }

    return template.replace(/\{\{\s*([a-zA-Z0-9_\-\.]+)\s*\}\}/g, (_, path) => {
      const val = StepExecutor.resolvePath(path, context);
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    });
  }

  static resolvePath(pathStr: string, context: Record<string, any>): any {
    const parts = pathStr.split('.');
    let curr: any = context;
    for (const part of parts) {
      if (curr === undefined || curr === null) return undefined;
      curr = curr[part];
    }
    return curr;
  }
}
