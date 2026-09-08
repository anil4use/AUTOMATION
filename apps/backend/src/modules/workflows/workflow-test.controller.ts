import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';
import { AppError } from '../../shared/errors/app.error';
import { StepExecutor } from '@automation/workflow-engine';

/**
 * WorkflowTestController — Zapier.md Topics 23, 47
 *
 * Handles Test Trigger and Test Step execution in the visual builder canvas.
 * Allows users to sample data and validate steps before publishing.
 */
export class WorkflowTestController {
  /**
   * POST /api/v1/workflows/test-trigger
   * Fetch sample payload data from a trigger
   */
  static async testTrigger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { connectorId, triggerConfig } = req.body;

      const samplePayload = {
        sample: true,
        id: `sample_${Date.now()}`,
        email: 'test.user@example.com',
        name: 'Alex Johnson',
        amount: 250,
        currency: 'USD',
        createdAt: new Date().toISOString(),
        metadata: { source: 'sample_trigger_fetch' },
      };

      return sendResponse(res, 200, true, {
        connectorId: connectorId || 'trigger',
        samplePayload,
      }, 'Sample trigger data fetched successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/workflows/test-step
   * Execute a single step with sample / test context
   */
  static async testStep(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const orgId = req.user!.organizationId;
      const { node, previousNodeResults = {}, triggerPayload = {} } = req.body;

      if (!node || !node.connectorId) {
        throw new AppError('Valid node definition is required for test execution', 400);
      }

      const output = await StepExecutor.executeStep(
        node,
        previousNodeResults,
        triggerPayload,
        orgId
      );

      return sendResponse(res, 200, true, {
        nodeId: node.id,
        status: 'completed',
        output,
        executedAt: new Date().toISOString(),
      }, 'Test step executed successfully');
    } catch (err) {
      next(err);
    }
  }
}
