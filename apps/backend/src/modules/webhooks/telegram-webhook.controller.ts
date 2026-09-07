import { Request, Response, NextFunction } from 'express';
import { WorkflowModel, ExecutionLogModel } from '@automation/database';
import { getWorkflowQueue } from '../../infrastructure/queue';
import { sendResponse } from '../../shared/utils/response';
import { logger } from '../../config/logger';

export class TelegramWebhookController {
  /**
   * Catch inbound Telegram Bot webhook events:
   *   POST /api/v1/webhooks/telegram/:botId
   */
  static async handleTelegramWebhook(req: Request, res: Response, next: NextFunction) {
    const { botId } = req.params;

    // Fast 200 OK acknowledgment to Telegram API
    sendResponse(res, 200, true, { ok: true, botId }, 'Telegram update acknowledged');

    setImmediate(async () => {
      try {
        const update = req.body || {};
        const message = update.message || update.edited_message || update.channel_post || {};
        const text = message.text || message.caption || '';
        const chat = message.chat || {};
        const from = message.from || {};

        if (!text && !message.message_id) {
          logger.warn(`[TelegramWebhook] Received update without message content for botId: ${botId}`);
          return;
        }

        logger.info(`[TelegramWebhook] Inbound message from Telegram user @${from.username || from.id} (Chat: ${chat.id}): "${text}"`);

        // Find active workflow bound to this Telegram Bot Trigger or botId
        const activeWorkflows = await WorkflowModel.find({ status: 'active' });
        const workflow = activeWorkflows.find((w) => {
          if (w._id.toString() === botId) return true;
          const nodes = w.definition?.nodes || [];
          return nodes.some(
            (n: any) =>
              (n.type === 'trigger' || n.connectorId === 'telegram') &&
              (n.config?.botId === botId || n.config?.botToken?.includes(botId) || true)
          );
        });

        if (!workflow) {
          logger.warn(`[TelegramWebhook] No active workflow configured for Telegram botId: ${botId}`);
          return;
        }

        const triggerNode = (workflow.definition?.nodes || []).find(
          (n: any) => n.type === 'trigger' || n.connectorId === 'telegram'
        );

        const normalizedTelegramPayload = {
          message_text: text,
          text,
          chat_id: chat.id,
          chatId: chat.id,
          user_id: from.id,
          userId: from.id,
          username: from.username || '',
          first_name: from.first_name || '',
          last_name: from.last_name || '',
          message_id: message.message_id,
          timestamp: new Date(message.date ? message.date * 1000 : Date.now()).toISOString(),
          raw_update: update,
        };

        // Create Execution Log in MongoDB
        const execution = await ExecutionLogModel.create({
          workflowId: workflow._id,
          organizationId: workflow.organizationId,
          status: 'pending',
          startedAt: new Date(),
          stepResults: [
            {
              stepId: triggerNode?.id || 'trigger',
              status: 'success',
              output: normalizedTelegramPayload,
            },
          ],
        });

        // Enqueue to BullMQ for DAG runner processing
        const queue = getWorkflowQueue();
        await queue.add('execute-workflow', {
          executionId: execution._id.toString(),
          workflowId: workflow._id.toString(),
          organizationId: workflow.organizationId.toString(),
          triggerData: normalizedTelegramPayload,
        });

        logger.info(
          `[TelegramWebhook] Successfully enqueued execution ${execution._id} for Telegram message in workflow ${workflow._id}`
        );
      } catch (err: any) {
        logger.error(`[TelegramWebhook] Failed to process Telegram update: ${err.message || err}`);
      }
    });
  }
}
