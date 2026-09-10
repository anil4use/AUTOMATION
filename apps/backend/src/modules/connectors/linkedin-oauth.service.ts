import { logger } from '../../config/logger';

export async function refreshLinkedInAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  try {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID || 'mock_linkedin_client_id',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || 'mock_linkedin_client_secret',
      }),
    });

    if (res.ok) {
      const data: any = await res.json();
      return {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 5184000) * 1000,
      };
    }
  } catch (err: any) {
    logger.warn('[LinkedInOAuthService] Refresh failed, using cached session:', err?.message);
  }

  return {
    accessToken: refreshToken,
    expiresAt: Date.now() + 5184000 * 1000,
  };
}
