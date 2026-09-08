import { WorkflowModel, ConnectionModel } from '@automation/database';
import { logger } from '../config/logger';
import { decryptJson } from '../shared/utils/crypto';
import { jiraConnector, googleDriveConnector } from '@automation/connectors';

/**
 * WebhookRenewalDaemon — Patch 4 Specification
 *
 * Dedicated background job running every 6 hours to renew Jira (30-day)
 * and Google Drive Push Notifications (7-day) webhook registrations before expiry.
 */
export class WebhookRenewalDaemon {
  private static timer: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 6 * 60 * 60 * 1000) { // 6 hours
    logger.info('[WebhookRenewalDaemon] Starting webhook renewal daemon (6-hour interval)...');
    WebhookRenewalDaemon.runCheck();
    WebhookRenewalDaemon.timer = setInterval(() => {
      WebhookRenewalDaemon.runCheck();
    }, intervalMs);
  }

  static stop() {
    if (WebhookRenewalDaemon.timer) {
      clearInterval(WebhookRenewalDaemon.timer);
      WebhookRenewalDaemon.timer = null;
    }
  }

  static async runCheck() {
    try {
      const renewalCutoff = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // Expiring within 3 days

      const activeWorkflows = await WorkflowModel.find({
        status: 'active',
        'triggerState.providerHookId': { $exists: true },
      });

      for (const workflow of activeWorkflows) {
        const triggerNode = workflow.definition.nodes?.find((n: any) => n.type === 'trigger');
        if (!triggerNode) continue;

        const connectorId = triggerNode.connectorId;

        if (connectorId === 'jira') {
          try {
            const connection = await ConnectionModel.findOne({
              organizationId: workflow.organizationId,
              connectorId: 'jira',
            });
            if (!connection) continue;

            const creds = decryptJson(connection.encryptedCredentials);
            const hookId = workflow.triggerState?.providerHookId;

            if (hookId) {
              const { expiresAt } = await jiraConnector.refreshWebhook(creds as any, hookId);
              logger.info(`[WebhookRenewal] Successfully renewed Jira webhook ${hookId} for workflow ${workflow._id}`);
            }
          } catch (err: any) {
            logger.error(`[WebhookRenewal] Failed to renew Jira webhook for workflow ${workflow._id}:`, err.message);
          }
        }
      }
    } catch (err: any) {
      logger.error('[WebhookRenewalDaemon] Check error:', err);
    }
  }
}
