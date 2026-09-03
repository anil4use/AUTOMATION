import { NormalizedMessage } from './normalized-message';

/**
 * BaseMessagingAdapter — abstract contract for all messaging platform adapters.
 *
 * To add a new connector (Telegram, Slack, Instagram, etc.):
 *  1. Create a class extending BaseMessagingAdapter
 *  2. Implement the three abstract methods
 *  3. Register it in the adapter registry
 *
 * The core agent system ONLY depends on this interface,
 * never on platform-specific implementation details.
 */
export abstract class BaseMessagingAdapter {
  /** Identifier for the channel this adapter handles (e.g. 'whatsapp', 'telegram') */
  abstract readonly channel: string;

  /**
   * Convert a raw platform webhook payload into a NormalizedMessage.
   * @param rawPayload - The raw body from the platform webhook
   * @param automationId - The automation ID this message is destined for
   * @returns NormalizedMessage or null if the payload is not a valid user message
   */
  abstract normalize(rawPayload: any, automationId: string): NormalizedMessage | null;

  /**
   * Send a text message to a user on this platform.
   * @param userId - Platform-specific user identifier (phone, user ID, etc.)
   * @param message - Plain text content to send
   * @param credentials - Decrypted platform credentials (access token, etc.)
   */
  abstract send(userId: string, message: string, credentials: AdapterCredentials): Promise<void>;

  /**
   * Handle the webhook verification / challenge flow required by some platforms (e.g. Meta/WhatsApp).
   * @param query - URL query parameters from the GET request
   * @param body - Request body (for signature verification)
   * @param credentials - Platform credentials for signature validation
   * @returns The challenge string to echo back, or true if verified, or false if invalid
   */
  abstract verifyWebhook(
    query: Record<string, string>,
    body: any,
    credentials: AdapterCredentials
  ): string | boolean;
}

export interface AdapterCredentials {
  accessToken: string;
  phoneNumberId?: string;   // WhatsApp specific
  verifyToken?: string;     // WhatsApp webhook verification
  botToken?: string;        // Telegram specific
  signingSecret?: string;   // Slack specific
  [key: string]: any;
}
