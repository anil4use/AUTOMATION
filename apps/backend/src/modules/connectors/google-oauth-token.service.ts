import { ConnectionModelDoc } from './connector.model';
import { decryptJson, encryptJson } from '../../shared/utils/crypto';
import { getRedisPublisher } from '../../infrastructure/redis';
import { GOOGLE_CONNECTOR_SCOPES } from '../auth/google-oauth-scopes';
import { emitAuthExpired } from '../../services/socket.service';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

export class GoogleOAuthTokenError extends Error {
  code: string;
  connectionId?: string;

  constructor(message: string, code: string, connectionId?: string) {
    super(message);
    this.name = 'GoogleOAuthTokenError';
    this.code = code;
    this.connectionId = connectionId;
  }
}

/**
 * Ensures a valid, unexpired Google access token is available for connector executions.
 * Performs inline token refresh with Redis distributed locking and scope verification.
 */
export async function getValidGoogleAccessToken(
  connectionId: string,
  requiredConnectorId: string = 'gmail'
): Promise<string> {
  const connection = await ConnectionModelDoc.findById(connectionId);
  if (!connection) {
    throw new GoogleOAuthTokenError(`Connection '${connectionId}' not found`, 'CONNECTION_NOT_FOUND', connectionId);
  }

  let creds: Record<string, any> = {};
  try {
    creds = decryptJson(connection.encryptedCredentials || '{}');
  } catch (err) {
    logger.error(`[GoogleTokenService] Failed to decrypt credentials for ${connectionId}:`, err);
    creds = {};
  }

  const currentAccessToken = creds.accessToken || creds.access_token;
  const rawExpiresAt = connection.tokenExpiresAt || connection.expiresAt || creds.tokenExpiresAt || creds.expiresAt;
  const tokenExpiresAt = rawExpiresAt ? new Date(rawExpiresAt).getTime() : 0;
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer

  // Check if current token is valid and dummy check
  const isDummyToken = !currentAccessToken || currentAccessToken.startsWith('default_access_token_') || currentAccessToken.includes('dummy');

  if (!isDummyToken && (tokenExpiresAt > now + bufferMs || !rawExpiresAt)) {
    return currentAccessToken;
  }

  // Token is expired or expiring soon, or is a dummy token -> Needs refresh
  const lockKey = `google:token:refresh:${connectionId}`;
  const redis = getRedisPublisher();
  const acquired = await redis.set(lockKey, 'locked', 'PX', 30000, 'NX');

  if (!acquired) {
    // Another worker/request is refreshing this connection's token right now.
    logger.info(`[GoogleTokenService] Waiting for concurrent token refresh for connection ${connectionId}...`);
    await new Promise((r) => setTimeout(r, 2000));

    // Re-read updated connection state from DB
    const freshConn = await ConnectionModelDoc.findById(connectionId);
    if (freshConn) {
      let freshCreds: Record<string, any> = {};
      try { freshCreds = decryptJson(freshConn.encryptedCredentials); } catch {}
      const freshToken = freshCreds.accessToken || freshCreds.access_token;
      const freshExpires = freshConn.tokenExpiresAt ? new Date(freshConn.tokenExpiresAt).getTime() : 0;
      if (freshToken && freshExpires > Date.now() + bufferMs && !freshToken.startsWith('default_access_token_')) {
        return freshToken;
      }
    }
  }

  try {
    const refreshToken = creds.refreshToken || creds.refresh_token || connection.refreshToken;

    if (!refreshToken || refreshToken.startsWith('refresh_token_') || refreshToken.includes('dummy')) {
      logger.warn(`[GoogleTokenService] Connection ${connectionId} missing valid refresh token.`);
      connection.status = 'expired';
      connection.lastRefreshError = 'No valid refresh token available. User must re-authenticate.';
      await connection.save();

      emitAuthExpired(connection.organizationId?.toString() || '', {
        connectionId: connection._id,
        connectorId: connection.connectorId,
        accountEmail: connection.accountEmail,
        message: 'Google authorization required. Please re-authenticate your connection.',
      });

      throw new GoogleOAuthTokenError(
        'Your Google connection has expired. Please re-authenticate from the Integrations page.',
        'GOOGLE_REFRESH_TOKEN_EXPIRED',
        connectionId
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || (env as any).googleClientId || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || (env as any).googleClientSecret || '';

    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    if (clientId) bodyParams.append('client_id', clientId);
    if (clientSecret) bodyParams.append('client_secret', clientSecret);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: bodyParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      const errorMsg = tokenData.error_description || tokenData.error || tokenRes.statusText;
      logger.error(`[GoogleTokenService] Token refresh HTTP failure (${tokenRes.status}) for connection ${connectionId}: ${errorMsg}`);

      const isGrantRevoked = tokenData.error === 'invalid_grant' || tokenRes.status === 400 || tokenRes.status === 401;

      if (isGrantRevoked) {
        connection.status = 'expired';
        connection.lastRefreshError = `Token revoked or expired: ${errorMsg}`;
        await connection.save();

        emitAuthExpired(connection.organizationId?.toString() || '', {
          connectionId: connection._id,
          connectorId: connection.connectorId,
          accountEmail: connection.accountEmail,
          message: 'Google connection authorization was revoked or expired. Please re-authenticate.',
        });

        throw new GoogleOAuthTokenError(
          'Your Google connection has expired. Please re-authenticate from the Integrations page.',
          'GOOGLE_REFRESH_TOKEN_EXPIRED',
          connectionId
        );
      }

      connection.status = 'refresh_failed';
      connection.lastRefreshError = errorMsg;
      await connection.save();

      throw new GoogleOAuthTokenError(
        `Failed to refresh Google token: ${errorMsg}`,
        'GOOGLE_REFRESH_FAILED',
        connectionId
      );
    }

    const newAccessToken = tokenData.access_token;
    if (!newAccessToken) {
      throw new GoogleOAuthTokenError('Google OAuth token endpoint did not return access_token', 'GOOGLE_INVALID_RESPONSE', connectionId);
    }

    // Per-scope validation (Gap 2)
    if (tokenData.scope && requiredConnectorId) {
      const requiredScopes = GOOGLE_CONNECTOR_SCOPES[requiredConnectorId] || [];
      const grantedScopesStr = tokenData.scope as string;
      const missingScope = requiredScopes.some((req) => !grantedScopesStr.includes(req));

      if (missingScope) {
        logger.warn(`[GoogleTokenService] Granted scope "${grantedScopesStr}" missing required scope for connector "${requiredConnectorId}".`);
        connection.status = 'expired';
        connection.lastRefreshError = `Missing required OAuth scope for connector '${requiredConnectorId}'`;
        await connection.save();

        emitAuthExpired(connection.organizationId?.toString() || '', {
          connectionId: connection._id,
          connectorId: requiredConnectorId,
          accountEmail: connection.accountEmail,
          message: `Permissions for ${requiredConnectorId} were missing or revoked. Please re-authenticate.`,
        });

        throw new GoogleOAuthTokenError(
          `Your Google connection lacks required permissions for ${requiredConnectorId}. Please re-authenticate.`,
          'GOOGLE_SCOPE_REVOKED',
          connectionId
        );
      }
    }

    // Save refreshed credentials
    const expiresIn = tokenData.expires_in || 3600;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    creds.accessToken = newAccessToken;
    creds.access_token = newAccessToken;
    if (tokenData.refresh_token) {
      creds.refreshToken = tokenData.refresh_token;
      creds.refresh_token = tokenData.refresh_token;
      connection.refreshToken = tokenData.refresh_token;
    }

    connection.encryptedCredentials = encryptJson(creds);
    connection.tokenExpiresAt = newExpiresAt;
    connection.expiresAt = newExpiresAt;
    connection.lastRefreshedAt = new Date();
    connection.status = 'connected';
    connection.lastRefreshError = undefined;
    await connection.save();

    logger.info(`[GoogleTokenService] Successfully refreshed Google access token for connection ${connectionId}`);
    return newAccessToken;
  } finally {
    // Release Redis lock
    if (acquired) {
      await redis.del(lockKey).catch((e) => logger.error(`[GoogleTokenService] Failed to release Redis lock ${lockKey}:`, e));
    }
  }
}
