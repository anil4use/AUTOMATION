import { DAGRunner } from '@automation/workflow-engine';
import { eventBus } from '@automation/events';
import { createLogger } from '@automation/observability';

const logger = createLogger('ExecuteWorkflowUseCase');

export class ExecuteWorkflowUseCase {
  static async execute(params: {
    workflowId: string;
    organizationId: string;
    nodes: any[];
    edges: any[];
    triggerPayload?: Record<string, any>;
  }) {
    logger.info(`Starting execution for workflow ${params.workflowId}`);
    const executionId = `exec_${Date.now()}`;

    await eventBus.publish('ExecutionStarted', { executionId, workflowId: params.workflowId });

    try {
      const stepResults = await DAGRunner.run(
        params.nodes,
        params.edges,
        params.triggerPayload || {},
        undefined,
        {},
        params.organizationId
      );

      await eventBus.publish('ExecutionCompleted', { executionId, workflowId: params.workflowId });
      return { executionId, status: 'completed', stepResults };
    } catch (err: any) {
      logger.error(`Execution failed for workflow ${params.workflowId}`, err);
      await eventBus.publish('ExecutionFailed', { executionId, workflowId: params.workflowId, error: err.message });
      throw err;
    }
  }
}
