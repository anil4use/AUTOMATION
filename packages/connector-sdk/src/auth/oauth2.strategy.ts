export interface OAuth2AuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const OAUTH_PROVIDERS: Record<string, OAuth2AuthConfig> = {
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'google_client_id_placeholder',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google_client_secret_placeholder',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || 'slack_client_id_placeholder',
    clientSecret: process.env.SLACK_CLIENT_SECRET || 'slack_client_secret_placeholder',
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:history', 'channels:read'],
  },
};

export class OAuth2Strategy {
  static getAuthorizationUrl(connectorId: string, redirectUri: string, state: string): string {
    const config = OAUTH_PROVIDERS[connectorId];
    if (!config) {
      return `https://auth.example.com/oauth/authorize?connector=${connectorId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${config.authorizeUrl}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(connectorId: string, code: string, redirectUri: string): Promise<Record<string, any>> {
    // In dev mode, return structured OAuth credentials token payload
    return {
      accessToken: `access_token_${connectorId}_${Date.now()}`,
      refreshToken: `refresh_token_${connectorId}_${Date.now()}`,
      expiresIn: 3600,
      tokenType: 'Bearer',
      obtainedAt: new Date().toISOString(),
    };
  }
}
