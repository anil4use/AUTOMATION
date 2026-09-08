import { ConnectionModel } from '@automation/database';
import { decryptJson, encryptJson } from '../shared/utils/crypto';
import { logger } from '../config/logger';
import { env } from '../config/env';

/**
 * OAuthRefreshDaemon — Issue 6 & Google OAuth Spec
 *
 * Background daemon that checks for OAuth 2.0 connections whose access tokens
 * are expiring or expired, making real HTTP refresh calls to Google and OAuth providers.
 */
export class OAuthRefreshDaemon {
  private static timer: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 300000) { // Default: check every 5 minutes
    logger.info('[OAuthRefreshDaemon] Starting automated token refresh daemon...');
    OAuthRefreshDaemon.runCheck();
    OAuthRefreshDaemon.timer = setInterval(() => {
      OAuthRefreshDaemon.runCheck();
    }, intervalMs);
  }

  static stop() {
    if (OAuthRefreshDaemon.timer) {
      clearInterval(OAuthRefreshDaemon.timer);
      OAuthRefreshDaemon.timer = null;
    }
  }

  /**
   * Real HTTP Token Refresh for Google and OAuth2 providers.
   * Exchanges refreshToken for a new valid accessToken.
   */
  static async refreshOAuthToken(connectorId: string, refreshToken: string): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
    const cid = connectorId.toLowerCase().trim();
    const isGoogle = cid.startsWith('google') || cid === 'gmail' || cid === 'bigquery';

    let tokenUrl = 'https://oauth2.googleapis.com/token';
    let clientId = process.env.GOOGLE_CLIENT_ID || (env as any).googleClientId || '';
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET || (env as any).googleClientSecret || '';

    if (!isGoogle) {
      if (cid === 'slack') {
        tokenUrl = 'https://slack.com/api/oauth.v2.access';
        clientId = process.env.SLACK_CLIENT_ID || '';
        clientSecret = process.env.SLACK_CLIENT_SECRET || '';
      } else if (cid === 'github') {
        tokenUrl = 'https://github.com/login/oauth/access_token';
        clientId = process.env.GITHUB_CLIENT_ID || '';
        clientSecret = process.env.GITHUB_CLIENT_SECRET || '';
      } else if (cid === 'outlook' || cid === 'ms-teams') {
        tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        clientId = process.env.MICROSOFT_CLIENT_ID || '';
        clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
      } else if (cid === 'hubspot') {
        tokenUrl = 'https://api.hubapi.com/oauth/v1/token';
        clientId = process.env.HUBSPOT_CLIENT_ID || '';
        clientSecret = process.env.HUBSPOT_CLIENT_SECRET || '';
      }
    }

    if (!refreshToken || refreshToken.startsWith('refresh_token_') || refreshToken.includes('dummy')) {
      throw new Error(`No valid refresh token available for '${connectorId}'`);
    }

    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    if (clientId) bodyParams.append('client_id', clientId);
    if (clientSecret) bodyParams.append('client_secret', clientSecret);

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errorMsg = data.error_description || data.error || res.statusText;
      throw new Error(`Token refresh HTTP error (${res.status}): ${errorMsg}`);
    }

    const newAccessToken = data.access_token || data.accessToken;
    if (!newAccessToken) {
      throw new Error('Token refresh response did not contain access_token');
    }

    return {
      accessToken: newAccessToken,
      expiresIn: data.expires_in || 3600,
      refreshToken: data.refresh_token || refreshToken,
    };
  }

  static async runCheck() {
    try {
      const expirationCutoff = new Date(Date.now() + 10 * 60 * 1000); // Expiring within 10 mins

      const expiringConnections = await ConnectionModel.find({
        authType: 'oauth2',
        status: { $in: ['active', 'connected', 'refresh_failed'] },
        $or: [
          { tokenExpiresAt: { $lte: expirationCutoff } },
          { expiresAt: { $lte: expirationCutoff } },
        ],
      });

      if (expiringConnections.length === 0) return;

      logger.info(`[OAuthRefreshDaemon] Found ${expiringConnections.length} expiring OAuth connection(s) to refresh`);

      for (const conn of expiringConnections) {
        try {
          let creds: Record<string, any> = {};
          try { creds = decryptJson(conn.encryptedCredentials); } catch { creds = {}; }

          const refreshToken = creds.refreshToken || creds.refresh_token || conn.refreshToken;

          if (!refreshToken || refreshToken.startsWith('refresh_token_') || refreshToken.includes('dummy')) {
            logger.warn(`[OAuthRefreshDaemon] Connection ${conn._id} (${conn.connectorId}) missing valid refresh token`);
            conn.status = 'expired';
            conn.lastRefreshError = 'No valid refresh token available. User must reconnect.';
            await conn.save();
            continue;
          }

          const { accessToken: newAccessToken, expiresIn, refreshToken: updatedRefreshToken } =
            await OAuthRefreshDaemon.refreshOAuthToken(conn.connectorId, refreshToken);

          const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

          creds.accessToken = newAccessToken;
          creds.access_token = newAccessToken;
          if (updatedRefreshToken) {
            creds.refreshToken = updatedRefreshToken;
            creds.refresh_token = updatedRefreshToken;
            conn.refreshToken = updatedRefreshToken;
          }

          conn.encryptedCredentials = encryptJson(creds);
          conn.expiresAt = newExpiresAt;
          conn.tokenExpiresAt = newExpiresAt;
          conn.lastRefreshedAt = new Date();
          conn.status = 'connected';
          conn.lastRefreshError = undefined;
          await conn.save();

          logger.info(`[OAuthRefreshDaemon] Successfully refreshed OAuth token for connection ${conn._id} (${conn.connectorId})`);
        } catch (err: any) {
          const isExpired = err?.message?.includes('invalid_grant') || err?.message?.includes('401');
          logger.error(`[OAuthRefreshDaemon] Failed to refresh token for connection ${conn._id} (${conn.connectorId}): ${err.message}`);

          conn.status = isExpired ? 'expired' : 'refresh_failed';
          conn.lastRefreshError = err.message || 'Token refresh failed';
          await conn.save();
        }
      }
    } catch (err: any) {
      logger.error(`[OAuthRefreshDaemon] Daemon check error: ${err.message}`);
    }
  }
}
