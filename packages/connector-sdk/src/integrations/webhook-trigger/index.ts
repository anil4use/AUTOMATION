import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getWebhookTriggerChoices } from './choices';
export * from './choices';

export const webhookTriggerManifest: ConnectorManifest = {
  id: 'webhook-trigger',
  name: 'Universal Catch Webhook',
  description: 'First-class AutoFlow Webhook engine — Receive custom inbound HTTP POST/GET webhooks from any external application and send custom HTTP responses.',
  category: 'Developer Tools',
  icon: '/icons/webhook.svg',
  authType: 'none',
  triggers: [
    {
      id: 'catch_webhook',
      name: 'Catch Inbound Webhook',
      description: 'Generates a unique Webhook URL that triggers your workflow whenever an external app posts payload data to it.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'secretHeader', label: 'Optional Secret Header Name (e.g. X-Webhook-Secret)', type: 'string', required: false },
        { key: 'secretValue', label: 'Secret Header Value', type: 'string', required: false },
      ],
      outputs: [
        { key: 'body', label: 'Inbound Request Body (JSON)', type: 'json', required: true },
        { key: 'headers', label: 'Inbound Request Headers', type: 'json', required: true },
        { key: 'query', label: 'URL Query Parameters', type: 'json', required: true },
        { key: 'method', label: 'HTTP Method (POST/GET)', type: 'string', required: true },
        { key: 'receivedAt', label: 'Timestamp', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'respond_to_webhook',
      name: 'Custom Webhook Response',
      description: 'Sends a custom HTTP response code and JSON payload back to the webhook caller.',
      type: 'action',
      inputs: [
        { key: 'statusCode', label: 'HTTP Status Code (e.g. 200, 201, 202)', type: 'number', required: true },
        { key: 'responseBody', label: 'Response Body (JSON string or text)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'statusCode', label: 'Status Code Sent', type: 'number', required: true },
        { key: 'status', label: 'Status', type: 'string', required: true },
      ],
    },
  ],
};

export class WebhookTriggerConnector extends BaseConnector {
  manifest = webhookTriggerManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    try {
      if (actionId === 'respond_to_webhook') {
        const statusCode = inputs.statusCode || 200;
        return { success: true, data: { statusCode, status: 'response_sent' } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getWebhookTriggerChoices(fieldId, credentials);
  }
}

manifestRegistry.register(webhookTriggerManifest);
