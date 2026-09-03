/**
 * NormalizedMessage — the platform-agnostic message format.
 *
 * Every connector adapter converts its raw platform payload into this shape
 * before passing it to the Conversation Manager / Agent Runtime.
 * This ensures the core agent never needs to know whether a message
 * came from WhatsApp, Telegram, Slack, or any other channel.
 */
export type MessageChannel = 'whatsapp' | 'telegram' | 'slack' | 'email' | 'sms' | 'instagram';

export type MessageContentType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'sticker'
  | 'reaction'
  | 'unsupported';

export interface NormalizedMessage {
  /** The messaging channel this message came from */
  channel: MessageChannel;

  /** Platform-specific user identifier (phone number, Telegram user ID, Slack user ID, etc.) */
  userId: string;

  /** Human-readable display name for the user, if available */
  userName?: string;

  /** A unique conversation identifier (typically: automationId + userId) */
  conversationId: string;

  /** Platform-native message ID (used for deduplication and read receipts) */
  platformMessageId: string;

  /** Type of content in this message */
  type: MessageContentType;

  /** Primary text content. For non-text types, this is a description or caption */
  content: string;

  /** ISO 8601 timestamp when the message was sent */
  timestamp: Date;

  /** Media URL if the message contains media (image, audio, video, document) */
  mediaUrl?: string;

  /** MIME type of the media, if present */
  mediaMimeType?: string;

  /** The original raw payload from the platform — preserved for debugging and audit */
  raw: Record<string, any>;

  /** Optional extra platform-specific data (e.g. group info, reply context) */
  metadata: Record<string, any>;
}
