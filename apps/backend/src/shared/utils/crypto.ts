import crypto from 'crypto';
import { env } from '../../config/env';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encryptText(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(env.tokenEncryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptText(encryptedText: string): string {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted payload format');
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(env.tokenEncryptionKey, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function encryptJson(data: Record<string, any>): string {
  return encryptText(JSON.stringify(data));
}

export function decryptJson<T = Record<string, any>>(encryptedText: string): T {
  const decryptedStr = decryptText(encryptedText);
  return JSON.parse(decryptedStr) as T;
}
