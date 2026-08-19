import {
  AutoFlowScheduleConnector,
  GmailConnector,
  SlackConnector,
  GoogleSheetsConnector,
  AINodeConnector,
  GoogleDriveConnector,
  NotionConnector,
  StripeConnector,
  WhatsAppConnector,
  HttpRequestConnector,
  WebSearchConnector,
  OAuth2Strategy,
} from '@automation/connector-sdk';
import { ConnectorRepository } from './connector.repository';
import { encryptJson, decryptJson } from '../../shared/utils/crypto';
import { AppError } from '../../shared/errors/app.error';
import { env } from '../../config/env';

const availableConnectors = [
  new AutoFlowScheduleConnector().manifest,
  new WebSearchConnector().manifest,
  new GmailConnector().manifest,
  new SlackConnector().manifest,
  new GoogleSheetsConnector().manifest,
  new GoogleDriveConnector().manifest,
  new NotionConnector().manifest,
  new StripeConnector().manifest,
  new WhatsAppConnector().manifest,
  new HttpRequestConnector().manifest,
  new AINodeConnector().manifest,
];

export class ConnectorService {
  static getAvailableConnectors() {
    return availableConnectors;
  }

  static async getUserConnections(orgId: string) {
    return await ConnectorRepository.findByOrg(orgId);
  }

  static getOAuthAuthorizeUrl(connectorId: string, orgId: string, userId: string) {
    const redirectUri = `${env.clientUrl}/connectors/callback`;
    const state = Buffer.from(JSON.stringify({ connectorId, orgId, userId })).toString('base64');
    return OAuth2Strategy.getAuthorizationUrl(connectorId, redirectUri, state);
  }

  static async handleOAuthCallback(connectorId: string, code: string, orgId: string, userId: string) {
    const redirectUri = `${env.clientUrl}/connectors/callback`;
    const tokens = await OAuth2Strategy.exchangeCodeForTokens(connectorId, code, redirectUri);
    const encryptedCredentials = encryptJson(tokens);

    return await ConnectorRepository.createConnection({
      organizationId: orgId,
      userId,
      connectorId,
      name: `${connectorId.toUpperCase()} Account (${new Date().toLocaleDateString()})`,
      authType: 'oauth2',
      encryptedCredentials,
      status: 'connected',
    });
  }

  static async createApiKeyConnection(orgId: string, userId: string, connectorId: string, name: string, apiKey: string) {
    const encryptedCredentials = encryptJson({ apiKey, createdAt: new Date().toISOString() });

    return await ConnectorRepository.createConnection({
      organizationId: orgId,
      userId,
      connectorId,
      name,
      authType: 'api_key',
      encryptedCredentials,
      status: 'connected',
    });
  }

  static async deleteConnection(id: string, orgId: string) {
    const result = await ConnectorRepository.deleteConnection(id, orgId);
    if (result.deletedCount === 0) throw new AppError('Connection not found', 404);
    return true;
  }

  static async getDecryptedCredentials(connectionId: string, orgId: string) {
    const conn = await ConnectorRepository.findById(connectionId, orgId);
    if (!conn) throw new AppError('Connection not found', 404);
    return decryptJson(conn.encryptedCredentials);
  }
}
