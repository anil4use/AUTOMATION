import { Response, NextFunction } from 'express';
import { AIAgentService } from './ai-agent.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class AIAgentController {
  static async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await AIAgentService.generateWorkflow(req.body.prompt, req.user!.organizationId);
      return sendResponse(res, 200, true, data, 'Workflow generated from AI prompt');
    } catch (err) {
      next(err);
    }
  }
}
