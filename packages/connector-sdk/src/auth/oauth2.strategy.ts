export interface OAuth2AuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const FULL_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/documents',
  'openid',
  'email',
  'profile',
];

const OAUTH_PROVIDERS: Record<string, OAuth2AuthConfig> = {
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || 'autoflow_linkedin_app',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email'],
  },
  indeed: {
    clientId: process.env.INDEED_CLIENT_ID || 'autoflow_indeed_app',
    clientSecret: process.env.INDEED_CLIENT_SECRET || '',
    authorizeUrl: 'https://secure.indeed.com/oauth/v2/authorize',
    tokenUrl: 'https://secure.indeed.com/oauth/v2/tokens',
    scopes: ['employer.job.read', 'employer.job.write'],
  },
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: FULL_GOOGLE_SCOPES,
  },
  'google-sheets': {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: FULL_GOOGLE_SCOPES,
  },
  'google-drive': {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: FULL_GOOGLE_SCOPES,
  },
  'google-calendar': {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: FULL_GOOGLE_SCOPES,
  },
  'google-docs': {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: FULL_GOOGLE_SCOPES,
  },
  'google-analytics': {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  },
  bigquery: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/bigquery'],
  },
  outlook: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['Mail.ReadWrite', 'Mail.Send', 'User.Read'],
  },
  'ms-teams': {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: ['ChatMessage.Send', 'ChannelMessage.Send'],
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:history', 'channels:read'],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user'],
  },
  gitlab: {
    clientId: process.env.GITLAB_CLIENT_ID || '',
    clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
    authorizeUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token',
    scopes: ['api', 'read_user'],
  },
  hubspot: {
    clientId: process.env.HUBSPOT_CLIENT_ID || '',
    clientSecret: process.env.HUBSPOT_CLIENT_SECRET || '',
    authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
  },
  salesforce: {
    clientId: process.env.SALESFORCE_CLIENT_ID || '',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
    authorizeUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scopes: ['api', 'refresh_token'],
  },
  shopify: {
    clientId: process.env.SHOPIFY_CLIENT_ID || '',
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || '',
    authorizeUrl: 'https://myshopify.com/admin/oauth/authorize',
    tokenUrl: 'https://myshopify.com/admin/oauth/access_token',
    scopes: ['read_orders', 'write_orders', 'read_products'],
  },
  zoom: {
    clientId: process.env.ZOOM_CLIENT_ID || '',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || '',
    authorizeUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token',
    scopes: ['meeting:write', 'meeting:read'],
  },
  jira: {
    clientId: process.env.ATLASSIAN_CLIENT_ID || '',
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET || '',
    authorizeUrl: 'https://auth.atlassian.com/authorize',
    tokenUrl: 'https://auth.atlassian.com/oauth/token',
    scopes: ['read:jira-work', 'write:jira-work'],
  },
  notion: {
    clientId: process.env.NOTION_CLIENT_ID || '',
    clientSecret: process.env.NOTION_CLIENT_SECRET || '',
    authorizeUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
  },
  stripe: {
    clientId: process.env.STRIPE_CLIENT_ID || '',
    clientSecret: process.env.STRIPE_SECRET_KEY || '',
    authorizeUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
  },
};

export class OAuth2Strategy {
  static getClientId(connectorId: string): string {
    const envKey = `${connectorId.toUpperCase().replace(/-/g, '_')}_CLIENT_ID`;
    if (process.env[envKey]) return process.env[envKey]!;
    if (connectorId === 'gmail' || connectorId.startsWith('google')) return process.env.GOOGLE_CLIENT_ID || '';
    if (connectorId === 'outlook' || connectorId === 'ms-teams') return process.env.MICROSOFT_CLIENT_ID || '';
    const config = OAUTH_PROVIDERS[connectorId];
    return (config && config.clientId && !config.clientId.startsWith('autoflow_')) ? config.clientId : (process.env.LINKEDIN_CLIENT_ID || config?.clientId || '');
  }

  static getClientSecret(connectorId: string): string {
    const envKey = `${connectorId.toUpperCase().replace(/-/g, '_')}_CLIENT_SECRET`;
    if (process.env[envKey]) return process.env[envKey]!;
    if (connectorId === 'gmail' || connectorId.startsWith('google')) return process.env.GOOGLE_CLIENT_SECRET || '';
    if (connectorId === 'outlook' || connectorId === 'ms-teams') return process.env.MICROSOFT_CLIENT_SECRET || '';
    const config = OAUTH_PROVIDERS[connectorId];
    return (config && config.clientSecret) ? config.clientSecret : (process.env.LINKEDIN_CLIENT_SECRET || '');
  }

  static getAuthorizationUrl(connectorId: string, redirectUri: string, state: string): string {
    const config = OAUTH_PROVIDERS[connectorId];
    const clientId = this.getClientId(connectorId);

    if (config && clientId) {
      const paramsObj: Record<string, string> = {
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state,
      };

      if (connectorId.startsWith('google') || connectorId === 'gmail' || connectorId === 'bigquery') {
        paramsObj.access_type = 'offline';
        paramsObj.prompt = 'consent';
      }

      const params = new URLSearchParams(paramsObj);
      return `${config.authorizeUrl}?${params.toString()}`;
    }

    // Default fallback authorization URL generator
    const fallbackBase = connectorId === 'linkedin' ? 'https://www.linkedin.com/oauth/v2/authorization' : `https://auth.${connectorId}.com/oauth/authorize`;
    const params = new URLSearchParams({
      client_id: clientId || `autoflow_${connectorId}_app`,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    });
    return `${fallbackBase}?${params.toString()}`;
  }

  static async exchangeCodeForTokens(connectorId: string, code: string, redirectUri: string): Promise<Record<string, any>> {
    const config = OAUTH_PROVIDERS[connectorId];
    const clientId = this.getClientId(connectorId);
    const clientSecret = this.getClientSecret(connectorId);

    if (!clientId || !clientSecret) {
      throw new Error(`OAuth Client ID and Client Secret are required for ${connectorId}. Please check your environment configuration.`);
    }

    if (config) {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      });
      const data: any = await response.json();
      if (!response.ok || !data.access_token) {
        throw new Error(`OAuth token exchange failed for ${connectorId}: ${data.error_description || data.error || response.statusText}`);
      }

      let accountEmail = '';
      if (connectorId.startsWith('google') || connectorId === 'gmail') {
        try {
          if (data.id_token) {
            const parts = data.id_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
              if (payload.email) accountEmail = payload.email;
            }
          }
          if (!accountEmail) {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${data.access_token}` },
            });
            const userData: any = await userRes.json();
            if (userData.email) accountEmail = userData.email;
          }
        } catch (e) {}
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || '',
        expiresIn: data.expires_in || 3600,
        tokenType: data.token_type || 'Bearer',
        scope: data.scope || config.scopes.join(' '),
        accountEmail,
        userEmail: accountEmail,
        obtainedAt: new Date().toISOString(),
      };
    }

    throw new Error(`Unsupported OAuth provider: ${connectorId}`);
  }
}
