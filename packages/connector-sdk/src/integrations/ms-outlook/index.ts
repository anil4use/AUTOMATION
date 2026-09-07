import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getMsOutlookChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const msOutlookManifest: ConnectorManifest = {
  id: 'ms-outlook',
  name: 'Microsoft Outlook',
  description: 'Full-power Microsoft Outlook integration — Send emails, search inbox, manage attachments, create mail folders & trigger on new inbound emails.',
  category: 'Communication',
  icon: '/icons/outlook.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_email',
      name: 'New Inbound Email',
      description: 'Triggers when a new email arrives in your Outlook inbox or target folder.',
      type: 'trigger',
      deliveryMethod: 'polling',
      inputs: [
        { key: 'folderId', label: 'Mail Folder', type: 'string', required: false, hasDynamicChoices: true, dynamicChoice: { endpoint: 'folderId' } },
        { key: 'searchQuery', label: 'Filter Query (e.g. subject:Invoice)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'from', label: 'Sender Email', type: 'string', required: true },
        { key: 'to', label: 'Recipient Emails', type: 'string', required: true },
        { key: 'bodyPreview', label: 'Body Snippet', type: 'string', required: true },
        { key: 'receivedDateTime', label: 'Received Time', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_email',
      name: 'Send Email Message',
      description: 'Sends an email using Microsoft Graph Mail API.',
      type: 'action',
      inputs: [
        { key: 'to', label: 'Recipient Email (To)', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'body', label: 'Message Body (HTML or Text)', type: 'string', required: true },
        { key: 'cc', label: 'CC Recipient Emails', type: 'string', required: false },
      ],
      outputs: [
        { key: 'status', label: 'Delivery Status', type: 'string', required: true },
      ],
    },
    {
      id: 'search_emails',
      name: 'Search Emails',
      description: 'Searches Outlook inbox messages matching a search term.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'maxResults', label: 'Max Results Count (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'emails', label: 'Emails Array', type: 'json', required: true },
        { key: 'count', label: 'Found Email Count', type: 'number', required: true },
      ],
    },
  ],
};

export class MsOutlookConnector extends BaseConnector {
  manifest = msOutlookManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Microsoft Outlook access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'send_email') {
        const url = 'https://graph.microsoft.com/v1.0/me/sendMail';
        const body = {
          message: {
            subject: inputs.subject,
            body: { contentType: 'HTML', content: inputs.body },
            toRecipients: [{ emailAddress: { address: inputs.to } }],
          },
          saveToSentItems: true,
        };
        await axios.post(url, body, { headers });
        return { success: true, data: { status: 'sent' } };
      }

      if (actionId === 'search_emails') {
        const query = encodeURIComponent(inputs.query);
        const top = inputs.maxResults || 10;
        const url = `https://graph.microsoft.com/v1.0/me/messages?$search="${query}"&$top=${top}`;
        const res = await axios.get(url, { headers });
        const emails = res.data?.value || [];
        return { success: true, data: { emails, count: emails.length } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>) {
    return getMsOutlookChoices(fieldId, credentials);
  }
}

manifestRegistry.register(msOutlookManifest);
