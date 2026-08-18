import { Response, NextFunction } from 'express';
import { ExecutionService } from './execution.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class ExecutionController {
  static async listLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ExecutionService.getLogs(req.user!.organizationId, req.query);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async getLogById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ExecutionService.getLogById(req.params.id, req.user!.organizationId);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }
}
