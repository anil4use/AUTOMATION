import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class HttpRequestConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'http-request',
    name: 'Custom Webhook / HTTP Request',
    description: 'Send custom REST API HTTP GET, POST, PUT, or DELETE requests.',
    category: 'Developer Tools',
    icon: '/icons/webhook.svg',
    authType: 'none',
    triggers: [
      {
        id: 'inbound_webhook',
        name: 'Inbound Webhook Trigger',
        description: 'Triggers when an external HTTP POST request hits your unique webhook endpoint.',
        type: 'trigger',
        inputs: [{ key: 'endpointPath', label: 'Endpoint Path', type: 'string', required: true }],
        outputs: [
          { key: 'body', label: 'Body Payload', type: 'object', required: true },
          { key: 'headers', label: 'Headers', type: 'object', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'custom_api_call',
        name: 'HTTP Request Call',
        description: 'Sends a custom REST API HTTP request to any external endpoint.',
        type: 'action',
        inputs: [
          { key: 'url', label: 'API Endpoint URL', type: 'string', required: true },
          { key: 'method', label: 'HTTP Method', type: 'string', required: true },
        ],
        outputs: [
          { key: 'statusCode', label: 'Status Code', type: 'number', required: true },
          { key: 'responseData', label: 'Response Data', type: 'object', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return {
      success: true,
      data: {
        statusCode: 200,
        url: context.stepInput.url || 'https://api.example.com/v1',
        method: context.stepInput.method || 'POST',
        responseData: { success: true, timestamp: new Date().toISOString() },
      },
    };
  }
}
