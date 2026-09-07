import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getMetaMessengerChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const metaMessengerManifest: ConnectorManifest = {
  id: 'meta-messenger',
  name: 'Meta Messenger',
  description: 'Full-power Meta Messenger integration — Send automated replies, rich media buttons, quick replies & trigger on customer messages.',
  category: 'Communication',
  icon: '/icons/messenger.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'inbound_message',
      name: 'Inbound Customer Message',
      description: 'Triggers when a customer sends a DM message to your Page.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'sender_id', label: 'Sender PSID', type: 'string', required: true },
        { key: 'message_text', label: 'Message Text', type: 'string', required: true },
        { key: 'timestamp', label: 'Received Time', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_message',
      name: 'Send Messenger Message',
      description: 'Sends a direct message reply to a customer PSID.',
      type: 'action',
      inputs: [
        { key: 'recipient_psid', label: 'Customer Page-Scoped User ID (PSID)', type: 'string', required: true },
        { key: 'text', label: 'Message Text Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'recipient_id', label: 'Recipient PSID', type: 'string', required: true },
        { key: 'message_id', label: 'Message ID', type: 'string', required: true },
      ],
    },
  ],
};

export class MetaMessengerConnector extends BaseConnector {
  manifest = metaMessengerManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Page Access Token for Messenger.' };
    }

    try {
      if (actionId === 'send_message') {
        const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${token}`;
        const body = {
          recipient: { id: inputs.recipient_psid },
          message: { text: inputs.text },
        };
        const res = await axios.post(url, body);
        return { success: true, data: { recipient_id: res.data.recipient_id, message_id: res.data.message_id } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getMetaMessengerChoices(fieldId, credentials);
  }
}

manifestRegistry.register(metaMessengerManifest);
