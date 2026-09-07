import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import axios from 'axios';

const telegramManifest: ConnectorManifest = {
  id: 'telegram',
  name: 'Telegram Bot',
  description: 'Full-power Telegram Bot integration — Send messages, photos, documents, edit/delete messages & trigger automations on real-time Telegram updates and bot commands.',
  category: 'Communication',
  icon: '/icons/telegram.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_message',
      name: 'New Message Received',
      description: 'Triggers when a user sends a message to your Telegram bot.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'number', required: true },
        { key: 'chatId', label: 'Chat ID', type: 'number', required: true },
        { key: 'fromUser', label: 'Sender Username / Name', type: 'string', required: true },
        { key: 'text', label: 'Message Text', type: 'string', required: true },
        { key: 'date', label: 'Timestamp', type: 'number', required: true },
      ],
    },
    {
      id: 'new_command',
      name: 'New Bot Command Received',
      description: 'Triggers when a command starting with / (e.g. /start, /help) is received.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [
        { key: 'command', label: 'Command Filter (e.g. /start)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'command', label: 'Command', type: 'string', required: true },
        { key: 'args', label: 'Arguments Text', type: 'string', required: false },
        { key: 'chatId', label: 'Chat ID', type: 'number', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_message',
      name: 'Send Message',
      description: 'Sends a text message to a Telegram chat or channel.',
      type: 'action',
      inputs: [
        { key: 'chatId', label: 'Chat ID or @channelusername', type: 'string', required: true },
        { key: 'text', label: 'Message Text (HTML or Markdown supported)', type: 'string', required: true },
        { key: 'parseMode', label: 'Parse Mode (HTML or MarkdownV2)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'number', required: true },
        { key: 'chatId', label: 'Chat ID', type: 'number', required: true },
      ],
    },
    {
      id: 'send_photo',
      name: 'Send Photo',
      description: 'Sends a photo via URL or file ID to a Telegram chat.',
      type: 'action',
      inputs: [
        { key: 'chatId', label: 'Chat ID', type: 'string', required: true },
        { key: 'photoUrl', label: 'Photo URL or File ID', type: 'string', required: true },
        { key: 'caption', label: 'Caption Text', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'number', required: true },
      ],
    },
    {
      id: 'send_document',
      name: 'Send Document / File',
      description: 'Sends a document via URL to a Telegram chat.',
      type: 'action',
      inputs: [
        { key: 'chatId', label: 'Chat ID', type: 'string', required: true },
        { key: 'documentUrl', label: 'Document URL', type: 'string', required: true },
        { key: 'caption', label: 'Caption Text', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'number', required: true },
      ],
    },
    {
      id: 'edit_message',
      name: 'Edit Message Text',
      description: 'Edits text of a message previously sent by the bot.',
      type: 'action',
      inputs: [
        { key: 'chatId', label: 'Chat ID', type: 'string', required: true },
        { key: 'messageId', label: 'Message ID', type: 'number', required: true },
        { key: 'text', label: 'New Message Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
    {
      id: 'delete_message',
      name: 'Delete Message',
      description: 'Deletes a message from a chat.',
      type: 'action',
      inputs: [
        { key: 'chatId', label: 'Chat ID', type: 'string', required: true },
        { key: 'messageId', label: 'Message ID', type: 'number', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
  ],
};

export class TelegramConnector extends BaseConnector {
  manifest = telegramManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const botToken = credentials?.botToken || credentials?.apiKey;

    if (!botToken) {
      return { success: false, data: {}, error: 'Telegram Bot Token is required.' };
    }

    const api = axios.create({
      baseURL: `https://api.telegram.org/bot${botToken}`,
    });

    try {
      switch (actionId) {
        case 'send_message': {
          const { data } = await api.post('/sendMessage', {
            chat_id: inputs.chatId,
            text: inputs.text,
            parse_mode: inputs.parseMode || 'HTML',
          });
          if (!data.ok) return { success: false, data: {}, error: data.description };
          return { success: true, data: { messageId: data.result.message_id, chatId: data.result.chat.id } };
        }

        case 'send_photo': {
          const { data } = await api.post('/sendPhoto', {
            chat_id: inputs.chatId,
            photo: inputs.photoUrl,
            caption: inputs.caption || undefined,
          });
          if (!data.ok) return { success: false, data: {}, error: data.description };
          return { success: true, data: { messageId: data.result.message_id } };
        }

        case 'send_document': {
          const { data } = await api.post('/sendDocument', {
            chat_id: inputs.chatId,
            document: inputs.documentUrl,
            caption: inputs.caption || undefined,
          });
          if (!data.ok) return { success: false, data: {}, error: data.description };
          return { success: true, data: { messageId: data.result.message_id } };
        }

        case 'edit_message': {
          const { data } = await api.post('/editMessageText', {
            chat_id: inputs.chatId,
            message_id: Number(inputs.messageId),
            text: inputs.text,
          });
          if (!data.ok) return { success: false, data: {}, error: data.description };
          return { success: true, data: { success: true } };
        }

        case 'delete_message': {
          const { data } = await api.post('/deleteMessage', {
            chat_id: inputs.chatId,
            message_id: Number(inputs.messageId),
          });
          if (!data.ok) return { success: false, data: {}, error: data.description };
          return { success: true, data: { success: true } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Telegram action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.description || err?.message || 'Telegram Bot API error';
      return { success: false, data: {}, error: `Telegram error: ${msg}` };
    }
  }
}

export const telegramConnector = new TelegramConnector();
manifestRegistry.register(telegramManifest);
