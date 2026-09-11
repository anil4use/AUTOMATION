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

  static async getStepLog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ExecutionService.getStepLog(req.params.id, req.params.stepId, req.user!.organizationId);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ExecutionService.getStats(req.user!.organizationId);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async streamLiveLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      res.write(`data: ${JSON.stringify({ type: 'connected', executionId: req.params.id })}\n\n`);

      const timer = setInterval(async () => {
        const log = await ExecutionService.getLogById(req.params.id, req.user!.organizationId);
        res.write(`data: ${JSON.stringify({ type: 'update', log })}\n\n`);
        if (log.status === 'COMPLETED' || log.status === 'FAILED') {
          clearInterval(timer);
          res.write(`data: ${JSON.stringify({ type: 'complete', status: log.status })}\n\n`);
          res.end();
        }
      }, 1000);

      req.on('close', () => {
        clearInterval(timer);
      });
    } catch (err) {
      next(err);
    }
  }
}
