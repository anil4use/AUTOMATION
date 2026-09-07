import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import axios from 'axios';

const whatsappManifest: ConnectorManifest = {
  id: 'whatsapp',
  name: 'WhatsApp Business (Meta Cloud API)',
  description: 'Official Meta Cloud API integration for WhatsApp Business — Send text messages, approved template cards, media & trigger automations on incoming customer messages.',
  category: 'Communication',
  icon: '/icons/whatsapp.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'message_received',
      name: 'Message Received',
      description: 'Triggers when an incoming WhatsApp customer message is received.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'from', label: 'Sender Phone Number', type: 'string', required: true },
        { key: 'messageId', label: 'WhatsApp Message ID (wamid)', type: 'string', required: true },
        { key: 'text', label: 'Message Body Text', type: 'string', required: true },
        { key: 'type', label: 'Message Type (text, image, document)', type: 'string', required: true },
        { key: 'timestamp', label: 'Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'message_status_updated',
      name: 'Message Status Updated',
      description: 'Triggers when a sent message status changes to sent, delivered, or read.',
      type: 'trigger',
      deliveryMethod: 'webhook',
      inputs: [],
      outputs: [
        { key: 'messageId', label: 'Message ID', type: 'string', required: true },
        { key: 'status', label: 'Status (sent, delivered, read, failed)', type: 'string', required: true },
        { key: 'recipientId', label: 'Recipient Phone', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'send_text_message',
      name: 'Send Text Message',
      description: 'Sends a freeform text message to a customer within the 24-hour service window.',
      type: 'action',
      inputs: [
        { key: 'phoneNumberId', label: 'Meta Phone Number ID', type: 'string', required: true },
        { key: 'to', label: 'Recipient Phone Number (with country code, e.g. 15551234567)', type: 'string', required: true },
        { key: 'text', label: 'Message Text', type: 'string', required: true },
      ],
      outputs: [
        { key: 'messageId', label: 'WhatsApp Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'send_template_message',
      name: 'Send Approved Template Message',
      description: 'Sends a pre-approved Meta WhatsApp template message (used outside 24h window).',
      type: 'action',
      inputs: [
        { key: 'phoneNumberId', label: 'Meta Phone Number ID', type: 'string', required: true },
        { key: 'to', label: 'Recipient Phone Number', type: 'string', required: true },
        { key: 'templateName', label: 'Template Name (e.g. hello_world)', type: 'string', required: true },
        { key: 'languageCode', label: 'Language Code (e.g. en_US)', type: 'string', required: true },
        { key: 'parametersJson', label: 'Body Parameters Array (JSON string)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'WhatsApp Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'send_media_message',
      name: 'Send Image or Document',
      description: 'Sends an image, video, or document via URL.',
      type: 'action',
      inputs: [
        { key: 'phoneNumberId', label: 'Meta Phone Number ID', type: 'string', required: true },
        { key: 'to', label: 'Recipient Phone Number', type: 'string', required: true },
        { key: 'mediaType', label: 'Media Type (image, document, audio, video)', type: 'string', required: true },
        { key: 'mediaUrl', label: 'Public Media URL', type: 'string', required: true },
        { key: 'caption', label: 'Optional Caption', type: 'string', required: false },
      ],
      outputs: [
        { key: 'messageId', label: 'WhatsApp Message ID', type: 'string', required: true },
      ],
    },
    {
      id: 'mark_message_as_read',
      name: 'Mark Message as Read',
      description: 'Sends read receipts for an incoming message.',
      type: 'action',
      inputs: [
        { key: 'phoneNumberId', label: 'Meta Phone Number ID', type: 'string', required: true },
        { key: 'messageId', label: 'WhatsApp Message ID (wamid)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
      ],
    },
  ],
};

export class WhatsAppConnector extends BaseConnector {
  manifest = whatsappManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const token = credentials?.accessToken || credentials?.apiKey;

    if (!token) {
      return { success: false, data: {}, error: 'Meta System User Access Token is required.' };
    }

    try {
      const phoneNumberId = inputs.phoneNumberId;
      const client = axios.create({
        baseURL: `https://graph.facebook.com/v19.0/${phoneNumberId}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      switch (actionId) {
        case 'send_text_message': {
          const { data } = await client.post('/messages', {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: inputs.to,
            type: 'text',
            text: { body: inputs.text },
          });
          const messageId = data.messages?.[0]?.id;
          return { success: true, data: { messageId } };
        }

        case 'send_template_message': {
          const params = inputs.parametersJson ? JSON.parse(inputs.parametersJson) : [];
          const components = params.length > 0
            ? [{ type: 'body', parameters: params.map((p: any) => ({ type: 'text', text: String(p) })) }]
            : undefined;

          const { data } = await client.post('/messages', {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: inputs.to,
            type: 'template',
            template: {
              name: inputs.templateName,
              language: { code: inputs.languageCode || 'en_US' },
              components,
            },
          });
          const messageId = data.messages?.[0]?.id;
          return { success: true, data: { messageId } };
        }

        case 'send_media_message': {
          const type = inputs.mediaType || 'image';
          const mediaObj: any = { link: inputs.mediaUrl };
          if (inputs.caption) mediaObj.caption = inputs.caption;

          const { data } = await client.post('/messages', {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: inputs.to,
            type,
            [type]: mediaObj,
          });
          const messageId = data.messages?.[0]?.id;
          return { success: true, data: { messageId } };
        }

        case 'mark_message_as_read': {
          const { data } = await client.post('/messages', {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: inputs.messageId,
          });
          return { success: true, data: { success: data.success || true } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported WhatsApp action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Meta Cloud API error';
      return { success: false, data: {}, error: `WhatsApp error: ${msg}` };
    }
  }
}

export const whatsappConnector = new WhatsAppConnector();
manifestRegistry.register(whatsappManifest);
