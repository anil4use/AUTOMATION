import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getActiveCampaignChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const activecampaignManifest: ConnectorManifest = {
  id: 'activecampaign',
  name: 'ActiveCampaign',
  description: 'Full-power ActiveCampaign integration — Sync contacts, manage tags, update sales deals, trigger marketing automations & listen for subscriber webhooks.',
  category: 'Marketing & Email',
  icon: '/icons/activecampaign.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'contact_created',
      name: 'New Contact Created',
      description: 'Triggers when a new contact is added to ActiveCampaign.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Contact ID', type: 'string', required: true },
        { key: 'email', label: 'Email Address', type: 'string', required: true },
        { key: 'first_name', label: 'First Name', type: 'string', required: true },
        { key: 'last_name', label: 'Last Name', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'create_contact',
      name: 'Create or Update Contact',
      description: 'Creates a new contact or updates an existing contact by email.',
      type: 'action',
      inputs: [
        { key: 'email', label: 'Contact Email', type: 'string', required: true },
        { key: 'firstName', label: 'First Name', type: 'string', required: false },
        { key: 'lastName', label: 'Last Name', type: 'string', required: false },
        { key: 'phone', label: 'Phone Number', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Contact ID', type: 'string', required: true },
        { key: 'email', label: 'Contact Email', type: 'string', required: true },
      ],
    },
    {
      id: 'add_tag',
      name: 'Add Tag to Contact',
      description: 'Attaches a tag to a contact.',
      type: 'action',
      inputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'tagId', label: 'Tag ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Contact Tag Association ID', type: 'string', required: true },
      ],
    },
  ],
};

export class ActiveCampaignConnector extends BaseConnector {
  manifest = activecampaignManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const apiUrl = credentials.apiUrl;
    const apiKey = credentials.apiKey;

    if (!apiUrl || !apiKey) {
      return { success: false, data: {}, error: 'Missing ActiveCampaign API URL or API Key.' };
    }

    const headers = { 'Api-Token': apiKey, 'Content-Type': 'application/json' };
    const baseUrl = apiUrl.replace(/\/$/, '');

    try {
      if (actionId === 'create_contact') {
        const url = `${baseUrl}/api/3/contact/sync`;
        const body = { contact: { email: inputs.email, firstName: inputs.firstName || '', lastName: inputs.lastName || '', phone: inputs.phone || '' } };
        const res = await axios.post(url, body, { headers });
        const contact = res.data?.contact || {};
        return { success: true, data: { id: contact.id, email: contact.email } };
      }

      if (actionId === 'add_tag') {
        const url = `${baseUrl}/api/3/contactTags`;
        const body = { contactTag: { contact: inputs.contactId, tag: inputs.tagId } };
        const res = await axios.post(url, body, { headers });
        const association = res.data?.contactTag || {};
        return { success: true, data: { id: association.id } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.errors?.[0]?.title || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getActiveCampaignChoices(fieldId, credentials);
  }
}

manifestRegistry.register(activecampaignManifest);
