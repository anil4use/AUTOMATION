import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { AgentChatService } from './agent-chat.service';
import { randomUUID } from 'crypto';

export class AgentChatController {

  /** POST /api/v1/agent-chat/message — SSE streaming endpoint */
  static async postMessageStream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, conversationId } = req.body;
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;

      if (!message || !message.trim()) {
        return sendResponse(res, 400, false, null, 'Message is required');
      }

      const convId = conversationId || randomUUID();

      // Rate limiting & concurrency check
      const rateCheck = await AgentChatService.checkRateLimits(userId);
      if (!rateCheck.allowed) {
        if (rateCheck.reason === 'EXECUTION_IN_PROGRESS') {
          return res.status(429).json({
            success: false,
            error: 'EXECUTION_IN_PROGRESS',
            message: 'An operation is already running. Please wait for it to finish.',
          });
        }
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMITED',
          message: 'Too many requests. Maximum 10 messages per minute.',
        });
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Conversation-Id', convId);
      res.flushHeaders();

      const emitSSE = (event: any) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Handle client disconnect
      req.on('close', () => {
        // Execution continues on backend; results persisted to DB
      });

      await AgentChatService.setExecutionLock(userId, true);
      try {
        await AgentChatService.processMessage(message.trim(), convId, orgId, userId, emitSSE);
      } finally {
        await AgentChatService.setExecutionLock(userId, false);
      }

      res.end();
    } catch (err: any) {
      if (res.headersSent) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'final_response', message: `An unexpected execution error occurred: ${err?.message || 'Server error'}. Please try again.` })}\n\n`);
          res.end();
        } catch {
          res.end();
        }
      } else {
        next(err);
      }
    }
  }

  /** POST /api/v1/agent-chat/confirm — Destructive action confirmation */
  static async postConfirmAction(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { conversationId, confirmationId, confirmed } = req.body;
      const orgId = req.user!.organizationId;
      const userId = req.user!.userId;

      if (!conversationId || !confirmationId) {
        return sendResponse(res, 400, false, null, 'conversationId and confirmationId are required');
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const emitSSE = (event: any) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      await AgentChatService.setExecutionLock(userId, true);
      try {
        await AgentChatService.confirmExecution(conversationId, confirmationId, !!confirmed, orgId, userId, emitSSE);
      } finally {
        await AgentChatService.setExecutionLock(userId, false);
      }

      res.end();
    } catch (err: any) {
      if (res.headersSent) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'final_response', message: `An unexpected confirmation error occurred: ${err?.message || 'Server error'}.` })}\n\n`);
          res.end();
        } catch {
          res.end();
        }
      } else {
        next(err);
      }
    }
  }

  /** GET /api/v1/agent-chat/conversations — List all conversations */
  static async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversations = await AgentChatService.getConversations(req.user!.organizationId, req.user!.userId);
      return sendResponse(res, 200, true, conversations, 'Conversations retrieved');
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/v1/agent-chat/conversations/:id — Single conversation */
  static async getConversationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversation = await AgentChatService.getConversation(req.params.id, req.user!.organizationId);
      if (!conversation) return sendResponse(res, 404, false, null, 'Conversation not found');
      return sendResponse(res, 200, true, conversation, 'Conversation retrieved');
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /api/v1/agent-chat/conversations/:id/title — Rename conversation title */
  static async updateConversationTitle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { title } = req.body;
      if (!title || !title.trim()) return sendResponse(res, 400, false, null, 'Title is required');
      const updated = await AgentChatService.updateConversationTitle(req.params.id, title, req.user!.organizationId);
      return sendResponse(res, 200, true, updated, 'Conversation title updated');
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /api/v1/agent-chat/conversations/:id — Delete conversation */
  static async deleteConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await AgentChatService.deleteConversation(req.params.id, req.user!.organizationId);
      return sendResponse(res, 200, true, null, 'Conversation deleted');
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/v1/agent-chat/convert-workflow — Convert chat plan to workflow */
  static async convertPlanToWorkflow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { conversationId, messageId, triggerType } = req.body;
      if (!conversationId || !messageId || !triggerType) {
        return sendResponse(res, 400, false, null, 'conversationId, messageId, and triggerType are required');
      }
      const result = await AgentChatService.convertPlanToWorkflow(
        conversationId, messageId, triggerType, req.user!.organizationId, req.user!.userId
      );
      return sendResponse(res, 201, true, result, 'Workflow draft created from agent chat');
    } catch (err) {
      next(err);
    }
  }
}
