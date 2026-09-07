import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getGmailChoices } from './choices';
import axios from 'axios';

const gmailManifest: ConnectorManifest = {
  id: 'gmail',
  name: 'Gmail',
  description: 'Full-power Gmail integration — Read, search, send emails, reply, manage attachments, drafts, labels & trigger automations on real Gmail messages.',
  category: 'Communication',
  icon: '/icons/gmail.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_email',
      name: 'New Email Received',
      description: 'Triggers when a new email matches your Gmail search query.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      rateLimitInfo: { minPollIntervalSeconds: 60, maxResultsPerPoll: 50 },
      inputs: [
        { key: 'query', label: 'Search Query (e.g. is:unread label:INBOX)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'from', label: 'Sender Email', type: 'string', required: true },
        { key: 'to', label: 'Recipient Email', type: 'string', required: true },
        { key: 'body', label: 'Email Content (Text/HTML)', type: 'string', required: true },
        { key: 'snippet', label: 'Snippet Summary', type: 'string', required: false },
        { key: 'date', label: 'Date Received', type: 'string', required: false },
      ],
    },
    {
      id: 'new_labeled_email',
      name: 'New Labeled Email',
      description: 'Triggers when an email receives a specific label.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      inputs: [
        { key: 'labelId', label: 'Label', type: 'string', required: true, dynamicChoice: { endpoint: 'labelId' } },
      ],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'from', label: 'Sender Email', type: 'string', required: true },
      ],
    },
    {
      id: 'new_attachment',
      name: 'New Email with Attachment',
      description: 'Triggers when a new email containing attachments is received.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      inputs: [
        { key: 'query', label: 'Additional Search Query', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'from', label: 'Sender', type: 'string', required: true },
        { key: 'attachmentNames', label: 'Attachment Names', type: 'array', required: true },
      ],
    },
    {
      id: 'new_starred_email',
      name: 'New Starred Email',
      description: 'Triggers when an email is starred.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'from', label: 'Sender Email', type: 'string', required: true },
      ],
    },
    {
      id: 'new_sent_email',
      name: 'New Sent Email',
      description: 'Triggers when you send an email.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      inputs: [],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'to', label: 'Recipient', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
      ],
    },
    {
      id: 'email_thread_updated',
      name: 'Email Thread Updated',
      description: 'Triggers when a message is added to an existing thread.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      inputs: [
        { key: 'threadId', label: 'Thread ID (Optional filter)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
        { key: 'latestMessageId', label: 'Latest Message ID', type: 'string', required: true },
        { key: 'messageCount', label: 'Message Count', type: 'number', required: true },
      ],
    },
    {
      id: 'draft_created',
      name: 'New Draft Created',
      description: 'Triggers when a new email draft is created.',
      type: 'trigger',
      deliveryMethod: 'polling',
      pollingCursorField: 'internalDate',
      inputs: [],
      outputs: [
        { key: 'draftId', label: 'Draft ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: false },
      ],
    },
  ],
  actions: [
    {
      id: 'send_email',
      name: 'Send Email',
      description: 'Sends a formatted email message to specified recipients.',
      type: 'action',
      inputs: [
        { key: 'to', label: 'Recipient Email', type: 'string', required: true },
        { key: 'subject', label: 'Subject Line', type: 'string', required: true },
        { key: 'body', label: 'Email Content (HTML or Plain Text)', type: 'string', required: true },
        { key: 'cc', label: 'CC (Optional)', type: 'string', required: false },
        { key: 'bcc', label: 'BCC (Optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
      ],
    },
    {
      id: 'send_email_with_attachments',
      name: 'Send Email with Attachments',
      description: 'Sends an email with base64 encoded attachments.',
      type: 'action',
      inputs: [
        { key: 'to', label: 'Recipient Email', type: 'string', required: true },
        { key: 'subject', label: 'Subject Line', type: 'string', required: true },
        { key: 'body', label: 'Email Content', type: 'string', required: true },
        { key: 'attachments', label: 'Attachments (JSON array of { filename, contentBase64, mimeType })', type: 'string', required: true },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'reply_to_email',
      name: 'Reply to Email',
      description: 'Replies to a specific email thread.',
      type: 'action',
      inputs: [
        { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
        { key: 'messageId', label: 'Original Message ID', type: 'string', required: true },
        { key: 'body', label: 'Reply Body', type: 'string', required: true },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'forward_email',
      name: 'Forward Email',
      description: 'Forwards an existing email to new recipients.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID to Forward', type: 'string', required: true },
        { key: 'to', label: 'Forward To Email', type: 'string', required: true },
        { key: 'comment', label: 'Optional Additional Comment', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'New Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'read_emails',
      name: 'Search & Read Emails',
      description: 'Searches and retrieves real emails matching your query.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'maxResults', label: 'Max Results (Default: 5)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'count', label: 'Emails Found', type: 'number', required: true },
        { key: 'emails', label: 'List of Email Objects', type: 'array', required: true },
      ],
    },
    {
      id: 'get_email',
      name: 'Get Single Email by ID',
      description: 'Retrieves full details of a specific Gmail message.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Gmail Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'subject', label: 'Subject', type: 'string', required: true },
        { key: 'from', label: 'Sender', type: 'string', required: true },
        { key: 'to', label: 'Recipient', type: 'string', required: true },
        { key: 'body', label: 'Body Text/HTML', type: 'string', required: true },
        { key: 'snippet', label: 'Snippet', type: 'string', required: false },
      ],
    },
    {
      id: 'get_email_thread',
      name: 'Get Email Thread',
      description: 'Retrieves all messages in a thread.',
      type: 'action',
      inputs: [
        { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'threadId', label: 'Thread ID', type: 'string', required: true },
        { key: 'messages', label: 'Messages Array', type: 'array', required: true },
      ],
    },
    {
      id: 'create_draft',
      name: 'Create Email Draft',
      description: 'Creates a draft email in your Gmail account.',
      type: 'action',
      inputs: [
        { key: 'to', label: 'Recipient Email', type: 'string', required: true },
        { key: 'subject', label: 'Subject Line', type: 'string', required: true },
        { key: 'body', label: 'Draft Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'draftId', label: 'Draft ID', type: 'string', required: true },
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'send_draft',
      name: 'Send Draft Email',
      description: 'Sends an existing draft by Draft ID.',
      type: 'action',
      inputs: [
        { key: 'draftId', label: 'Draft ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'add_label_to_email',
      name: 'Add Label to Email',
      description: 'Applies a label to an email message.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'labelId', label: 'Label', type: 'string', required: true, dynamicChoice: { endpoint: 'labelId' } },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'remove_label_from_email',
      name: 'Remove Label from Email',
      description: 'Removes a label from an email message.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'labelId', label: 'Label', type: 'string', required: true, dynamicChoice: { endpoint: 'labelId' } },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'create_label',
      name: 'Create New Label',
      description: 'Creates a new user label in Gmail.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Label Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'labelId', label: 'New Label ID', type: 'string', required: true },
      ],
    },
    {
      id: 'mark_as_read',
      name: 'Mark Email as Read',
      description: 'Removes the UNREAD label from an email.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'mark_as_unread',
      name: 'Mark Email as Unread',
      description: 'Adds the UNREAD label to an email.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'star_email',
      name: 'Star Email',
      description: 'Adds STARRED label to an email.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'unstar_email',
      name: 'Unstar Email',
      description: 'Removes STARRED label from an email.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'archive_email',
      name: 'Archive Email',
      description: 'Removes INBOX label from an email.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'trash_email',
      name: 'Trash Email',
      description: 'Moves an email to the Trash.',
      type: 'action',
      inputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
  ],
};

export class GmailConnector extends BaseConnector {
  manifest = gmailManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.accessToken || credentials?.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Gmail access token is required.' };
    }

    const headers = { Authorization: `Bearer ${token}` };
    const api = axios.create({ baseURL: 'https://gmail.googleapis.com/gmail/v1/users/me', headers });

    try {
      switch (actionId) {
        case 'send_email': {
          const rawMessage = [
            `To: ${inputs.to}`,
            inputs.cc ? `Cc: ${inputs.cc}` : '',
            inputs.bcc ? `Bcc: ${inputs.bcc}` : '',
            `Subject: ${inputs.subject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            inputs.body,
          ].filter(Boolean).join('\r\n');

          const base64Encoded = Buffer.from(rawMessage).toString('base64url');
          const { data } = await api.post('/messages/send', { raw: base64Encoded });
          return { success: true, data: { messageId: data.id, threadId: data.threadId } };
        }

        case 'read_emails': {
          const max = inputs.maxResults || 5;
          const { data: listData } = await api.get('/messages', { params: { q: inputs.query, maxResults: max } });
          const messages = listData.messages || [];

          const detailed = await Promise.all(
            messages.map(async (m: any) => {
              const { data: detail } = await api.get(`/messages/${m.id}`);
              const headersArr = detail.payload?.headers || [];
              const getHeader = (n: string) => headersArr.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
              return {
                id: detail.id,
                threadId: detail.threadId,
                subject: getHeader('Subject'),
                from: getHeader('From'),
                snippet: detail.snippet,
                date: getHeader('Date'),
              };
            })
          );

          return { success: true, data: { count: detailed.length, emails: detailed } };
        }

        case 'get_email': {
          const { data } = await api.get(`/messages/${inputs.messageId}`);
          const headersArr = data.payload?.headers || [];
          const getHeader = (n: string) => headersArr.find((h: any) => h.name.toLowerCase() === n.toLowerCase())?.value || '';
          return {
            success: true,
            data: {
              id: data.id,
              threadId: data.threadId,
              subject: getHeader('Subject'),
              from: getHeader('From'),
              to: getHeader('To'),
              body: data.snippet,
              snippet: data.snippet,
              date: getHeader('Date'),
            },
          };
        }

        case 'get_email_thread': {
          const { data } = await api.get(`/threads/${inputs.threadId}`);
          return { success: true, data: { threadId: data.id, messages: data.messages || [] } };
        }

        case 'create_draft': {
          const rawMessage = [
            `To: ${inputs.to}`,
            `Subject: ${inputs.subject}`,
            'Content-Type: text/html; charset=utf-8',
            '',
            inputs.body,
          ].join('\r\n');

          const base64Encoded = Buffer.from(rawMessage).toString('base64url');
          const { data } = await api.post('/drafts', { message: { raw: base64Encoded } });
          return { success: true, data: { draftId: data.id, messageId: data.message?.id } };
        }

        case 'send_draft': {
          const { data } = await api.post('/drafts/send', { id: inputs.draftId });
          return { success: true, data: { messageId: data.id } };
        }

        case 'add_label_to_email': {
          await api.post(`/messages/${inputs.messageId}/modify`, { addLabelIds: [inputs.labelId] });
          return { success: true, data: { success: true } };
        }

        case 'remove_label_from_email': {
          await api.post(`/messages/${inputs.messageId}/modify`, { removeLabelIds: [inputs.labelId] });
          return { success: true, data: { success: true } };
        }

        case 'create_label': {
          const { data } = await api.post('/labels', { name: inputs.name });
          return { success: true, data: { labelId: data.id } };
        }

        case 'mark_as_read': {
          await api.post(`/messages/${inputs.messageId}/modify`, { removeLabelIds: ['UNREAD'] });
          return { success: true, data: { success: true } };
        }

        case 'mark_as_unread': {
          await api.post(`/messages/${inputs.messageId}/modify`, { addLabelIds: ['UNREAD'] });
          return { success: true, data: { success: true } };
        }

        case 'star_email': {
          await api.post(`/messages/${inputs.messageId}/modify`, { addLabelIds: ['STARRED'] });
          return { success: true, data: { success: true } };
        }

        case 'unstar_email': {
          await api.post(`/messages/${inputs.messageId}/modify`, { removeLabelIds: ['STARRED'] });
          return { success: true, data: { success: true } };
        }

        case 'archive_email': {
          await api.post(`/messages/${inputs.messageId}/modify`, { removeLabelIds: ['INBOX'] });
          return { success: true, data: { success: true } };
        }

        case 'trash_email': {
          await api.post(`/messages/${inputs.messageId}/trash`);
          return { success: true, data: { success: true } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Gmail action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Gmail API error';
      return { success: false, data: {}, error: `Gmail error: ${msg}` };
    }
  }
}

export const gmailConnector = new GmailConnector();
manifestRegistry.register(gmailManifest);
export { getGmailChoices };
