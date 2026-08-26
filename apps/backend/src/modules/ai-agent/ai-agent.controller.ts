import { Response, NextFunction } from 'express';
import { AIAgentService } from './ai-agent.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class AIAgentController {
  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const messages = await AIAgentService.getChatHistory(req.user!.organizationId, req.user!.userId);
      return sendResponse(res, 200, true, messages, 'Chat history loaded from MongoDB Atlas');
    } catch (err) {
      next(err);
    }
  }

  static async clearHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await AIAgentService.clearChatHistory(req.user!.organizationId, req.user!.userId);
      return sendResponse(res, 200, true, null, 'Chat history cleared from MongoDB Atlas');
    } catch (err) {
      next(err);
    }
  }

  static async chat(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const messages = req.body.messages || [{ role: 'user', content: req.body.prompt || '' }];
      const data = await AIAgentService.processChat(messages, req.user!.organizationId, req.user!.userId);
      return sendResponse(res, 200, true, data, 'AI chat response generated and saved to MongoDB Atlas');
    } catch (err) {
      next(err);
    }
  }

  static async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const messages = [{ role: 'user' as const, content: req.body.prompt || '' }];
      const data = await AIAgentService.processChat(messages, req.user!.organizationId, req.user!.userId);
      return sendResponse(res, 200, true, data, 'Workflow generated from AI prompt');
    } catch (err) {
      next(err);
    }
  }

  static async copilot(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { nodes, edges, prompt, userPrompt } = req.body;
      const data = await AIAgentService.processCopilotChat(
        nodes || [],
        edges || [],
        userPrompt || prompt || '',
        req.user!.organizationId,
        req.user!.userId
      );
      return sendResponse(res, 200, true, data, 'Canvas mutated dynamically by AI Co-Pilot Assistant');
    } catch (err) {
      next(err);
    }
  }
}
