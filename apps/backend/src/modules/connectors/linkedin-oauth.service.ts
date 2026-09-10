import { logger } from '../../config/logger';

export async function refreshLinkedInAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  try {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
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
    logger.error('[LinkedInOAuthService] Refresh failed:', err?.message);
  }

  throw new Error('Failed to refresh LinkedIn OAuth access token. Please re-authenticate your LinkedIn account.');
}
