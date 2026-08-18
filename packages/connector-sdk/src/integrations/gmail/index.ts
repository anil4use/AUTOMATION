import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class GmailConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'gmail',
    name: 'Gmail',
    description: 'Trigger automations on new emails and send formatted email messages.',
    category: 'Communication',
    icon: '/icons/gmail.svg',
    authType: 'oauth2',
    triggers: [
      {
        id: 'new_email',
        name: 'New Email Received',
        description: 'Triggers when a new email matches search criteria.',
        type: 'trigger',
        inputs: [{ key: 'query', label: 'Search Query', type: 'string', required: false }],
        outputs: [
          { key: 'subject', label: 'Subject', type: 'string', required: true },
          { key: 'from', label: 'Sender', type: 'string', required: true },
          { key: 'body', label: 'Body Text', type: 'string', required: true },
        ],
      },
    ],
    actions: [
      {
        id: 'send_email',
        name: 'Send Email',
        description: 'Sends an email to specified recipients.',
        type: 'action',
        inputs: [
          { key: 'to', label: 'Recipient Email', type: 'string', required: true },
          { key: 'subject', label: 'Subject', type: 'string', required: true },
          { key: 'body', label: 'Body Text', type: 'string', required: true },
        ],
        outputs: [{ key: 'messageId', label: 'Message ID', type: 'string', required: true }],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    if (actionId === 'send_email') {
      return {
        success: true,
        data: { messageId: `msg_${Date.now()}`, to: context.stepInput.to, subject: context.stepInput.subject },
      };
    }
    throw new Error(`Unsupported action: ${actionId}`);
  }
}
