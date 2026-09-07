import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getMsTeamsChoices } from './choices';
export * from './choices';
import axios from 'axios';

export const msTeamsManifest: ConnectorManifest = {
  id: 'ms-teams',
  name: 'Microsoft Teams',
  description: 'Full-power Microsoft Teams integration — Send channel messages, reply to threads, post adaptive cards, create channels, manage team members & trigger on new team events.',
  category: 'Communication',
  icon: '/icons/teams.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_channel_message',
      name: 'New Channel Message',
      description: 'Triggers when a message is posted to a Teams channel.',
      type: 'trigger',
      deliveryMethod: 'polling',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
        { key: 'channelId', label: 'Channel', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'teamId', dynamicChoice: { endpoint: 'channelId' } },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'content', label: 'Message Text', type: 'string', required: true },
        { key: 'sender', label: 'Sender Name', type: 'string', required: true },
        { key: 'createdDateTime', label: 'Sent Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'user_mentioned',
      name: 'User Mentioned',
      description: 'Triggers when a user is tagged in a Teams message.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'content', label: 'Message Text', type: 'string', required: true },
        { key: 'sender', label: 'Sender', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_channel_message',
      name: 'Send Channel Message',
      description: 'Posts a chat message to a Microsoft Teams channel.',
      type: 'action',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
        { key: 'channelId', label: 'Channel', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'teamId', dynamicChoice: { endpoint: 'channelId' } },
        { key: 'content', label: 'Message Content (HTML / Markdown)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
        { key: 'createdDateTime', label: 'Sent Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'reply_to_thread',
      name: 'Reply to Message Thread',
      description: 'Replies directly to an existing channel message thread.',
      type: 'action',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
        { key: 'channelId', label: 'Channel', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'teamId', dynamicChoice: { endpoint: 'channelId' } },
        { key: 'messageId', label: 'Parent Message ID', type: 'string', required: true },
        { key: 'content', label: 'Reply Text Content', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Reply Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'send_adaptive_card',
      name: 'Post Adaptive Card',
      description: 'Sends a rich interactive Microsoft Adaptive Card to a channel.',
      type: 'action',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
        { key: 'channelId', label: 'Channel', type: 'string', required: true, hasDynamicChoices: true, dependsOn: 'teamId', dynamicChoice: { endpoint: 'channelId' } },
        { key: 'cardJson', label: 'Adaptive Card JSON Payload', type: 'string', required: true },
      ],
      outputs: [
        { key: 'id', label: 'Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'create_channel',
      name: 'Create Team Channel',
      description: 'Creates a new public or private channel in a Team.',
      type: 'action',
      inputs: [
        { key: 'teamId', label: 'Team', type: 'string', required: true, hasDynamicChoices: true, dynamicChoice: { endpoint: 'teamId' } },
        { key: 'displayName', label: 'Channel Name', type: 'string', required: true },
        { key: 'description', label: 'Channel Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'id', label: 'Channel ID', type: 'string', required: true },
        { key: 'webUrl', label: 'Channel Web URL', type: 'string', required: true },
      ],
    },
  ],
};

export class MsTeamsConnector extends BaseConnector {
  manifest = msTeamsManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const token = credentials.accessToken || credentials.apiKey || credentials.token;

    if (!token) {
      return { success: false, data: {}, error: 'Missing Microsoft OAuth access token.' };
    }

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
      if (actionId === 'send_channel_message') {
        const url = `https://graph.microsoft.com/v1.0/teams/${inputs.teamId}/channels/${inputs.channelId}/messages`;
        const body = { body: { content: inputs.content, contentType: 'html' } };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id, createdDateTime: res.data.createdDateTime } };
      }

      if (actionId === 'reply_to_thread') {
        const url = `https://graph.microsoft.com/v1.0/teams/${inputs.teamId}/channels/${inputs.channelId}/messages/${inputs.messageId}/replies`;
        const body = { body: { content: inputs.content } };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id } };
      }

      if (actionId === 'send_adaptive_card') {
        const url = `https://graph.microsoft.com/v1.0/teams/${inputs.teamId}/channels/${inputs.channelId}/messages`;
        const cardObj = typeof inputs.cardJson === 'string' ? JSON.parse(inputs.cardJson) : inputs.cardJson;
        const body = {
          attachments: [
            {
              contentType: 'application/vnd.microsoft.card.adaptive',
              contentUrl: null,
              content: cardObj,
            },
          ],
        };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id } };
      }

      if (actionId === 'create_channel') {
        const url = `https://graph.microsoft.com/v1.0/teams/${inputs.teamId}/channels`;
        const body = { displayName: inputs.displayName, description: inputs.description || '' };
        const res = await axios.post(url, body, { headers });
        return { success: true, data: { id: res.data.id, webUrl: res.data.webUrl } };
      }

      return { success: false, data: {}, error: `Unsupported action ID: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err.response?.data?.error?.message || err.message };
    }
  }

  async getChoices(fieldId: string, credentials: Record<string, any>, dependsOnValues?: Record<string, any>) {
    return getMsTeamsChoices(fieldId, credentials, dependsOnValues);
  }
}

manifestRegistry.register(msTeamsManifest);
