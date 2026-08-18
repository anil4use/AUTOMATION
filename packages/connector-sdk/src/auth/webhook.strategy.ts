import crypto from 'crypto';

export class WebhookStrategy {
  static verifyHmacSignature(payload: string, signature: string, secret: string, algorithm = 'sha256'): boolean {
    if (!payload || !signature || !secret) return false;
    const hmac = crypto.createHmac(algorithm, secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  }
}
