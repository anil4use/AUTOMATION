import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { WhatsAppAutomationModel } from '@automation/database';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/app.error';
import { ConversationService } from './conversation.service';
import { UserMemoryService } from './user-memory.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { WhatsAppAutomationService } from './whatsapp-automation.service';
import { encryptJson } from '../../shared/utils/crypto';
import { logger } from '../../config/logger';

/**
 * WhatsAppSimulatorController
 *
 * Allows testing the full agent pipeline (conversation + memory + LLM)
 * WITHOUT a real WhatsApp API key or number.
 *
 * The simulate endpoint runs the exact same flow as the real webhook handler,
 * but instead of calling Meta's API to send a message, it returns the reply
 * directly in the HTTP response.
 */
export class WhatsAppSimulatorController {
  /**
   * POST /api/v1/wa/simulate
   *
   * Body:
   * {
   *   automationId: string,
   *   message: string,
   *   simulatedUserId?: string   // phone number to simulate (default: "sim_user_001")
   * }
   *
   * Returns the agent reply directly — no WhatsApp API call made.
   */
  static async simulate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const { automationId, message, simulatedUserId = 'sim_user_001' } = req.body;

      if (!automationId || !message?.trim()) {
        throw new AppError('automationId and message are required', 400);
      }

      // Load automation (verify it belongs to this org)
      const automation = await WhatsAppAutomationModel.findOne({
        _id: new Types.ObjectId(automationId),
        organizationId: new Types.ObjectId(orgId),
      });

      if (!automation) {
        throw new AppError('WhatsApp Automation not found', 404);
      }

      if (!automation.enabled) {
        throw new AppError('This automation is disabled', 400);
      }

      const channel = 'whatsapp';
      const userId = simulatedUserId;

      // ── Same flow as real webhook, minus the WhatsApp API send ──────────────

      // 1. Get or create conversation session
      const conversation = await ConversationService.getOrCreateSession(
        automationId,
        orgId,
        userId,
        channel,
        automation.conversationTimeoutMinutes ?? 60
      );

      const conversationId = conversation._id.toString();

      // 2. Persist user message
      await ConversationService.addMessage(conversationId, orgId, 'user', message.trim());

      // 3. Load context in parallel
      const [history, userMemory] = await Promise.all([
        ConversationService.getHistory(conversationId, automation.maxHistoryMessages ?? 20),
        UserMemoryService.getUserMemory(orgId, automationId, userId, channel),
      ]);

      // 4. Generate agent reply
      const agentReply = await AgentRuntimeService.generateReply({
        automationId,
        organizationId: orgId,
        externalUserId: userId,
        userName: userMemory.profile?.name,
        channel,
        currentMessage: message.trim(),
        conversationHistory: history,
        userProfile: userMemory.profile,
        longTermMemory: userMemory.facts || [],
        agentPersonality: automation.agentPersonality,
      });

      // 5. Persist agent reply
      await ConversationService.addMessage(conversationId, orgId, 'agent', agentReply);

      // 6. Trigger background memory extraction (works seamlessly with or without Redis)
      if (automation.memoryExtractionEnabled !== false) {
        const { MemoryExtractionService } = require('./memory-extraction.service');
        MemoryExtractionService.extractAndPersist(
          orgId,
          automationId,
          userId,
          channel,
          [...history, { role: 'agent', content: agentReply }],
          automation.agentModel
        ).catch((e: any) => logger.warn('[Simulator] Memory extraction error:', e));
      }

      // 7. Update user activity (non-critical)
      UserMemoryService.touchUserActivity(orgId, automationId, userId, channel).catch(() => {});

      logger.info(`[Simulator] Processed message for automation ${automationId}`);

      return sendResponse(res, 200, true, {
        reply: agentReply,
        conversationId,
        automationId,
        simulatedUserId: userId,
        memoryFacts: userMemory.facts?.length || 0,
        historyLength: history.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/wa/automations/quick-create
   *
   * Creates a simulator-ready automation with just a name + personality.
   * No WhatsApp credentials needed — uses placeholder values.
   * Perfect for testing the agent without any Meta API setup.
   *
   * Body:
   * {
   *   name: string,
   *   agentPersonality?: string
   * }
   */
  static async quickCreate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
      const { name, agentPersonality } = req.body;

      if (!name?.trim()) {
        throw new AppError('name is required', 400);
      }

      // Create a simulator-ready automation with placeholder WA credentials
      const encryptedAccessToken = encryptJson({ accessToken: 'simulator_mode' });

      const automation = await WhatsAppAutomationModel.create({
        organizationId: new Types.ObjectId(orgId),
        creatorId: new Types.ObjectId(userId),
        name: name.trim(),
        description: 'Created via simulator — no real WhatsApp credentials needed.',
        enabled: true,
        whatsappPhoneNumberId: 'simulator',
        encryptedAccessToken,
        verifyToken: 'simulator',
        agentModel: 'gemini',
        agentPersonality: agentPersonality?.trim() || undefined,
        allowedUsers: [],
        blockedUsers: [],
        enableLongTermMemory: true,
        memoryExtractionEnabled: true,
        conversationTimeoutMinutes: 120,
        maxHistoryMessages: 30,
      });

      logger.info(`[Simulator] Quick-created automation "${name}" for org ${orgId}`);

      return sendResponse(res, 201, true, {
        automationId: automation._id.toString(),
        name: automation.name,
        agentPersonality: automation.agentPersonality,
        message: 'Simulator automation ready! Use this automationId with the /simulate endpoint.',
      });
    } catch (err) {
      next(err);
    }
  }
}
