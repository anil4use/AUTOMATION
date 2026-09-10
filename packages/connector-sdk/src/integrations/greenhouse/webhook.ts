import * as crypto from 'crypto';

export interface GreenhouseWebhookPayload {
  action: string;
  payload: Record<string, any>;
}

/**
 * Verify HMAC-SHA256 signature for incoming Greenhouse webhook requests.
 */
export function verifyGreenhouseWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secretKey: string
): boolean {
  if (!signatureHeader || !secretKey) return false;
  try {
    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawBody)
      .digest('hex');
    
    // Support either raw hex or Signature header format
    const expected = signatureHeader.replace(/^Signature\s+/, '').trim();
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'hex'),
      Buffer.from(expected.length === computedSignature.length ? expected : computedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Generate 32-byte secret key for Greenhouse webhook registration.
 */
export function generateGreenhouseWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}
