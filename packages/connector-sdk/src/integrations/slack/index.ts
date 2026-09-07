import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { getSlackChoices } from './choices';
import axios from 'axios';

const slackManifest: ConnectorManifest = {
  id: 'slack',
  name: 'Slack',
  description: 'Full-power Slack integration — Post messages, rich Block Kit cards, manage channels, DMs, reactions, files, pins, user status & trigger real-time workspace event automations.',
  category: 'Communication',
  icon: '/icons/slack.svg',
  authType: 'oauth2',
  triggers: [
    {
      id: 'new_channel_message',
      name: 'New Channel Message',
      description: 'Triggers when a message is posted to a specific channel.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
      ],
      outputs: [
        { key: 'user', label: 'User ID', type: 'string', required: true },
        { key: 'text', label: 'Message Text', type: 'string', required: true },
        { key: 'ts', label: 'Timestamp', type: 'string', required: true },
        { key: 'channel', label: 'Channel ID', type: 'string', required: true },
      ],
    },
    {
      id: 'new_direct_message',
      name: 'New Direct Message',
      description: 'Triggers when a DM is sent to the bot or user.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'user', label: 'Sender User ID', type: 'string', required: true },
        { key: 'text', label: 'Message Text', type: 'string', required: true },
        { key: 'ts', label: 'Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'new_reaction_added',
      name: 'Reaction Added',
      description: 'Triggers when an emoji reaction is added to a message.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'reaction', label: 'Emoji Name (Optional filter, e.g. white_check_mark)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'user', label: 'User ID who reacted', type: 'string', required: true },
        { key: 'reaction', label: 'Emoji Reaction', type: 'string', required: true },
        { key: 'itemTs', label: 'Message Timestamp', type: 'string', required: true },
        { key: 'channel', label: 'Channel ID', type: 'string', required: true },
      ],
    },
    {
      id: 'channel_created',
      name: 'Channel Created',
      description: 'Triggers when a new channel is created in the workspace.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'channelId', label: 'Channel ID', type: 'string', required: true },
        { key: 'channelName', label: 'Channel Name', type: 'string', required: true },
        { key: 'creator', label: 'Creator User ID', type: 'string', required: true },
      ],
    },
    {
      id: 'user_joined_workspace',
      name: 'User Joined Workspace',
      description: 'Triggers when a new user joins the Slack workspace.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'userId', label: 'User ID', type: 'string', required: true },
        { key: 'userName', label: 'Username', type: 'string', required: true },
        { key: 'realName', label: 'Real Name', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: false },
      ],
    },
    {
      id: 'file_shared',
      name: 'File Shared',
      description: 'Triggers when a file is uploaded/shared to a channel.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: false, dynamicChoice: { endpoint: 'channel' } },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'fileName', label: 'File Name', type: 'string', required: true },
        { key: 'fileType', label: 'File Type', type: 'string', required: true },
        { key: 'urlPrivate', label: 'Download URL', type: 'string', required: true },
      ],
    },
    {
      id: 'pin_added',
      name: 'Pin Added',
      description: 'Triggers when an item is pinned to a channel.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
      ],
      outputs: [
        { key: 'itemTs', label: 'Pinned Item Timestamp', type: 'string', required: true },
        { key: 'pinnedBy', label: 'User ID who pinned', type: 'string', required: true },
      ],
    },
    {
      id: 'huddle_started',
      name: 'Huddle Started',
      description: 'Triggers when a huddle begins in a channel.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'channelId', label: 'Channel ID', type: 'string', required: true },
        { key: 'startedBy', label: 'User ID', type: 'string', required: true },
      ],
    },
    {
      id: 'user_status_changed',
      name: 'User Status Changed',
      description: 'Triggers when a workspace member updates their custom status.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'userId', label: 'User ID', type: 'string', required: true },
        { key: 'statusText', label: 'Status Text', type: 'string', required: true },
        { key: 'statusEmoji', label: 'Status Emoji', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_message',
      name: 'Post Channel Message',
      description: 'Posts a text message to a Slack channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'text', label: 'Message Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
        { key: 'channel', label: 'Channel ID', type: 'string', required: true },
      ],
    },
    {
      id: 'send_direct_message',
      name: 'Send Direct Message',
      description: 'Sends a private direct message to a user.',
      type: 'action',
      inputs: [
        { key: 'user', label: 'Target User', type: 'string', required: true, dynamicChoice: { endpoint: 'user' } },
        { key: 'text', label: 'Message Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
        { key: 'channel', label: 'DM Channel ID', type: 'string', required: true },
      ],
    },
    {
      id: 'reply_to_thread',
      name: 'Reply to Message Thread',
      description: 'Replies to an existing message thread.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'threadTs', label: 'Parent Message Timestamp (thread_ts)', type: 'string', required: true },
        { key: 'text', label: 'Reply Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'ts', label: 'Reply Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'update_message',
      name: 'Update Existing Message',
      description: 'Edits the content of an existing message.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Message Timestamp (ts)', type: 'string', required: true },
        { key: 'text', label: 'New Message Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'ts', label: 'Updated Message Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'delete_message',
      name: 'Delete Message',
      description: 'Deletes a posted message from a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Message Timestamp (ts)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'add_reaction',
      name: 'Add Reaction',
      description: 'Adds an emoji reaction to a message.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
        { key: 'name', label: 'Emoji Name (e.g. thumbsup)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'remove_reaction',
      name: 'Remove Reaction',
      description: 'Removes an emoji reaction from a message.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
        { key: 'name', label: 'Emoji Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'create_channel',
      name: 'Create Channel',
      description: 'Creates a new public or private Slack channel.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Channel Name', type: 'string', required: true },
        { key: 'isPrivate', label: 'Is Private Channel?', type: 'boolean', required: false },
      ],
      outputs: [
        { key: 'channelId', label: 'Channel ID', type: 'string', required: true },
        { key: 'name', label: 'Channel Name', type: 'string', required: true },
      ],
    },
    {
      id: 'archive_channel',
      name: 'Archive Channel',
      description: 'Archives an active Slack channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'unarchive_channel',
      name: 'Unarchive Channel',
      description: 'Unarchives an archived Slack channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'rename_channel',
      name: 'Rename Channel',
      description: 'Renames an existing Slack channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'name', label: 'New Channel Name', type: 'string', required: true },
      ],
      outputs: [
        { key: 'channelId', label: 'Channel ID', type: 'string', required: true },
        { key: 'name', label: 'New Name', type: 'string', required: true },
      ],
    },
    {
      id: 'invite_to_channel',
      name: 'Invite User to Channel',
      description: 'Adds a member to a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'user', label: 'User to Invite', type: 'string', required: true, dynamicChoice: { endpoint: 'user' } },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'kick_from_channel',
      name: 'Remove User from Channel',
      description: 'Kicks a user from a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'user', label: 'User to Remove', type: 'string', required: true, dynamicChoice: { endpoint: 'user' } },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'set_channel_topic',
      name: 'Set Channel Topic',
      description: 'Updates the topic of a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'topic', label: 'Topic Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'topic', label: 'Updated Topic', type: 'string', required: true },
      ],
    },
    {
      id: 'set_channel_purpose',
      name: 'Set Channel Purpose',
      description: 'Updates the description/purpose of a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'purpose', label: 'Purpose Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'purpose', label: 'Updated Purpose', type: 'string', required: true },
      ],
    },
    {
      id: 'upload_file',
      name: 'Upload File to Channel',
      description: 'Uploads a file or document to a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'filename', label: 'File Name', type: 'string', required: true },
        { key: 'content', label: 'File Text / Content', type: 'string', required: true },
        { key: 'title', label: 'Title', type: 'string', required: false },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: true },
        { key: 'urlPrivate', label: 'Download URL', type: 'string', required: true },
      ],
    },
    {
      id: 'pin_message',
      name: 'Pin Message',
      description: 'Pins a message to a channel header.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'unpin_message',
      name: 'Unpin Message',
      description: 'Unpins a message from a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'get_user_profile',
      name: 'Get User Profile',
      description: 'Fetches details and avatar of a user.',
      type: 'action',
      inputs: [
        { key: 'user', label: 'User ID', type: 'string', required: true, dynamicChoice: { endpoint: 'user' } },
      ],
      outputs: [
        { key: 'realName', label: 'Real Name', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: false },
        { key: 'image', label: 'Avatar Image URL', type: 'string', required: false },
      ],
    },
    {
      id: 'set_user_status',
      name: 'Set Status',
      description: 'Updates custom status text and emoji.',
      type: 'action',
      inputs: [
        { key: 'statusText', label: 'Status Text', type: 'string', required: true },
        { key: 'statusEmoji', label: 'Status Emoji (e.g. :coffee:)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'list_channels',
      name: 'List Channels',
      description: 'Lists public and private workspace channels.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'channels', label: 'Channels Array', type: 'array', required: true },
      ],
    },
    {
      id: 'list_users',
      name: 'List Users',
      description: 'Lists all workspace members.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'users', label: 'Users Array', type: 'array', required: true },
      ],
    },
    {
      id: 'get_channel_history',
      name: 'Get Channel History',
      description: 'Retrieves recent messages from a channel.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'limit', label: 'Message Limit (Default: 20)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'messages', label: 'Messages Array', type: 'array', required: true },
      ],
    },
    {
      id: 'get_thread_replies',
      name: 'Get Thread Replies',
      description: 'Retrieves all replies in a message thread.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'ts', label: 'Parent Message Timestamp (ts)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'messages', label: 'Thread Messages', type: 'array', required: true },
      ],
    },
    {
      id: 'send_block_kit_message',
      name: 'Send Block Kit Message',
      description: 'Posts a structured Block Kit interactive card.',
      type: 'action',
      inputs: [
        { key: 'channel', label: 'Channel', type: 'string', required: true, dynamicChoice: { endpoint: 'channel' } },
        { key: 'blocks', label: 'Block Kit JSON string / array', type: 'string', required: true },
        { key: 'text', label: 'Fallback Text', type: 'string', required: false },
      ],
      outputs: [
        { key: 'ts', label: 'Message Timestamp', type: 'string', required: true },
      ],
    },
  ],
};

export class SlackConnector extends BaseConnector {
  manifest = slackManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.accessToken || credentials?.botToken || credentials?.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Slack OAuth token is required.' };
    }

    const client = axios.create({
      baseURL: 'https://slack.com/api',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    try {
      switch (actionId) {
        case 'send_message': {
          const { data } = await client.post('/chat.postMessage', {
            channel: inputs.channel,
            text: inputs.text,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { ts: data.ts, channel: data.channel } };
        }

        case 'send_direct_message': {
          const { data: openData } = await client.post('/conversations.open', { users: inputs.user });
          if (!openData.ok) return { success: false, data: {}, error: openData.error };

          const dmChannel = openData.channel.id;
          const { data } = await client.post('/chat.postMessage', {
            channel: dmChannel,
            text: inputs.text,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { ts: data.ts, channel: dmChannel } };
        }

        case 'reply_to_thread': {
          const { data } = await client.post('/chat.postMessage', {
            channel: inputs.channel,
            thread_ts: inputs.threadTs,
            text: inputs.text,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { ts: data.ts } };
        }

        case 'update_message': {
          const { data } = await client.post('/chat.update', {
            channel: inputs.channel,
            ts: inputs.ts,
            text: inputs.text,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { ts: data.ts } };
        }

        case 'delete_message': {
          const { data } = await client.post('/chat.delete', {
            channel: inputs.channel,
            ts: inputs.ts,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'add_reaction': {
          const { data } = await client.post('/reactions.add', {
            channel: inputs.channel,
            timestamp: inputs.ts,
            name: inputs.name,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'remove_reaction': {
          const { data } = await client.post('/reactions.remove', {
            channel: inputs.channel,
            timestamp: inputs.ts,
            name: inputs.name,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'create_channel': {
          const { data } = await client.post('/conversations.create', {
            name: inputs.name,
            is_private: Boolean(inputs.isPrivate),
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { channelId: data.channel.id, name: data.channel.name } };
        }

        case 'archive_channel': {
          const { data } = await client.post('/conversations.archive', { channel: inputs.channel });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'unarchive_channel': {
          const { data } = await client.post('/conversations.unarchive', { channel: inputs.channel });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'rename_channel': {
          const { data } = await client.post('/conversations.rename', {
            channel: inputs.channel,
            name: inputs.name,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { channelId: data.channel.id, name: data.channel.name } };
        }

        case 'invite_to_channel': {
          const { data } = await client.post('/conversations.invite', {
            channel: inputs.channel,
            users: inputs.user,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'kick_from_channel': {
          const { data } = await client.post('/conversations.kick', {
            channel: inputs.channel,
            user: inputs.user,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'set_channel_topic': {
          const { data } = await client.post('/conversations.setTopic', {
            channel: inputs.channel,
            topic: inputs.topic,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { topic: data.channel.topic.value } };
        }

        case 'set_channel_purpose': {
          const { data } = await client.post('/conversations.setPurpose', {
            channel: inputs.channel,
            purpose: inputs.purpose,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { purpose: data.channel.purpose.value } };
        }

        case 'upload_file': {
          const { data } = await client.post('/files.upload', {
            channels: inputs.channel,
            filename: inputs.filename,
            content: inputs.content,
            title: inputs.title || inputs.filename,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { fileId: data.file.id, urlPrivate: data.file.url_private } };
        }

        case 'pin_message': {
          const { data } = await client.post('/pins.add', {
            channel: inputs.channel,
            timestamp: inputs.ts,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'unpin_message': {
          const { data } = await client.post('/pins.remove', {
            channel: inputs.channel,
            timestamp: inputs.ts,
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'get_user_profile': {
          const { data } = await client.get('/users.info', { params: { user: inputs.user } });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return {
            success: true,
            data: {
              realName: data.user.profile.real_name,
              email: data.user.profile.email,
              image: data.user.profile.image_512,
            },
          };
        }

        case 'set_user_status': {
          const { data } = await client.post('/users.profile.set', {
            profile: {
              status_text: inputs.statusText,
              status_emoji: inputs.statusEmoji || '',
            },
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { success: true } };
        }

        case 'list_channels': {
          const { data } = await client.get('/conversations.list', {
            params: { types: 'public_channel,private_channel', limit: 100 },
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { channels: data.channels } };
        }

        case 'list_users': {
          const { data } = await client.get('/users.list', { params: { limit: 100 } });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { users: data.members } };
        }

        case 'get_channel_history': {
          const { data } = await client.get('/conversations.history', {
            params: { channel: inputs.channel, limit: inputs.limit || 20 },
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { messages: data.messages } };
        }

        case 'get_thread_replies': {
          const { data } = await client.get('/conversations.replies', {
            params: { channel: inputs.channel, ts: inputs.ts },
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { messages: data.messages } };
        }

        case 'send_block_kit_message': {
          const blocks = typeof inputs.blocks === 'string' ? JSON.parse(inputs.blocks) : inputs.blocks;
          const { data } = await client.post('/chat.postMessage', {
            channel: inputs.channel,
            blocks,
            text: inputs.text || 'Interactive message',
          });
          if (!data.ok) return { success: false, data: {}, error: data.error };
          return { success: true, data: { ts: data.ts } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Slack action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Slack API error';
      return { success: false, data: {}, error: `Slack error: ${msg}` };
    }
  }
}

export const slackConnector = new SlackConnector();
manifestRegistry.register(slackManifest);
export { getSlackChoices };
