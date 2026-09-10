import { Response, NextFunction } from 'express';
import { ConnectorService } from './connector.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class ConnectorController {
  static async listAvailable(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = ConnectorService.getAvailableConnectors();
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async listUserConnections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ConnectorService.getUserConnections(req.user!.organizationId);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async authorizeOAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId } = req.params;
      const orgId = req.user?.organizationId || (req.query.orgId as string) || 'org_demo_123';
      const userId = req.user?.userId || (req.query.userId as string) || 'user_demo_123';

      const url = ConnectorService.getOAuthAuthorizeUrl(connectorId, orgId, userId);
      const isPlaceholder = !url || url.includes('autoflow_') || url.includes('YOUR_') || url.includes('placeholder');

      // If called from browser window popup navigation, issue direct 302 redirect to OAuth consent screen
      const isBrowserNav = req.query.redirect === 'true' || req.headers.accept?.includes('text/html') || !req.headers.authorization;
      if (isBrowserNav) {
        if (isPlaceholder) {
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>OAuth App Setup Required — AutoFlow</title>
              <style>
                body { background: #0b0f19; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { text-align: center; padding: 32px; background: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); max-width: 440px; width: 90%; }
                .icon { width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #60a5fa; font-size: 24px; font-weight: bold; }
                h2 { font-size: 18px; margin: 0 0 8px; font-weight: 700; color: #ffffff; }
                p { color: #9ca3af; font-size: 13px; margin: 0 0 16px; line-height: 1.5; }
                .tip { background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 14px; text-align: left; font-size: 13px; color: #93c5fd; }
                code { background: rgba(255, 255, 255, 0.1); padding: 2px 6px; border-radius: 4px; color: #38bdf8; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">⚙️</div>
                <h2>${connectorId.toUpperCase()} Developer App Keys Required</h2>
                <p>Official OAuth 2.0 requires registering a developer application and adding <code>${connectorId.toUpperCase()}_CLIENT_ID</code> & <code>${connectorId.toUpperCase()}_CLIENT_SECRET</code> to your <code>.env</code> file.</p>
                <div class="tip">
                  💡 <strong>Zero-Setup Instant Alternative:</strong><br>
                  Close this window and select <strong>Option 2 (Direct Session Cookie li_at)</strong> in AutoFlow to connect your personal LinkedIn account immediately without any developer API keys!
                </div>
              </div>
            </body>
            </html>
          `;
          return res.setHeader('Content-Type', 'text/html').send(html);
        }
        return res.redirect(url);
      }

      return sendResponse(res, 200, true, { url, isPlaceholder });
    } catch (err) {
      next(err);
    }
  }

  static async handleOAuthCallback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId } = req.params;
      const code = (req.query.code as string) || req.body?.code;
      const rawState = (req.query.state as string) || req.body?.state;

      let orgId = req.user?.organizationId || 'org_demo_123';
      let userId = req.user?.userId || 'user_demo_123';

      if (rawState) {
        try {
          const parsed = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8'));
          if (parsed.orgId) orgId = parsed.orgId;
          if (parsed.userId) userId = parsed.userId;
        } catch { }
      }

      const connection = await ConnectorService.handleOAuthCallback(
        connectorId,
        code || `mock_code_${Date.now()}`,
        orgId,
        userId
      );

      // If browser GET callback from OAuth provider, send auto-closing HTML window page
      if (req.method === 'GET') {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Account Connected — AutoFlow</title>
            <style>
              body { background: #0b0f19; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; padding: 32px; background: #111827; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6); max-width: 380px; width: 90%; }
              .icon { width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #10b981; font-size: 24px; font-weight: bold; }
              h2 { font-size: 18px; margin: 0 0 8px; font-weight: 700; color: #ffffff; }
              p { color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✓</div>
              <h2>Account Connected!</h2>
              <p>Your ${connectorId.toUpperCase()} account has been authorized. Closing window...</p>
            </div>
            <script>
              try {
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', connectorId: '${connectorId}' }, '*');
                }
              } catch (e) {}
              setTimeout(function() { window.close(); }, 1000);
            </script>
          </body>
          </html>
        `;
        return res.setHeader('Content-Type', 'text/html').send(html);
      }

      return sendResponse(res, 201, true, connection, 'OAuth connection created');
    } catch (err) {
      next(err);
    }
  }

  static async createApiKeyConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId, name, apiKey, credentials } = req.body;
      const keyToUse = apiKey || (credentials ? JSON.stringify(credentials) : undefined) || req.body.key;
      const connection = await ConnectorService.createApiKeyConnection(
        req.user!.organizationId,
        req.user!.userId,
        connectorId,
        name,
        keyToUse,
        req.body
      );
      return sendResponse(res, 201, true, connection, 'API Key connection saved securely');
    } catch (err) {
      next(err);
    }
  }

  static async deleteConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await ConnectorService.deleteConnection(req.params.id, req.user!.organizationId);
      return sendResponse(res, 200, true, null, 'Connection deleted');
    } catch (err) {
      next(err);
    }
  }

  static async testConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId } = req.params;
      const data = await ConnectorService.testConnection(connectorId, req.user!.organizationId, req.body);
      return sendResponse(res, 200, true, data, 'Connection test successful');
    } catch (err) {
      next(err);
    }
  }

  static async testRawConnectionConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ConnectorService.testConnectionConfig(req.body);
      return sendResponse(res, 200, result.success, result, result.success ? 'Database connection verified' : result.error);
    } catch (err) {
      next(err);
    }
  }

  static async testSavedConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectionId } = req.params;
      const result = await ConnectorService.testSavedConnection(connectionId, req.user!.organizationId);
      return sendResponse(res, 200, result.success, result, result.success ? 'Saved connection re-test successful' : result.error);
    } catch (err) {
      next(err);
    }
  }

  static async updateConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectionId } = req.params;
      const updated = await ConnectorService.updateDatabaseConnection(connectionId, req.user!.organizationId, req.body);
      return sendResponse(res, 200, true, updated, 'Database connection updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async installAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ConnectorService.cleanAutoSeededConnections(
        req.user?.organizationId || 'org_demo_123'
      );
      return sendResponse(res, 200, true, data, 'Cleaned up mock connections in database');
    } catch (err) {
      next(err);
    }
  }
}
