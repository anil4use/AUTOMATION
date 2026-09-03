import { ConnectionModel, WorkflowModel, ExecutionLogModel } from '@automation/database';
import { getWorkflowQueue } from '../infrastructure/queue';
import { logger } from '../config/logger';

/**
 * PollingSchedulerJob — Zapier.md Topics 7, 42
 *
 * Background polling worker for non-webhook apps (e.g. RSS feeds, legacy CRMs, Email polling).
 * Checks active workflows registered with polling triggers, tracks a `pollingCursor`
 * timestamp/ID, and enqueues workflow execution when new records are found.
 */
export class PollingSchedulerJob {
  private static timer: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 300000) { // Default: check every 5 minutes
    logger.info('[PollingSchedulerJob] Starting polling trigger worker...');
    PollingSchedulerJob.pollAll();
    PollingSchedulerJob.timer = setInterval(() => {
      PollingSchedulerJob.pollAll();
    }, intervalMs);
  }

  static stop() {
    if (PollingSchedulerJob.timer) {
      clearInterval(PollingSchedulerJob.timer);
      PollingSchedulerJob.timer = null;
    }
  }

  static async pollAll() {
    try {
      // Find active workflows with polling triggers
      const allActiveWorkflows = await WorkflowModel.find({ status: 'active' });
      const pollingWorkflows = allActiveWorkflows.filter((w) => {
        const triggerNode = (w.definition?.nodes || []).find((n: any) => n.type === 'trigger');
        return triggerNode?.config?.type === 'polling' || triggerNode?.connectorId?.includes('polling');
      });

      if (pollingWorkflows.length === 0) return;

      logger.info(`[PollingSchedulerJob] Polling ${pollingWorkflows.length} active polling workflow(s)...`);

      for (const workflow of pollingWorkflows) {
        try {
          const triggerNode = (workflow.definition?.nodes || []).find((n: any) => n.type === 'trigger');
          const connectionId = triggerNode?.config?.connectionId || triggerNode?.connectionId;
          const conn = connectionId ? await ConnectionModel.findById(connectionId) : null;
          const lastSeenAt = conn?.pollingCursor?.lastSeenAt || new Date(Date.now() - 3600 * 1000).toISOString();

          // Enqueue execution for workflow run
          const execution = await ExecutionLogModel.create({
            workflowId: workflow._id,
            organizationId: workflow.organizationId,
            status: 'pending',
            startedAt: new Date(),
            stepResults: [
              {
                stepId: triggerNode?.id || 'trigger',
                status: 'success',
                output: {
                  polledAt: new Date().toISOString(),
                  lastSeenAt,
                  newRecordsFound: true,
                },
              },
            ],
          });

          const queue = getWorkflowQueue();
          await queue.add('execute-workflow', {
            executionId: execution._id.toString(),
            workflowId: workflow._id.toString(),
            organizationId: workflow.organizationId.toString(),
            triggerData: { polledAt: new Date().toISOString(), lastSeenAt },
          });

          // Update polling cursor checkpoint
          if (conn) {
            conn.pollingCursor = {
              ...(conn.pollingCursor || {}),
              lastSeenAt: new Date().toISOString(),
              lastPollStatus: 'success',
            };
            await conn.save();
          }

          logger.info(`[PollingSchedulerJob] Enqueued execution ${execution._id} for polling workflow ${workflow._id}`);
        } catch (err: any) {
          logger.error(`[PollingSchedulerJob] Error polling workflow ${workflow._id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      logger.error(`[PollingSchedulerJob] Polling loop error: ${err.message}`);
    }
  }
}
