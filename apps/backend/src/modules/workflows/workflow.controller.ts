import { Response, NextFunction } from 'express';
import { WorkflowService } from './workflow.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { dispatchWorkflowJob } from '../../jobs/workflow-execution.job';

export class WorkflowController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await WorkflowService.getWorkflows(req.user!.organizationId);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await WorkflowService.createWorkflow(req.user!.organizationId, req.user!.userId, req.body);
      return sendResponse(res, 201, true, data, 'Workflow created');
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await WorkflowService.getWorkflowById(req.params.id, req.user!.organizationId);
      return sendResponse(res, 200, true, data);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await WorkflowService.updateWorkflow(req.params.id, req.user!.organizationId, req.body);
      return sendResponse(res, 200, true, data, 'Workflow updated');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await WorkflowService.deleteWorkflow(req.params.id, req.user!.organizationId);
      return sendResponse(res, 200, true, null, 'Workflow deleted');
    } catch (err) {
      next(err);
    }
  }

  static async run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const job = await dispatchWorkflowJob(req.params.id, req.user!.organizationId, req.body.payload || {});
      return sendResponse(res, 200, true, { jobId: job.id }, 'Workflow execution enqueued');
    } catch (err) {
      next(err);
    }
  }
}
