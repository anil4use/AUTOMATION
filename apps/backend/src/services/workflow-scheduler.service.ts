import { WorkflowModel, ExecutionLogModel } from '@automation/database';
import { DAGRunner } from '@automation/workflow-engine';
import { logger } from '../config/logger';

export class WorkflowSchedulerService {
  private static isRunning = false;
  private static timer: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 10000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`⏰ [WorkflowScheduler] Background Cron Engine started (polling every ${intervalMs / 1000}s)`);

    this.timer = setInterval(() => {
      this.checkAndExecuteScheduledWorkflows().catch((err) => {
        logger.error('[WorkflowScheduler] Cron check error:', err);
      });
    }, intervalMs);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    logger.info('⏰ [WorkflowScheduler] Background Cron Engine stopped.');
  }

  private static async checkAndExecuteScheduledWorkflows() {
    const activeWorkflows = await WorkflowModel.find({
      status: { $in: ['active', 'running'] },
    });

    if (!activeWorkflows || activeWorkflows.length === 0) return;

    const now = new Date();

    for (const workflow of activeWorkflows) {
      try {
        const nodes = workflow.definition?.nodes || [];
        if (!nodes.length) continue;

        const triggerNode = nodes.find((n: any) => n.type === 'trigger' || n.connectorId === 'autoflow-schedule') || nodes[0];
        const config = triggerNode?.data?.config || triggerNode?.config || {};

        const isDue = this.shouldExecute(workflow, config, now);
        if (isDue) {
          logger.info(`🚀 [WorkflowScheduler] Executing scheduled workflow "${workflow.name}" (ID: ${workflow._id})`);
          await this.executeWorkflow(workflow, now);
        }
      } catch (err: any) {
        logger.error(`[WorkflowScheduler] Failed executing workflow ${workflow._id}:`, err?.message || err);
      }
    }
  }

  private static shouldExecute(workflow: any, config: any, now: Date): boolean {
    const lastRun = workflow.lastExecutedAt ? new Date(workflow.lastExecutedAt).getTime() : 0;
    const nowTime = now.getTime();

    const frequency = config.frequency || (config.intervalMinutes ? 'interval' : config.intervalHours ? 'hourly' : 'interval');

    if (frequency === 'interval') {
      const intervalMins = parseInt(config.intervalMinutes) || 2;
      const intervalMs = intervalMins * 60 * 1000;
      return (nowTime - lastRun) >= intervalMs;
    }

    if (frequency === 'hourly') {
      const hours = parseInt(config.intervalHours) || 1;
      const intervalMs = hours * 60 * 60 * 1000;
      return (nowTime - lastRun) >= intervalMs;
    }

    if (frequency === 'daily') {
      const targetTimeStr = config.time || '09:00';
      const [hStr, mStr] = targetTimeStr.split(':');
      const targetHour = parseInt(hStr) || 9;
      const targetMin = parseInt(mStr) || 0;

      const todayTarget = new Date(now);
      todayTarget.setHours(targetHour, targetMin, 0, 0);

      const isTimeReached = nowTime >= todayTarget.getTime();
      const executedToday = lastRun > 0 && new Date(lastRun).toDateString() === now.toDateString();

      return isTimeReached && !executedToday;
    }

    if (frequency === 'weekly') {
      const dayOfWeekStr = (config.dayOfWeek || 'monday').toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIdx = days.indexOf(dayOfWeekStr);
      const isTodayTargetDay = now.getDay() === (targetDayIdx === -1 ? 1 : targetDayIdx);

      const targetTimeStr = config.time || '09:00';
      const [hStr, mStr] = targetTimeStr.split(':');
      const targetHour = parseInt(hStr) || 9;
      const targetMin = parseInt(mStr) || 0;

      const todayTarget = new Date(now);
      todayTarget.setHours(targetHour, targetMin, 0, 0);

      const isTimeReached = nowTime >= todayTarget.getTime();
      const executedToday = lastRun > 0 && new Date(lastRun).toDateString() === now.toDateString();

      return isTodayTargetDay && isTimeReached && !executedToday;
    }

    if (frequency === 'date' && config.targetDate) {
      const targetTime = new Date(config.targetDate).getTime();
      return nowTime >= targetTime && lastRun === 0;
    }

    return (nowTime - lastRun) >= 2 * 60 * 1000;
  }

  private static async executeWorkflow(workflow: any, now: Date) {
    const orgId = workflow.organizationId ? workflow.organizationId.toString() : undefined;
    const nodes = workflow.definition?.nodes || [];
    const edges = workflow.definition?.edges || [];

    const triggerPayload = {
      triggeredAt: now.toISOString(),
      runId: `run_${Date.now()}`,
      workflowName: workflow.name,
      workflowId: workflow._id.toString(),
    };

    let status: 'completed' | 'failed' = 'completed';
    let nodeResults: Record<string, any> = {};
    let errorMessage: string | undefined = undefined;

    try {
      nodeResults = await DAGRunner.run(nodes, edges, triggerPayload, undefined, {}, orgId);

      // Inspect node results for any step-level failures
      const failedStep = Object.values(nodeResults).find((res: any) => res && res.success === false);
      if (failedStep) {
        status = 'failed';
        errorMessage = failedStep.error || 'Step execution failed';
      }
    } catch (err: any) {
      status = 'failed';
      errorMessage = err?.message || 'Workflow execution error';
      logger.error(`[WorkflowScheduler] DAG execution error for "${workflow.name}":`, errorMessage);
    }

    // Always create Execution Log in MongoDB Atlas for both success & failed executions!
    const log = await ExecutionLogModel.create({
      workflowId: workflow._id,
      organizationId: workflow.organizationId,
      status,
      triggerPayload,
      nodeResults,
      error: errorMessage,
      startedAt: now,
      completedAt: new Date(),
    });

    // Always update workflow lastExecutedAt & increment executionCount in MongoDB Atlas!
    await WorkflowModel.updateOne(
      { _id: workflow._id },
      {
        $set: { lastExecutedAt: now },
        $inc: { executionCount: 1 },
      }
    );

    if (status === 'completed') {
      logger.info(`✅ [WorkflowScheduler] Saved COMPLETED execution log for "${workflow.name}" (Log ID: ${log._id})`);
    } else {
      logger.warn(`⚠️ [WorkflowScheduler] Saved FAILED execution log for "${workflow.name}" (Log ID: ${log._id}) — ${errorMessage}`);
    }
  }
}
