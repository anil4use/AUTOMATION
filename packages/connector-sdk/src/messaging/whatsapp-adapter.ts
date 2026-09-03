import { BaseMessagingAdapter, AdapterCredentials } from './base-adapter';
import { NormalizedMessage } from './normalized-message';

const WHATSAPP_API_VERSION = 'v19.0';
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

/**
 * WhatsAppAdapter — Meta WhatsApp Business API implementation of BaseMessagingAdapter.
 *
 * Handles:
 *  - Webhook verification (GET challenge from Meta)
 *  - Incoming message normalization (POST from Meta)
 *  - Outbound message sending (text only for Phase 1)
 *
 * Incoming Meta webhook payload structure (simplified):
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "changes": [{
 *       "value": {
 *         "messages": [{ "id", "from", "timestamp", "type", "text": { "body" } }],
 *         "contacts": [{ "profile": { "name" } }]
 *       }
 *     }]
 *   }]
 * }
 */
export class WhatsAppAdapter extends BaseMessagingAdapter {
  readonly channel = 'whatsapp';

  /**
   * Normalize a Meta WhatsApp webhook payload into a NormalizedMessage.
   * Returns null for non-message payloads (status updates, delivery receipts, etc.)
   */
  normalize(rawPayload: any, automationId: string): NormalizedMessage | null {
    try {
      const entry = rawPayload?.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      if (!change?.messages || change.messages.length === 0) {
        // Not a message — could be a status update or delivery receipt
        return null;
      }

      const message = change.messages[0];
      const contact = change?.contacts?.[0];

      // Only handle user-initiated messages (not system messages)
      if (message.from === 'system') return null;

      const fromPhone = message.from;               // e.g. "919876543210"
      const messageType = message.type || 'text';   // text, image, audio, etc.

      let content = '';
      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;

      if (messageType === 'text') {
        content = message.text?.body || '';
      } else if (messageType === 'image') {
        content = message.image?.caption || '[Image]';
        mediaUrl = message.image?.link;
        mediaMimeType = message.image?.mime_type;
      } else if (messageType === 'audio') {
        content = '[Voice Message]';
        mediaUrl = message.audio?.link;
        mediaMimeType = message.audio?.mime_type;
      } else if (messageType === 'document') {
        content = message.document?.caption || `[Document: ${message.document?.filename || 'file'}]`;
        mediaUrl = message.document?.link;
        mediaMimeType = message.document?.mime_type;
      } else if (messageType === 'location') {
        const loc = message.location;
        content = `[Location: ${loc?.latitude}, ${loc?.longitude}${loc?.name ? ` — ${loc.name}` : ''}]`;
      } else {
        content = `[${messageType.charAt(0).toUpperCase() + messageType.slice(1)} message]`;
      }

      return {
        channel: 'whatsapp',
        userId: fromPhone,
        userName: contact?.profile?.name,
        conversationId: `${automationId}_${fromPhone}`,
        platformMessageId: message.id,
        type: this.mapType(messageType),
        content,
        timestamp: message.timestamp ? new Date(parseInt(message.timestamp) * 1000) : new Date(),
        mediaUrl,
        mediaMimeType,
        raw: rawPayload,
        metadata: {
          phoneNumberId: change?.metadata?.phone_number_id,
          displayPhoneNumber: change?.metadata?.display_phone_number,
          waMessageId: message.id,
        },
      };
    } catch (err) {
      // Malformed payload — return null so the handler can ignore it
      return null;
    }
  }

  /**
   * Send a plain text message to a WhatsApp user via Meta Cloud API.
   */
  async send(userId: string, message: string, credentials: AdapterCredentials): Promise<void> {
    const { accessToken, phoneNumberId } = credentials;

    if (!accessToken || !phoneNumberId) {
      throw new Error('[WhatsAppAdapter] accessToken and phoneNumberId are required to send messages');
    }

    // Split long messages at sentence boundaries to stay under WhatsApp's 4096-char limit
    const chunks = this.splitMessage(message, 4000);

    for (const chunk of chunks) {
      const response = await fetch(
        `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: userId,
            type: 'text',
            text: { body: chunk, preview_url: false },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(
          `[WhatsAppAdapter] Failed to send message: ${response.status} — ${JSON.stringify(errorBody)}`
        );
      }
    }
  }

  /**
   * Handle Meta's webhook verification GET challenge.
   * Returns the hub.challenge string if the verify token matches, otherwise false.
   */
  verifyWebhook(
    query: Record<string, string>,
    _body: any,
    credentials: AdapterCredentials
  ): string | boolean {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === credentials.verifyToken) {
      return challenge || true;
    }

    return false;
  }

  // ── Private Helpers ──────────────────────────────────────────────────────────

  private mapType(rawType: string): NormalizedMessage['type'] {
    const map: Record<string, NormalizedMessage['type']> = {
      text: 'text',
      image: 'image',
      audio: 'audio',
      video: 'video',
      document: 'document',
      location: 'location',
      sticker: 'sticker',
      reaction: 'reaction',
    };
    return map[rawType] || 'unsupported';
  }

  /**
   * Split a long message into chunks at sentence/paragraph boundaries.
   */
  private splitMessage(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      let cut = remaining.lastIndexOf('\n\n', maxLen);
      if (cut <= 0) cut = remaining.lastIndexOf('. ', maxLen);
      if (cut <= 0) cut = maxLen;
      chunks.push(remaining.slice(0, cut + 1).trim());
      remaining = remaining.slice(cut + 1).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
  }
}

// Singleton instance for the adapter registry
export const whatsAppAdapter = new WhatsAppAdapter();
