import { Response, NextFunction } from 'express';
import { WorkflowService } from './workflow.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { WorkflowModel, ExecutionLogModel } from '@automation/database';
import { StepExecutor, DAGRunner } from '@automation/connector-sdk';
import { AppError } from '../../shared/errors/app.error';

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
      const data = await WorkflowService.updateWorkflow(req.params.id, req.user!.organizationId, req.user!.userId, req.body);
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

  static async testStep(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId, operationId, actionId, configValues, config, fieldMapping, previousResults, triggerPayload } = req.body;
      const orgId = req.user!.organizationId;

      const node: any = {
        id: 'test_node',
        connectorId,
        operationId: operationId || actionId || 'execute',
        config: configValues || config || {},
        fieldMapping: fieldMapping || {},
      };

      const outputData = await StepExecutor.executeStep(
        node,
        previousResults || {},
        triggerPayload || { triggeredAt: new Date().toISOString() },
        orgId
      );

      return sendResponse(res, 200, true, {
        status: 'success',
        connectorId,
        operationId: node.operationId,
        outputData,
        executedAt: new Date().toISOString(),
      }, `Step executed live via real ${connectorId} API.`);
    } catch (err: any) {
      return sendResponse(res, 400, false, null, err.message || 'Step execution failed.');
    }
  }

  static async run(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const workflowId = req.params.id;
      const orgId = req.user!.organizationId;
      const triggerPayload = req.body.triggerPayload || req.body.payload || {};

      let workflow: any = null;
      if (workflowId && workflowId !== 'new' && workflowId !== 'draft') {
        try {
          workflow = await WorkflowModel.findById(workflowId);
        } catch {}
      }

      const nodes = workflow?.definition?.nodes || req.body.definition?.nodes || req.body.nodes || [];
      const edges = workflow?.definition?.edges || req.body.definition?.edges || req.body.edges || [];

      if (!nodes.length) {
        throw new AppError('Workflow has no steps/nodes configured', 400);
      }

      // Execute live DAG engine and log step execution outputs to MongoDB
      const nodeResults = await DAGRunner.run(nodes, edges, triggerPayload, undefined, {}, orgId);

      const log = await ExecutionLogModel.create({
        workflowId: workflowId === 'new' ? undefined : workflowId,
        organizationId: orgId,
        status: 'completed',
        triggerPayload,
        nodeResults,
        startedAt: new Date(),
        completedAt: new Date(),
      });

      return sendResponse(res, 200, true, {
        executionId: log._id,
        status: 'completed',
        nodeResults,
      }, 'Workflow executed live successfully');
    } catch (err: any) {
      next(err);
    }
  }
}
