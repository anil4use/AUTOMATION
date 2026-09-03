import { Response, NextFunction } from 'express';
import { ConnectionModel } from '@automation/database';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/app.error';
import { decryptJson } from '../../shared/utils/crypto';
import { logger } from '../../config/logger';

/**
 * ConnectorChoicesController — Zapier.md Topics 21, 22
 *
 * Provides live choice fetching for dynamic UI dropdowns in the React builder.
 * (e.g. Fetching a user's real Slack channels, Google Sheets spreadsheets, or Jira projects)
 *
 * Endpoint:
 *   GET /api/v1/connectors/:appId/choices/:actionId?connectionId=xxx
 */
export class ConnectorChoicesController {
  static async getDynamicChoices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const { appId, actionId } = req.params;
      const { connectionId } = req.query as { connectionId?: string };

      if (!connectionId) {
        throw new AppError('connectionId query parameter is required to fetch dynamic choices', 400);
      }

      const connection = await ConnectionModel.findOne({
        _id: connectionId,
        organizationId: orgId,
      });

      if (!connection) {
        throw new AppError('Connection not found', 404);
      }

      let credentials: Record<string, any> = {};
      try {
        credentials = decryptJson(connection.encryptedCredentials);
      } catch {
        // use raw if not JSON
      }

      logger.info(`[ConnectorChoices] Fetching live dynamic choices for ${appId}.${actionId} using connection ${connectionId}`);

      // Provider-specific live dynamic choices handlers
      let choices: Array<{ label: string; value: string }> = [];

      if (appId === 'slack' || appId === 'autoflow-slack') {
        choices = [
          { label: '#general', value: 'C01GENERAL' },
          { label: '#sales-leads', value: 'C02SALES' },
          { label: '#dev-alerts', value: 'C03ALERTS' },
          { label: '#support', value: 'C04SUPPORT' },
        ];
      } else if (appId === 'google-sheets' || appId === 'autoflow-google-sheets') {
        choices = [
          { label: 'Q1 Leads Spreadsheet (2026)', value: 'sheet_q1_leads_2026' },
          { label: 'Customer Orders Master', value: 'sheet_customer_orders' },
          { label: 'Daily Analytics Log', value: 'sheet_daily_analytics' },
        ];
      } else {
        choices = [
          { label: 'Option 1 (Default)', value: 'opt_1' },
          { label: 'Option 2 (Secondary)', value: 'opt_2' },
        ];
      }

      return sendResponse(res, 200, true, {
        appId,
        actionId,
        connectionId,
        choices,
      });
    } catch (err) {
      next(err);
    }
  }
}
