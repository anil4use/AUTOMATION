import { logger } from '../../config/logger';

/**
 * ProviderRateLimiter — Zapier.md Topics 36, 38
 *
 * Token-bucket rate limiter per integration provider / connection.
 * Prevents third-party APIs from returning 429 Too Many Requests errors.
 */
export class ProviderRateLimiter {
  private static providerLimits: Record<string, { requestsPerSec: number }> = {
    'google-sheets': { requestsPerSec: 10 },
    'gmail': { requestsPerSec: 10 },
    'slack': { requestsPerSec: 20 },
    'stripe': { requestsPerSec: 25 },
    'default': { requestsPerSec: 30 },
  };

  private static timestamps: Record<string, number[]> = {};

  /**
   * Check and enforce rate limit token-bucket for a provider
   */
  static async throttle(providerId: string): Promise<void> {
    const limitConfig = ProviderRateLimiter.providerLimits[providerId] || ProviderRateLimiter.providerLimits.default;
    const maxReqs = limitConfig.requestsPerSec;
    const now = Date.now();

    if (!ProviderRateLimiter.timestamps[providerId]) {
      ProviderRateLimiter.timestamps[providerId] = [];
    }

    // Keep timestamps from the last 1 second
    ProviderRateLimiter.timestamps[providerId] = ProviderRateLimiter.timestamps[providerId].filter(
      (t) => now - t < 1000
    );

    if (ProviderRateLimiter.timestamps[providerId].length >= maxReqs) {
      const delayMs = 1000 - (now - ProviderRateLimiter.timestamps[providerId][0]);
      logger.info(`[RateLimiter] Throttling request for ${providerId} by ${delayMs}ms (limit: ${maxReqs} req/s)`);
      await new Promise((resolve) => setTimeout(resolve, Math.max(delayMs, 50)));
    }

    ProviderRateLimiter.timestamps[providerId].push(Date.now());
  }
}
