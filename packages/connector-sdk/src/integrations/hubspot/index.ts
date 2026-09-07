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
    {
      id: 'contact_updated',
      name: 'Contact Updated',
      description: 'Triggers when a contact record is updated.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
      ],
    },
    {
      id: 'deal_created',
      name: 'Deal Created',
      description: 'Triggers when a new deal is created in HubSpot.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
      ],
    },
    {
      id: 'new_company',
      name: 'New Company Created',
      description: 'Triggers when a new company is created.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
      ],
    },
    {
      id: 'company_updated',
      name: 'Company Updated',
      description: 'Triggers when a company profile is updated.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
      ],
    },
    {
      id: 'new_ticket',
      name: 'New Ticket Created',
      description: 'Triggers when a support ticket is created.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'ticketId', label: 'Ticket ID', type: 'string', required: true },
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
    {
      id: 'update_contact',
      name: 'Update Contact',
      description: 'Updates properties of a contact.',
      type: 'action',
      inputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'firstname', label: 'First Name', type: 'string', required: false },
        { key: 'lastname', label: 'Last Name', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'delete_contact',
      name: 'Delete Contact',
      description: 'Deletes a contact from HubSpot.',
      type: 'action',
      inputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'get_contact_by_id',
      name: 'Get Contact Details',
      description: 'Retrieves details of a contact by ID.',
      type: 'action',
      inputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: false },
      ],
    },
    {
      id: 'get_deal',
      name: 'Get Deal Details',
      description: 'Retrieves deal properties by ID.',
      type: 'action',
      inputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
        { key: 'dealname', label: 'Deal Name', type: 'string', required: true },
      ],
    },
    {
      id: 'update_deal',
      name: 'Update Deal',
      description: 'Updates deal properties or stage.',
      type: 'action',
      inputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
        { key: 'dealname', label: 'Deal Name', type: 'string', required: false },
        { key: 'amount', label: 'Amount', type: 'number', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'delete_deal',
      name: 'Delete Deal',
      description: 'Deletes a deal record.',
      type: 'action',
      inputs: [
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'get_company',
      name: 'Get Company Details',
      description: 'Retrieves company details by ID.',
      type: 'action',
      inputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
        { key: 'name', label: 'Company Name', type: 'string', required: true },
      ],
    },
    {
      id: 'update_company',
      name: 'Update Company',
      description: 'Updates company properties.',
      type: 'action',
      inputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
        { key: 'name', label: 'Company Name', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'delete_company',
      name: 'Delete Company',
      description: 'Deletes a company record.',
      type: 'action',
      inputs: [
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'associate_contact_deal',
      name: 'Associate Contact to Deal',
      description: 'Links a contact to a deal.',
      type: 'action',
      inputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'dealId', label: 'Deal ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'associate_contact_company',
      name: 'Associate Contact to Company',
      description: 'Links a contact to a company.',
      type: 'action',
      inputs: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'companyId', label: 'Company ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'create_ticket',
      name: 'Create Support Ticket',
      description: 'Creates a new ticket record.',
      type: 'action',
      inputs: [
        { key: 'subject', label: 'Ticket Subject', type: 'string', required: true },
        { key: 'content', label: 'Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'ticketId', label: 'Ticket ID', type: 'string', required: true },
      ],
    },
    {
      id: 'update_ticket',
      name: 'Update Support Ticket',
      description: 'Updates a ticket record.',
      type: 'action',
      inputs: [
        { key: 'ticketId', label: 'Ticket ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'get_ticket',
      name: 'Get Ticket Details',
      description: 'Gets ticket details by ID.',
      type: 'action',
      inputs: [
        { key: 'ticketId', label: 'Ticket ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'ticketId', label: 'Ticket ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
      ],
    },
    {
      id: 'list_tickets',
      name: 'List Tickets',
      description: 'Lists support tickets.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'tickets', label: 'Tickets Array', type: 'array', required: true },
      ],
    },
    {
      id: 'create_task',
      name: 'Create Task',
      description: 'Creates an engagement task in HubSpot.',
      type: 'action',
      inputs: [
        { key: 'subject', label: 'Task Subject', type: 'string', required: true },
      ],
      outputs: [
        { key: 'taskId', label: 'Task ID', type: 'string', required: true },
      ],
    },
    {
      id: 'create_note',
      name: 'Create Note',
      description: 'Creates an engagement note on a record.',
      type: 'action',
      inputs: [
        { key: 'body', label: 'Note Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'noteId', label: 'Note ID', type: 'string', required: true },
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

        case 'update_contact': {
          await api.patch(`/contacts/${inputs.contactId}`, { properties: { firstname: inputs.firstname, lastname: inputs.lastname } });
          return { success: true, data: { success: true } };
        }

        case 'delete_contact': {
          await api.delete(`/contacts/${inputs.contactId}`);
          return { success: true, data: { success: true } };
        }

        case 'get_contact_by_id': {
          const { data } = await api.get(`/contacts/${inputs.contactId}`);
          return { success: true, data: { contactId: data.id, email: data.properties?.email } };
        }

        case 'get_deal': {
          const { data } = await api.get(`/deals/${inputs.dealId}`);
          return { success: true, data: { dealId: data.id, dealname: data.properties?.dealname } };
        }

        case 'update_deal': {
          await api.patch(`/deals/${inputs.dealId}`, { properties: { dealname: inputs.dealname, amount: inputs.amount } });
          return { success: true, data: { success: true } };
        }

        case 'delete_deal': {
          await api.delete(`/deals/${inputs.dealId}`);
          return { success: true, data: { success: true } };
        }

        case 'get_company': {
          const { data } = await api.get(`/companies/${inputs.companyId}`);
          return { success: true, data: { companyId: data.id, name: data.properties?.name } };
        }

        case 'update_company': {
          await api.patch(`/companies/${inputs.companyId}`, { properties: { name: inputs.name } });
          return { success: true, data: { success: true } };
        }

        case 'delete_company': {
          await api.delete(`/companies/${inputs.companyId}`);
          return { success: true, data: { success: true } };
        }

        case 'associate_contact_deal': {
          await api.put(`/contacts/${inputs.contactId}/associations/deals/${inputs.dealId}/contact_to_deal`);
          return { success: true, data: { success: true } };
        }

        case 'associate_contact_company': {
          await api.put(`/contacts/${inputs.contactId}/associations/companies/${inputs.companyId}/contact_to_company`);
          return { success: true, data: { success: true } };
        }

        case 'create_ticket': {
          const { data } = await api.post('/tickets', { properties: { hs_ticket_subject: inputs.subject, content: inputs.content } });
          return { success: true, data: { ticketId: data.id } };
        }

        case 'update_ticket': {
          await api.patch(`/tickets/${inputs.ticketId}`, { properties: { hs_ticket_subject: inputs.subject } });
          return { success: true, data: { success: true } };
        }

        case 'get_ticket': {
          const { data } = await api.get(`/tickets/${inputs.ticketId}`);
          return { success: true, data: { ticketId: data.id, subject: data.properties?.hs_ticket_subject } };
        }

        case 'list_tickets': {
          const { data } = await api.get('/tickets');
          return { success: true, data: { tickets: data.results || [] } };
        }

        case 'create_task': {
          const { data } = await api.post('/tasks', { properties: { hs_task_subject: inputs.subject } });
          return { success: true, data: { taskId: data.id } };
        }

        case 'create_note': {
          const { data } = await api.post('/notes', { properties: { hs_note_body: inputs.body } });
          return { success: true, data: { noteId: data.id } };
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
