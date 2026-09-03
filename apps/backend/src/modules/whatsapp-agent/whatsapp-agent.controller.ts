import { Response, NextFunction } from 'express';
import { WebhookHandler } from './webhook.handler';
import { WhatsAppAutomationService } from './whatsapp-automation.service';
import { ConversationService } from './conversation.service';
import { UserMemoryService } from './user-memory.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/app.error';
import { logger } from '../../config/logger';
import {
  CreateWhatsAppAutomationDTO,
  UpdateWhatsAppAutomationDTO,
} from './whatsapp-agent.types';

export class WhatsAppAgentController {
  // ── Webhook Endpoints ──────────────────────────────────────────────────────

  /**
   * GET /api/v1/wa/webhook/:automationId
   * Meta webhook challenge verification — called once when registering the webhook URL.
   */
  static verifyWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const { automationId } = req.params;
    WebhookHandler.handleVerification(req as any, res, automationId);
  }

  /**
   * POST /api/v1/wa/webhook/:automationId
   * Receive incoming WhatsApp messages from Meta.
   * Always responds 200 immediately. Processing is async.
   */
  static async receiveMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { automationId } = req.params;

      // Always acknowledge Meta immediately (Meta retries if it doesn't get 200 quickly)
      sendResponse(res, 200, true, null, 'ok');

      // Process asynchronously — reply is sent directly to WhatsApp API, not back here
      WebhookHandler.handleIncomingMessage(automationId, req.body).catch((err) => {
        logger.error(`[WhatsAppAgentController] Webhook processing error: ${err.message}`);
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Automation CRUD ────────────────────────────────────────────────────────

  /**
   * POST /api/v1/wa/automations
   */
  static async createAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;
      const dto = req.body as CreateWhatsAppAutomationDTO;

      const automation = await WhatsAppAutomationService.create(orgId, userId, dto);
      return sendResponse(res, 201, true, automation, 'WhatsApp Automation created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/wa/automations
   */
  static async listAutomations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const automations = await WhatsAppAutomationService.listByOrg(orgId);
      return sendResponse(res, 200, true, automations);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/wa/automations/:id
   */
  static async getAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const automation = await WhatsAppAutomationService.getById(req.params.id, orgId);
      return sendResponse(res, 200, true, automation);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/v1/wa/automations/:id
   */
  static async updateAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const dto = req.body as UpdateWhatsAppAutomationDTO;
      const updated = await WhatsAppAutomationService.update(req.params.id, orgId, dto);
      return sendResponse(res, 200, true, updated, 'Automation updated');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/wa/automations/:id
   */
  static async deleteAutomation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      await WhatsAppAutomationService.delete(req.params.id, orgId);
      return sendResponse(res, 200, true, null, 'WhatsApp Automation deleted');
    } catch (err) {
      next(err);
    }
  }

  // ── Conversations ──────────────────────────────────────────────────────────

  /**
   * GET /api/v1/wa/conversations
   * Supports ?automationId=xxx, ?page=1, ?pageSize=20
   */
  static async listConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const { automationId } = req.query as { automationId?: string };
      const page = parseInt((req.query.page as string) || '1', 10);
      const pageSize = parseInt((req.query.pageSize as string) || '20', 10);

      const result = await ConversationService.listConversations(orgId, automationId, page, pageSize);
      return sendResponse(res, 200, true, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/wa/conversations/:id/messages
   */
  static async getConversationMessages(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const orgId = req.user!.organizationId;
      const page = parseInt((req.query.page as string) || '1', 10);
      const result = await ConversationService.getMessages(req.params.id, orgId, page);
      return sendResponse(res, 200, true, result);
    } catch (err) {
      next(err);
    }
  }

  // ── User Memory ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/wa/users/:externalUserId/memory?automationId=xxx
   */
  static async getUserMemory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const { externalUserId } = req.params;
      const { automationId } = req.query as { automationId?: string };

      if (!automationId) {
        throw new AppError('automationId query parameter is required', 400);
      }

      const memory = await UserMemoryService.getUserMemory(
        orgId,
        automationId,
        externalUserId,
        'whatsapp'
      );

      return sendResponse(res, 200, true, memory);
    } catch (err) {
      next(err);
    }
  }
}
