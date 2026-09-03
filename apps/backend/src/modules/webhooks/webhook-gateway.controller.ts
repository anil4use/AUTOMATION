import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { WorkflowModel, ExecutionLogModel } from '@automation/database';
import { getWorkflowQueue } from '../../infrastructure/queue';
import { sendResponse } from '../../shared/utils/response';
import { logger } from '../../config/logger';

/**
 * WebhookGatewayController
 *
 * Universal Webhook Catch Gateway (Zapier.md Topics 7, 41, 49)
 *
 * Receives incoming HTTP POST payloads from ANY third-party application on:
 *   POST /api/v1/webhooks/catch/:webhookId
 *
 * Flow:
 *  1. Responds immediately with 200 OK (so external callers never timeout).
 *  2. Looks up the target workflow matching webhookId.
 *  3. Creates an ExecutionLog in 'pending' status.
 *  4. Pushes job onto BullMQ workflow-execution-queue asynchronously.
 */
export class WebhookGatewayController {
  /**
   * Catch arbitrary HTTP POST / GET / PUT webhook calls
   */
  static async catchWebhook(req: Request, res: Response, next: NextFunction) {
    const { webhookId } = req.params;

    // Fast HTTP acknowledgment — Zapier standard (always respond 200 OK immediately)
    sendResponse(res, 200, true, { received: true, webhookId }, 'Webhook received');

    // Asynchronous background processing
    setImmediate(async () => {
      try {
        const payload = req.method === 'GET' ? req.query : req.body;
        const headers = req.headers;

        logger.info(`[WebhookGateway] Inbound webhook received for webhookId: ${webhookId}`);

        // 1. Locate workflow where webhookId matches trigger config in definition.nodes
        const allActiveWorkflows = await WorkflowModel.find({ status: 'active' });
        const workflow = allActiveWorkflows.find((w) => {
          if (w._id.toString() === webhookId) return true;
          const triggerNode = (w.definition?.nodes || []).find((n: any) => n.type === 'trigger');
          return triggerNode?.config?.webhookId === webhookId;
        });

        if (!workflow) {
          logger.warn(`[WebhookGateway] No active workflow found matching webhookId: ${webhookId}`);
          return;
        }

        const triggerNode = (workflow.definition?.nodes || []).find((n: any) => n.type === 'trigger');

        // 2. Create Execution Log in MongoDB
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

        // 3. Enqueue to BullMQ
        const queue = getWorkflowQueue();
        await queue.add('execute-workflow', {
          executionId: execution._id.toString(),
          workflowId: workflow._id.toString(),
          organizationId: workflow.organizationId.toString(),
          triggerData: { payload, headers },
        });

        logger.info(
          `[WebhookGateway] Enqueued execution ${execution._id} for workflow ${workflow._id}`
        );
      } catch (err: any) {
        logger.error(`[WebhookGateway] Failed to enqueue webhook execution: ${err.message}`);
      }
    });
  }
}
