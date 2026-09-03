import { Request, Response } from 'express';
import { whatsAppAdapter } from '@automation/connector-sdk';
import { WhatsAppAutomationService } from './whatsapp-automation.service';
import { ConversationService } from './conversation.service';
import { UserMemoryService } from './user-memory.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { getMemoryExtractionQueue } from '../../infrastructure/queue';
import { logger } from '../../config/logger';
import { WebhookHandleResult } from './whatsapp-agent.types';

/**
 * WebhookHandler — the orchestration entry point for all incoming WhatsApp messages.
 *
 * Flow:
 *  1. Verify webhook challenge (GET) or message authenticity (POST)
 *  2. Normalize raw payload → NormalizedMessage
 *  3. Load automation config + check access control
 *  4. Get/create conversation session
 *  5. Persist incoming user message
 *  6. Build agent context (history + memory)
 *  7. Generate LLM reply
 *  8. Persist agent reply
 *  9. Send reply via WhatsApp API
 * 10. Queue async memory extraction job
 */
export class WebhookHandler {
  /**
   * Handle GET — Meta webhook verification challenge.
   * Called once when the webhook URL is registered in Meta Developer Portal.
   */
  static handleVerification(req: Request, res: Response, automationId: string): void {
    const query = req.query as Record<string, string>;

    // We don't have the automation's verifyToken at this point without a DB lookup,
    // but we can handle this by loading the automation first.
    WhatsAppAutomationService.getByIdWithCredentials(automationId)
      .then(({ automation, accessToken }) => {
        const credentials = {
          accessToken,
          verifyToken: automation.verifyToken,
          phoneNumberId: automation.whatsappPhoneNumberId,
        };

        const result = whatsAppAdapter.verifyWebhook(query, null, credentials);

        if (result === false) {
          logger.warn(`[WebhookHandler] Verification failed for automation ${automationId}`);
          res.status(403).json({ error: 'Forbidden' });
          return;
        }

        // Echo the challenge back to Meta
        res.status(200).send(result);
      })
      .catch((err) => {
        logger.error(`[WebhookHandler] Error during verification: ${err.message}`);
        res.status(500).json({ error: 'Internal server error' });
      });
  }

  /**
   * Handle POST — incoming WhatsApp message from a user.
   * Always returns 200 immediately (Meta requires fast acknowledgment),
   * processing happens before sending the reply.
   */
  static async handleIncomingMessage(
    automationId: string,
    rawBody: any
  ): Promise<WebhookHandleResult> {
    // ── Step 1: Normalize payload ────────────────────────────────────────────
    const normalizedMessage = whatsAppAdapter.normalize(rawBody, automationId);

    if (!normalizedMessage) {
      // Status updates, delivery receipts, etc. — silently ignore
      return { processed: false, reason: 'not_a_user_message' };
    }

    logger.info(
      `[WebhookHandler] Received ${normalizedMessage.type} message from ${normalizedMessage.userId} on automation ${automationId}`
    );

    // ── Step 2: Load automation + credentials ────────────────────────────────
    let automation: any;
    let accessToken: string;

    try {
      const result = await WhatsAppAutomationService.getByIdWithCredentials(automationId);
      automation = result.automation;
      accessToken = result.accessToken;
    } catch (err: any) {
      logger.error(`[WebhookHandler] Automation not found: ${automationId}`, err);
      return { processed: false, reason: 'automation_not_found' };
    }

    // ── Step 3: Check enabled state ──────────────────────────────────────────
    if (!automation.enabled) {
      return { processed: false, reason: 'automation_disabled' };
    }

    // ── Step 4: Access control check ────────────────────────────────────────
    const access = WhatsAppAutomationService.checkUserAccess(automation, normalizedMessage.userId);
    if (!access.allowed) {
      logger.info(
        `[WebhookHandler] Blocked user ${normalizedMessage.userId}: ${access.reason}`
      );
      return { processed: false, reason: access.reason };
    }

    const orgId = automation.organizationId.toString();

    // ── Step 5: Get/create conversation session ──────────────────────────────
    const conversation = await ConversationService.getOrCreateSession(
      automationId,
      orgId,
      normalizedMessage.userId,
      normalizedMessage.channel,
      automation.conversationTimeoutMinutes ?? 60
    );

    const conversationId = conversation._id.toString();

    // ── Step 6: Persist incoming user message ────────────────────────────────
    await ConversationService.addMessage(
      conversationId,
      orgId,
      'user',
      normalizedMessage.content,
      normalizedMessage
    );

    // ── Step 7: Load context (history + memory) ──────────────────────────────
    const [history, userMemory] = await Promise.all([
      ConversationService.getHistory(conversationId, automation.maxHistoryMessages ?? 20),
      UserMemoryService.getUserMemory(orgId, automationId, normalizedMessage.userId, normalizedMessage.channel),
    ]);

    const memoryContext = UserMemoryService.buildMemoryContext(userMemory);

    // ── Step 8: Generate agent reply ────────────────────────────────────────
    const agentReply = await AgentRuntimeService.generateReply({
      automationId,
      organizationId: orgId,
      externalUserId: normalizedMessage.userId,
      userName: normalizedMessage.userName || userMemory.profile?.name,
      channel: normalizedMessage.channel,
      currentMessage: normalizedMessage.content,
      conversationHistory: history,
      userProfile: userMemory.profile,
      longTermMemory: userMemory.facts,
      agentPersonality: automation.agentPersonality,
    });

    // ── Step 9: Persist agent reply ─────────────────────────────────────────
    await ConversationService.addMessage(conversationId, orgId, 'agent', agentReply);

    // ── Step 10: Send reply via WhatsApp API ─────────────────────────────────
    try {
      await whatsAppAdapter.send(normalizedMessage.userId, agentReply, {
        accessToken,
        phoneNumberId: automation.whatsappPhoneNumberId,
        verifyToken: automation.verifyToken,
      });
      logger.info(`[WebhookHandler] Reply sent to ${normalizedMessage.userId}`);
    } catch (err: any) {
      logger.error(`[WebhookHandler] Failed to send WhatsApp message: ${err.message}`);
      // Don't throw — we still want to queue memory extraction
    }

    // ── Step 11: Queue async memory extraction ──────────────────────────────
    if (automation.memoryExtractionEnabled !== false) {
      const messageCount = await ConversationService.getSessionMessageCount(conversationId);
      const extractEveryN = automation.memoryExtractionAfterEveryN ?? 3;

      // Extract memory every N message pairs (user + agent = 2 messages per turn)
      if (messageCount % (extractEveryN * 2) === 0) {
        try {
          const memoryQueue = getMemoryExtractionQueue();
          await memoryQueue.add('extract-memory', {
            automationId,
            organizationId: orgId,
            externalUserId: normalizedMessage.userId,
            channel: normalizedMessage.channel,
            conversationId,
            agentModel: automation.agentModel,
          });
          logger.info(`[WebhookHandler] Memory extraction job queued for conversation ${conversationId}`);
        } catch (qErr) {
          logger.warn('[WebhookHandler] Redis queue unavailable, running background memory extraction directly...');
          setImmediate(() => {
            ConversationService.getHistory(conversationId, 20)
              .then((history) => {
                const { MemoryExtractionService } = require('./memory-extraction.service');
                MemoryExtractionService.extractAndPersist(
                  orgId,
                  automationId,
                  normalizedMessage.userId,
                  normalizedMessage.channel,
                  history.map((m) => ({ role: m.role as 'user' | 'agent', content: m.content })),
                  automation.agentModel
                ).catch((e: any) => logger.warn('[WebhookHandler] Direct memory extraction failed:', e));
              })
              .catch(() => {});
          });
        }
      }
    }

    // Update user activity tracking
    await UserMemoryService.touchUserActivity(
      orgId,
      automationId,
      normalizedMessage.userId,
      normalizedMessage.channel
    ).catch(() => {/* non-critical */});

    return {
      processed: true,
      conversationId,
      agentReply,
    };
  }
}
