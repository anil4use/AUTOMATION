import {
  AutoFlowScheduleConnector,
  GmailConnector,
  SlackConnector,
  GoogleSheetsConnector,
  AINodeConnector,
  GoogleDriveConnector,
  GoogleCalendarConnector,
  GoogleDocsConnector,
  NotionConnector,
  StripeConnector,
  WhatsAppConnector,
  HttpRequestConnector,
  WebSearchConnector,
  ConditionConnector,
  AmazonFlipkartConnector,
  UniversalConnector,
  OAuth2Strategy,
  connectorRegistry,
  ProviderVerifier,
  ALL_50_CONNECTOR_MANIFESTS,
} from '@automation/connector-sdk';
import { ConnectorRepository } from './connector.repository';
import { encryptJson, decryptJson } from '../../shared/utils/crypto';
import { AppError } from '../../shared/errors/app.error';
import { env } from '../../config/env';

export class ConnectorService {
  static getAvailableConnectors() {
    return ALL_50_CONNECTOR_MANIFESTS;
  }

  static async cleanAutoSeededConnections(orgId: string) {
    const { ConnectionModel } = require('@automation/database');

    // Delete auto-generated mock connections, keeping ONLY real user connected accounts
    const result = await ConnectionModel.deleteMany({
      organizationId: orgId,
      $or: [
        { name: { $regex: /AutoFlow Verified/i } },
        { name: { $regex: /Integration$/i } },
        { 'encryptedCredentials.autoGranted': true },
      ],
    });

    const realConnections = await ConnectorRepository.findByOrg(orgId);

    return {
      success: true,
      cleanedCount: result.deletedCount || 0,
      remainingRealCount: realConnections.length,
      message: `Cleaned up ${result.deletedCount || 0} auto-seeded mock connections. Remaining real user connections: ${realConnections.length}.`,
      connections: realConnections,
    };
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
    // Live Pre-Save Provider Verification & Format Guard
    const verification = await ProviderVerifier.verifyCredentials(connectorId, apiKey);

    const encryptedCredentials = encryptJson({
      apiKey,
      accountName: verification.accountName,
      verifiedAt: new Date().toISOString(),
    });

    return await ConnectorRepository.createConnection({
      organizationId: orgId,
      userId,
      connectorId,
      name: verification.accountName || name,
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

  static async testConnection(connectorId: string, orgId: string, testInput?: any) {
    const conn = await ConnectorRepository.findByOrgAndConnector(orgId, connectorId);
    if (!conn) {
      throw new AppError(`No active connection found for '${connectorId}'. Please connect your account first.`, 404);
    }

    const credentials = decryptJson(conn.encryptedCredentials);

    if (connectorId === 'gmail') {
      const connector = new GmailConnector();

      // If user passed a test email address, send a real test email! Otherwise search/read inbox to verify API access
      if (testInput?.sendTestEmailTo) {
        const result = await connector.executeAction('send_email', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: {
            to: testInput.sendTestEmailTo,
            subject: '⚡ AutoFlow Gmail Connection Verified',
            body: `<h2>Gmail Connection Verified Successfully!</h2><p>This test email confirms that your Gmail account (<strong>${credentials.userEmail || 'me'}</strong>) is connected to AutoFlow AI Platform and able to send formatted email messages.</p><p>Verified at: ${new Date().toLocaleString()}</p>`,
          },
        });
        return {
          status: 'success',
          action: 'send_email',
          account: credentials.userEmail,
          output: result.data,
          message: `Test email sent successfully to ${testInput.sendTestEmailTo}! Check your inbox.`,
        };
      } else {
        const result = await connector.executeAction('read_emails', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: { query: 'label:INBOX', maxResults: 3 },
        });
        return {
          status: 'success',
          action: 'read_emails',
          account: credentials.userEmail,
          output: result.data,
          message: `Gmail API Active & Verified! Found ${result.data?.count || 0} recent messages in inbox for ${credentials.userEmail || 'connected user'}.`,
        };
      }
    }

    if (connectorId === 'google-sheets') {
      const connector = new GoogleSheetsConnector();
      if (testInput?.spreadsheetId) {
        const result = await connector.executeAction('append_row', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: {
            spreadsheetId: testInput.spreadsheetId,
            worksheet: testInput.worksheet || 'Sheet1',
            values: ['AutoFlow Verification Test', new Date().toLocaleString(), 'VERIFIED ACTIVE'],
          },
        });
        return {
          status: 'success',
          action: 'append_row',
          account: credentials.userEmail,
          output: result.data,
          message: `Google Sheets Row Appended Successfully! Sheet range: ${result.data?.updatedRange || 'Sheet1'}.`,
        };
      } else {
        const result = await connector.executeAction('create_spreadsheet', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: { title: `AutoFlow Verified Sheet (${new Date().toLocaleDateString()})` },
        });
        return {
          status: 'success',
          action: 'create_spreadsheet',
          account: credentials.userEmail,
          output: result.data,
          message: `Google Sheets API Active & Verified! Created spreadsheet for ${credentials.userEmail || 'connected account'}: ${result.data?.spreadsheetUrl}`,
        };
      }
    }

    if (connectorId === 'google-drive') {
      const connector = new GoogleDriveConnector();
      if (testInput?.uploadFileName) {
        const result = await connector.executeAction('upload_file', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: {
            fileName: testInput.uploadFileName,
            content: testInput.uploadContent || `AutoFlow Live Test File Created At ${new Date().toLocaleString()}`,
          },
        });
        return {
          status: 'success',
          action: 'upload_file',
          account: credentials.userEmail,
          output: result.data,
          message: `Google Drive File Uploaded Successfully! File Link: ${result.data?.webViewLink}`,
        };
      } else {
        const result = await connector.executeAction('list_files', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: { pageSize: 5 },
        });
        return {
          status: 'success',
          action: 'list_files',
          account: credentials.userEmail,
          output: result.data,
          message: `Google Drive API Active & Verified! Found ${result.data?.count || 0} files in storage for ${credentials.userEmail || 'connected user'}.`,
        };
      }
    }

    if (connectorId === 'google-calendar') {
      const connector = new GoogleCalendarConnector();
      if (testInput?.createTestEvent) {
        const startTime = new Date(Date.now() + 3600000).toISOString();
        const endTime = new Date(Date.now() + 7200000).toISOString();
        const result = await connector.executeAction('create_event', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: {
            summary: testInput.eventTitle || '⚡ AutoFlow Verification Meeting',
            description: 'Scheduled via AutoFlow AI Platform Live Connector Verification.',
            startTime,
            endTime,
          },
        });
        return {
          status: 'success',
          action: 'create_event',
          account: credentials.userEmail,
          output: result.data,
          message: `Google Calendar Event Created Successfully! Calendar Link: ${result.data?.htmlLink}`,
        };
      } else {
        const result = await connector.executeAction('list_events', {
          connectionCredentials: credentials,
          workflowVariables: {},
          stepInput: { maxResults: 5 },
        });
        return {
          status: 'success',
          action: 'list_events',
          account: credentials.userEmail,
          output: result.data,
          message: `Google Calendar API Active & Verified! Found ${result.data?.count || 0} upcoming calendar events for ${credentials.userEmail || 'connected user'}.`,
        };
      }
    }

    if (connectorId === 'google-docs') {
      const connector = new GoogleDocsConnector();
      const result = await connector.executeAction('create_document', {
        connectionCredentials: credentials,
        workflowVariables: {},
        stepInput: { title: `AutoFlow Verified Doc (${new Date().toLocaleDateString()})` },
      });
      return {
        status: 'success',
        action: 'create_document',
        account: credentials.userEmail,
        output: result.data,
        message: `Google Docs API Active & Verified! Created Google Document for ${credentials.userEmail || 'connected user'}: ${result.data?.documentUrl}`,
      };
    }

    // Real Live API test using ProviderVerifier
    const key = credentials.apiKey || credentials.accessToken;
    const verification = await ProviderVerifier.verifyCredentials(connectorId, key || '');

    return {
      status: 'success',
      connectorId,
      account: verification.accountName || conn.name,
      output: verification.details || { verifiedAt: new Date().toISOString() },
      message: verification.message || `Live API Verified for '${connectorId.toUpperCase()}'!`,
    };
  }
}
