export interface CreateConnectionDTO {
  connectorId: string;
  name: string;
  authType: 'oauth2' | 'api_key' | 'webhook' | 'basic';
  credentials: Record<string, any>;
}
