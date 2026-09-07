import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getMailchimpChoices } from './choices';
export * from './choices';
import axios from 'axios';
import crypto from 'crypto';

export const mailchimpManifest: ConnectorManifest = {
  id: 'mailchimp',
  name: 'Mailchimp',
  description: 'Full-power Mailchimp integration — Add/remove subscribers, manage tags, create email campaigns, trigger automations on new subscribers or campaign events.',
  category: 'Marketing & Email',
  icon: '/icons/mailchimp.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_subscriber',
      name: 'New Subscriber Joined',
      description: 'Triggers when a new contact subscribes to an audience list.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'listId', label: 'Audience List', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'listId' } },
      ],
      outputs: [
        { key: 'email', label: 'Subscriber Email', type: 'string', required: true },
        { key: 'fname', label: 'First Name', type: 'string', required: true },
        { key: 'lname', label: 'Last Name', type: 'string', required: true },
        { key: 'list_id', label: 'Audience List ID', type: 'string', required: true },
      ],
    },
    {
      id: 'unsubscribe',
      name: 'Contact Unsubscribed',
      description: 'Triggers when a subscriber opts out of an audience list.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'listId', label: 'Audience List', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'listId' } },
      ],
      outputs: [
        { key: 'email', label: 'Subscriber Email', type: 'string', required: true },
        { key: 'action', label: 'Action Type', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'add_subscriber',
      name: 'Add / Update Subscriber',
      description: 'Adds a new contact to an audience list or updates their info.',
      type: 'action',
      inputs: [
        { key: 'listId', label: 'Audience List', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'listId' } },
        { key: 'email', label: 'Subscriber Email Address', type: 'string', required: true },
        { key: 'first_name', label: 'First Name', type: 'string', required: false },
        { key: 'last_name', label: 'Last Name', type: 'string', required: false },
        { key: 'tags', label: 'Member Tags (Comma separated e.g. Customer,VIP)', type: 'string', required: false },
        { key: 'status', label: 'Subscription Status (subscribed, pending, unsubscribed)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Subscriber Member Hash', type: 'string', required: true },
        { key: 'email_address', label: 'Email Address', type: 'string', required: true },
        { key: 'status', label: 'Member Status', type: 'string', required: true },
      ],
    },
    {
      id: 'remove_subscriber',
      name: 'Archive / Delete Subscriber',
      description: 'Removes or unsubscribes a member from an audience list.',
      type: 'action',
      inputs: [
        { key: 'listId', label: 'Audience List', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'listId' } },
        { key: 'email', label: 'Subscriber Email Address', type: 'string', required: true },
      ],
      outputs: [
        { key: 'status', label: 'Deletion Status', type: 'string', required: true },
      ],
    },
  ],
};

export class MailchimpConnector extends BaseConnector {
  manifest = mailchimpManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const apiKey = credentials.apiKey || credentials.accessToken;

    if (!apiKey) {
      return { success: false, data: {}, error: 'Missing Mailchimp API key.' };
    }

    const dc = apiKey.split('-')[1] || 'us1';
    const headers = { Authorization: `apikey ${apiKey}`, 'Content-Type': 'application/json' };
    const baseUrl = `https://${dc}.api.mailchimp.com/3.0`;

    try {
      if (actionId === 'add_subscriber') {
        const subscriberHash = crypto.createHash('md5').update(inputs.email.toLowerCase().trim()).digest('hex');
        const url = `${baseUrl}/lists/${inputs.listId}/members/${subscriberHash}`;
        const tagsArr = inputs.tags ? inputs.tags.split(',').map((t: string) => t.trim()) : [];
        const body = {
          email_address: inputs.email,
          status_if_new: inputs.status || 'subscribed',
          merge_fields: { FNAME: inputs.first_name || '', LNAME: inputs.last_name || '' },
          tags: tagsArr,
        };
        const res = await axios.put(url, body, { headers });
        return { success: true, data: { id: res.data.id, email_address: res.data.email_address, status: res.data.status } };
      }

      if (actionId === 'remove_subscriber') {
        const subscriberHash = crypto.createHash('md5').update(inputs.email.toLowerCase().trim()).digest('hex');
        const url = `${baseUrl}/lists/${inputs.listId}/members/${subscriberHash}`;
        await axios.delete(url, { headers });
        return { success: true, data: { status: 'deleted' } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.title || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getMailchimpChoices(fieldId, credentials);
  }
}

manifestRegistry.register(mailchimpManifest);
