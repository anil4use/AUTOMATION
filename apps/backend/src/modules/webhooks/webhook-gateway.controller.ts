import { Request, Response, NextFunction } from 'express';
import { WebhookModel, WorkflowModel, ExecutionLogModel } from '@automation/database';
import { getWorkflowQueue } from '../../infrastructure/queue';
import { sendResponse } from '../../shared/utils/response';
import { logger } from '../../config/logger';
import crypto from 'crypto';

/**
 * Universal Webhook Gateway Controller (Phase 7, Patch 1, Patch 7, Issue 3)
 */
export class WebhookGatewayController {
  /**
   * Meta WhatsApp GET verification handler (Patch 7)
   */
  static async verifyWhatsAppWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { webhookId } = req.params;
      const { 'hub.mode': mode, 'hub.verify_token': verifyToken, 'hub.challenge': challenge } = req.query;

      if (mode === 'subscribe') {
        const webhook = await WebhookModel.findOne({ webhookId });
        if (!webhook) {
          return res.status(404).json({ error: 'Webhook not found' });
        }

        if (verifyToken !== webhook.secret) {
          return res.status(403).json({ error: 'Verification token mismatch' });
        }

        logger.info(`[WebhookGateway] Meta WhatsApp GET verification challenge passed for ${webhookId}`);
        return res.status(200).send(challenge);
      }

      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Universal catch handler (POST / PUT / GET)
   */
  static async catchWebhook(req: Request, res: Response, next: NextFunction) {
    const { webhookId } = req.params;
    const body = req.body || {};

    // 1. Slack URL Verification Challenge (Issue 3 Step A)
    if (body.type === 'url_verification') {
      logger.info(`[WebhookGateway] Slack URL verification challenge responded for ${webhookId}`);
      return res.status(200).json({ challenge: body.challenge });
    }

    // Fast 200 OK Response — external webhooks standard
    sendResponse(res, 200, true, { received: true, webhookId }, 'Webhook received');

    // Async background processing
    setImmediate(async () => {
      try {
        const payload = req.method === 'GET' ? req.query : req.body;
        const headers = req.headers;

        logger.info(`[WebhookGateway] Processing webhook payload for webhookId: ${webhookId}`);

        // Find all matching active workflows
        const allActiveWorkflows = await WorkflowModel.find({ status: 'active' });

        const matchingWorkflows = allActiveWorkflows.filter((w) => {
          if (w._id.toString() === webhookId) return true;
          if (w.triggerState?.webhookId === webhookId) return true;
          const triggerNode = (w.definition?.nodes || []).find((n: any) => n.type === 'trigger');
          return triggerNode?.config?.webhookId === webhookId || triggerNode?.config?.url === webhookId;
        });

        if (matchingWorkflows.length === 0) {
          logger.warn(`[WebhookGateway] No active workflow found matching webhookId: ${webhookId}`);
          return;
        }

        // Patch 1: Enqueue execution for ALL matching active workflows (no deduplication)
        for (const workflow of matchingWorkflows) {
          const triggerNode = (workflow.definition?.nodes || []).find((n: any) => n.type === 'trigger');

          const execution = await ExecutionLogModel.create({
            workflowId: workflow._id,
            organizationId: workflow.organizationId,
            status: 'pending',
            startedAt: new Date(),
            stepResults: [
              {
                stepId: triggerNode?.id || 'trigger',
                status: 'success',
                output: { payload, headers, receivedAt: new Date() },
              },
            ],
          });

          const queue = getWorkflowQueue();
          await queue.add('execute-workflow', {
            executionId: execution._id.toString(),
            workflowId: workflow._id.toString(),
            organizationId: workflow.organizationId.toString(),
            triggerData: { payload, headers },
          });

          logger.info(`[WebhookGateway] Enqueued execution ${execution._id} for workflow ${workflow._id}`);
        }
      } catch (err: any) {
        logger.error(`[WebhookGateway] Failed to process webhook: ${err.message}`);
      }
    });
  }
}
