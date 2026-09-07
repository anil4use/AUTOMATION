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
      const url = ConnectorService.getOAuthAuthorizeUrl(connectorId, req.user!.organizationId, req.user!.userId);
      return sendResponse(res, 200, true, { url });
    } catch (err) {
      next(err);
    }
  }

  static async handleOAuthCallback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId } = req.params;
      const { code } = req.body;
      const connection = await ConnectorService.handleOAuthCallback(
        connectorId,
        code,
        req.user!.organizationId,
        req.user!.userId
      );
      return sendResponse(res, 201, true, connection, 'OAuth connection created');
    } catch (err) {
      next(err);
    }
  }

  static async createApiKeyConnection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId, name, apiKey, credentials } = req.body;
      const keyToUse = apiKey || credentials?.apiKey || credentials?.key || req.body.key;
      const connection = await ConnectorService.createApiKeyConnection(
        req.user!.organizationId,
        req.user!.userId,
        connectorId,
        name,
        keyToUse
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
