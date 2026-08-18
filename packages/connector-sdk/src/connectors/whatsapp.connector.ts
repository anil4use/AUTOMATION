import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class WhatsAppConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Listen for inbound messages and dispatch template messages to contacts.',
    category: 'Messaging',
    icon: '/icons/whatsapp.svg',
    authType: 'api_key',
    triggers: [
      {
        id: 'new_message',
        name: 'New Message Received',
        description: 'Triggers when a contact sends a WhatsApp message.',
        type: 'trigger',
        inputs: [{ key: 'phoneNumberId', label: 'Phone Number ID', type: 'string', required: true }],
        outputs: [
          { key: 'messageId', label: 'Message ID', type: 'string', required: true },
          { key: 'from', label: 'From Phone', type: 'string', required: true },
          { key: 'text', label: 'Message Text', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_message',
        name: 'Send WhatsApp Message',
        description: 'Dispatches a message payload to a specified phone number.',
        type: 'action',
        inputs: [
          { key: 'toPhone', label: 'Recipient Phone', type: 'string', required: true },
          { key: 'text', label: 'Message Text', type: 'string', required: true },
        ],
        outputs: [
          { key: 'messageId', label: 'Message ID', type: 'string', required: true },
          { key: 'status', label: 'Status', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return {
      success: true,
      data: {
        messageId: `wmid_${Date.now()}`,
        toPhone: context.stepInput.toPhone || '+15550199',
        status: 'sent',
      },
    };
  }
}
