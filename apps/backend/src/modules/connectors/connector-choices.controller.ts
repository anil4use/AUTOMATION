import { Response, NextFunction } from 'express';
import { ConnectionModel } from '@automation/database';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/app.error';
import { decryptJson } from '../../shared/utils/crypto';
import { logger } from '../../config/logger';
import { getRedisPublisher } from '../../infrastructure/redis';
import {
  getGitHubChoices,
  getSlackChoices,
  getGmailChoices,
  getGoogleSheetsChoices,
  getGoogleDriveChoices,
  getOpenAIChoices,
  getAnthropicChoices,
  getMsTeamsChoices,
  getMsOutlookChoices,
  getMsExcelChoices,
  getDropboxChoices,
  getZoomChoices,
  getWooCommerceChoices,
  getPayPalChoices,
  getMailchimpChoices,
  getTrelloChoices,
  getCalendlyChoices,
  getPipedriveChoices,
  getAsanaChoices,
  getMondayChoices,
  getInstagramChoices,
  getFacebookChoices,
  getMetaMessengerChoices,
  getActiveCampaignChoices,
  getGoogleGeminiChoices,
  getAIDocumentOCRChoices,
  getGitLabChoices,
  getLinearChoices,
  getVercelChoices,
  getQuickBooksChoices,
  getDocuSignChoices,
  getWebhookTriggerChoices,
} from '@automation/connectors';

/**
 * ConnectorChoicesController — Zapier.md Topics 21, 22
 *
 * Provides live choice fetching for dynamic UI dropdowns in the React builder.
 * (e.g. Fetching a user's real Slack channels, Google Sheets spreadsheets, or GitHub repos)
 *
 * Endpoint:
 *   GET /api/v1/connectors/:appId/choices/:fieldId?connectionId=xxx&dependsOn=...
 */
export class ConnectorChoicesController {
  static async getDynamicChoices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const { appId, actionId: fieldId } = req.params;
      const { connectionId, dependsOn } = req.query as { connectionId?: string; dependsOn?: string };

      if (!connectionId) {
        throw new AppError('connectionId query parameter is required to fetch dynamic choices', 400);
      }

      let parsedDependsOn: Record<string, any> = {};
      if (dependsOn) {
        try {
          parsedDependsOn = JSON.parse(dependsOn);
        } catch {
          // ignore invalid JSON string
        }
      }

      // ─── Redis Cache Lookup (TTL 300s / 5 min) ──────────────────────────────────
      const cacheKey = `choices:${appId}:${fieldId}:${connectionId}:${JSON.stringify(parsedDependsOn)}`;
      try {
        const redis = getRedisPublisher();
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info(`[ConnectorChoices] Cache hit for ${cacheKey}`);
          return sendResponse(res, 200, true, {
            appId,
            fieldId,
            connectionId,
            choices: JSON.parse(cached),
            cached: true,
          });
        }
      } catch (err) {
        logger.warn('[ConnectorChoices] Redis cache check failed, falling through to live API:', err);
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
        // fall back to raw if string
      }

      logger.info(`[ConnectorChoices] Fetching live choices for app '${appId}', field '${fieldId}' using connection ${connectionId}`);

      let choices: Array<{ label: string; value: string; description?: string }> = [];

      switch (appId) {
        case 'github':
          choices = await getGitHubChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'slack':
          choices = await getSlackChoices(fieldId, credentials as any);
          break;
        case 'gmail':
          choices = await getGmailChoices(fieldId, credentials as any);
          break;
        case 'google-sheets':
          choices = await getGoogleSheetsChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'google-drive':
          choices = await getGoogleDriveChoices(fieldId, credentials as any);
          break;
        case 'openai':
          choices = await getOpenAIChoices(fieldId, credentials as any);
          break;
        case 'anthropic':
          choices = await getAnthropicChoices(fieldId, credentials as any);
          break;
        case 'ms-teams':
          choices = await getMsTeamsChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'ms-outlook':
          choices = await getMsOutlookChoices(fieldId, credentials as any);
          break;
        case 'ms-excel':
          choices = await getMsExcelChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'dropbox':
          choices = await getDropboxChoices(fieldId, credentials as any);
          break;
        case 'zoom':
          choices = await getZoomChoices(fieldId, credentials as any);
          break;
        case 'woocommerce':
          choices = await getWooCommerceChoices(fieldId, credentials as any);
          break;
        case 'paypal':
          choices = await getPayPalChoices(fieldId, credentials as any);
          break;
        case 'mailchimp':
          choices = await getMailchimpChoices(fieldId, credentials as any);
          break;
        case 'trello':
          choices = await getTrelloChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'calendly':
          choices = await getCalendlyChoices(fieldId, credentials as any);
          break;
        case 'pipedrive':
          choices = await getPipedriveChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'asana':
          choices = await getAsanaChoices(fieldId, credentials as any, parsedDependsOn);
          break;
        case 'monday':
          choices = await getMondayChoices(fieldId, credentials as any);
          break;
        case 'instagram':
          choices = await getInstagramChoices(fieldId, credentials as any);
          break;
        case 'facebook':
          choices = await getFacebookChoices(fieldId, credentials as any);
          break;
        case 'meta-messenger':
          choices = await getMetaMessengerChoices(fieldId, credentials as any);
          break;
        case 'activecampaign':
          choices = await getActiveCampaignChoices(fieldId, credentials as any);
          break;
        case 'google-gemini':
          choices = await getGoogleGeminiChoices(fieldId, credentials as any);
          break;
        case 'ai-document-ocr':
          choices = await getAIDocumentOCRChoices(fieldId, credentials as any);
          break;
        case 'gitlab':
          choices = await getGitLabChoices(fieldId, credentials as any);
          break;
        case 'linear':
          choices = await getLinearChoices(fieldId, credentials as any);
          break;
        case 'vercel':
          choices = await getVercelChoices(fieldId, credentials as any);
          break;
        case 'quickbooks':
          choices = await getQuickBooksChoices(fieldId, credentials as any);
          break;
        case 'docusign':
          choices = await getDocuSignChoices(fieldId, credentials as any);
          break;
        case 'webhook-trigger':
          choices = await getWebhookTriggerChoices(fieldId, credentials as any);
          break;
        default:
          throw new AppError(`No dynamic choices handler implemented for connector '${appId}'`, 404);
      }

      // Store in Redis (TTL 300s = 5 min)
      try {
        const redis = getRedisPublisher();
        await redis.setex(cacheKey, 300, JSON.stringify(choices));
      } catch (err) {
        logger.warn('[ConnectorChoices] Failed to cache choices in Redis:', err);
      }

      return sendResponse(res, 200, true, {
        appId,
        fieldId,
        connectionId,
        choices,
        cached: false,
      });
    } catch (err) {
      next(err);
    }
  }
}
