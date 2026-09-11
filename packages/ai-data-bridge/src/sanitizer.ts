export interface SanitizationOptions {
  stripHtml?: boolean;
  trimWhitespace?: boolean;
  normalizeE164?: boolean;
  uppercaseCurrency?: boolean;
}

export class Sanitizer {
  /**
   * Strip HTML tags from a string
   */
  public static stripHtml(str: string): string {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  /**
   * Normalize a phone number string to E.164 format (+1234567890)
   */
  public static normalizeE164(phone: string): string {
    if (typeof phone !== 'string') return phone;
    let digits = phone.replace(/[^\d+]/g, '');
    if (digits.startsWith('00')) {
      digits = '+' + digits.slice(2);
    }
    if (!digits.startsWith('+')) {
      digits = '+' + digits;
    }
    return digits;
  }

  /**
   * Sanitize value based on format hints
   */
  public static sanitizeValue(value: any, hints: string[] = []): any {
    if (value === null || value === undefined) return value;

    let result = value;

    if (typeof result === 'string') {
      if (hints.includes('strip_html_tags')) {
        result = this.stripHtml(result);
      }
      if (hints.includes('normalize_to_e164')) {
        result = this.normalizeE164(result);
      }
      if (hints.includes('uppercase_iso4217')) {
        result = result.toUpperCase().trim();
      }
      if (hints.includes('trim_whitespace') || typeof result === 'string') {
        result = result.trim();
      }
    }

    return result;
  }

  /**
   * Mask sensitive header values, API keys, passwords, credit card numbers for logging
   */
  public static maskSensitiveValues(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      // Mask bearer tokens
      if (obj.toLowerCase().startsWith('bearer ')) {
        return 'Bearer ***';
      }
      // Mask api keys in URLs
      if (obj.includes('api_key=') || obj.includes('apikey=')) {
        return obj.replace(/(api_?key=)[^&]+/gi, '$1***');
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskSensitiveValues(item));
    }

    if (typeof obj === 'object') {
      const masked: Record<string, any> = {};
      const sensitiveKeys = ['password', 'secret', 'token', 'apikey', 'api_key', 'authorization', 'creditcard', 'cardnumber', 'cvv'];

      for (const [key, val] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
          masked[key] = '***';
        } else {
          masked[key] = this.maskSensitiveValues(val);
        }
      }
      return masked;
    }

    return obj;
  }
}
