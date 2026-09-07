import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getHubSpotChoices } from './choices';
import { registerHubSpotWebhook, deregisterHubSpotWebhook } from './webhook';
import axios from 'axios';

const hubspotManifest: ConnectorManifest = {
  id: 'hubspot',
  name: 'HubSpot CRM',
  description: 'Full-power HubSpot CRM integration — Create & search contacts, deals, companies, add notes, manage pipelines & trigger automations on CRM webhooks.',
  category: 'CRM',
  icon: '/icons/hubspot.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'contact_created',
      name: 'New Contact Created',
      description: 'Triggers when a new contact is added to HubSpot.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: true },
        { key: 'firstname', label: 'First Name', type: 'string', required: false },
        { key: 'lastname', label: 'Last Name', type: 'string', required: false },
      ],
    },
    {
      id: 'deal_stage_changed',
      name: 'Deal Stage Changed',
      description: 'Triggers when a deal moves to a new pipeline stage.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
        { key: 'dealName', label: 'Deal Name', type: 'string', required: true },
        { key: 'stageId', label: 'New Stage ID', type: 'string', required: true },
        { key: 'amount', label: 'Deal Amount', type: 'number', required: false },
      ],
    },
  ],
  actions: [
    {
      id: 'create_contact',
      name: 'Create Contact',
      description: 'Creates a new CRM contact record.',
      type: 'action',
      inputs: [
        { key: 'email', label: 'Email Address', type: 'string', required: true },
        { key: 'firstname', label: 'First Name', type: 'string', required: false },
        { key: 'lastname', label: 'Last Name', type: 'string', required: false },
        { key: 'phone', label: 'Phone Number', type: 'string', required: false },
        { key: 'company', label: 'Company Name', type: 'string', required: false },
      ],
      outputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_contact_by_email',
      name: 'Get Contact by Email',
      description: 'Finds a contact record by email address.',
      type: 'action',
      inputs: [
        { key: 'email', label: 'Email Address', type: 'string', required: true },
      ],
      outputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: true },
        { key: 'firstname', label: 'First Name', type: 'string', required: false },
        { key: 'lastname', label: 'Last Name', type: 'string', required: false },
      ],
    },
    {
      id: 'search_contacts',
      name: 'Search Contacts',
      description: 'Searches contacts in HubSpot CRM by query term.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
      ],
      outputs: [
        { key: 'count', label: 'Count', type: 'number', required: true },
        { key: 'contacts', label: 'Contacts Array', type: 'array', required: true },
      ],
    },
    {
      id: 'create_deal',
      name: 'Create Deal',
      description: 'Creates a new sales deal record.',
      type: 'action',
      inputs: [
        { key: 'dealname', label: 'Deal Name', type: 'string', required: true },
        { key: 'dealStage', label: 'Pipeline Stage', type: 'string', required: true, dynamicChoice: { endpoint: 'dealStage' } },
        { key: 'amount', label: 'Deal Amount', type: 'number', required: false },
        { key: 'closedate', label: 'Target Close Date (YYYY-MM-DD)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
      ],
    },
    {
      id: 'create_company',
      name: 'Create Company',
      description: 'Creates a company record.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Company Name', type: 'string', required: true },
        { key: 'domain', label: 'Company Domain (e.g. acme.com)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
      ],
    },
  ],
};

export class HubSpotConnector extends BaseConnector {
  manifest = hubspotManifest;

  async registerWebhook(credentials: { accessToken: string }, appId: string, eventType?: string) {
    return registerHubSpotWebhook(credentials, appId, eventType);
  }

  async deregisterWebhook(credentials: { accessToken: string }, appId: string, subscriptionId: string) {
    return deregisterHubSpotWebhook(credentials, appId, subscriptionId);
  }

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.accessToken || credentials?.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'HubSpot Private App Access Token is required.' };
    }

    const api = axios.create({
      baseURL: 'https://api.hubapi.com/crm/v3/objects',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    try {
      switch (actionId) {
        case 'create_contact': {
          const properties: any = {
            email: inputs.email,
            firstname: inputs.firstname || undefined,
            lastname: inputs.lastname || undefined,
            phone: inputs.phone || undefined,
            company: inputs.company || undefined,
          };
          const { data } = await api.post('/contacts', { properties });
          return { success: true, data: { contactId: data.id } };
        }

        case 'get_contact_by_email': {
          const searchRes = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts/search',
            {
              filterGroups: [
                { filters: [{ propertyName: 'email', operator: 'EQ', value: inputs.email }] },
              ],
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const contact = searchRes.data.results?.[0];
          if (!contact) return { success: false, data: {}, error: `No contact found with email: ${inputs.email}` };

          return {
            success: true,
            data: {
              contactId: contact.id,
              email: contact.properties?.email,
              firstname: contact.properties?.firstname,
              lastname: contact.properties?.lastname,
            },
          };
        }

        case 'search_contacts': {
          const searchRes = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts/search',
            { query: inputs.query },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return {
            success: true,
            data: { count: searchRes.data.results?.length || 0, contacts: searchRes.data.results || [] },
          };
        }

        case 'create_deal': {
          const properties: any = {
            dealname: inputs.dealname,
            dealstage: inputs.dealStage,
            amount: inputs.amount ? String(inputs.amount) : undefined,
            closedate: inputs.closedate || undefined,
          };
          const { data } = await api.post('/deals', { properties });
          return { success: true, data: { dealId: data.id } };
        }

        case 'create_company': {
          const properties: any = {
            name: inputs.name,
            domain: inputs.domain || undefined,
          };
          const { data } = await api.post('/companies', { properties });
          return { success: true, data: { companyId: data.id } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported HubSpot action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'HubSpot API error';
      return { success: false, data: {}, error: `HubSpot error: ${msg}` };
    }
  }
}

export const hubspotConnector = new HubSpotConnector();
manifestRegistry.register(hubspotManifest);
export { getHubSpotChoices };
