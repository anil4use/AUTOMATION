import { ExecutionLogModel } from '@automation/database';

export class ExecutionRepository {
  static async findByOrg(orgId: string, filter: any = {}) {
    const { status, ...queryFilter } = filter || {};
    const mongoQuery: any = { organizationId: orgId, ...queryFilter };
    if (status && status !== 'all') {
      mongoQuery.status = status;
    }

    const logs = await ExecutionLogModel.find(mongoQuery)
      .populate('workflowId', 'name description')
      .sort({ startedAt: -1 })
      .limit(50)
      .lean();

    return logs.map((log: any) => {
      const wfObj = typeof log.workflowId === 'object' && log.workflowId !== null ? log.workflowId : null;
      const wfName = wfObj?.name || log.triggerPayload?.workflowName || (typeof log.workflowId === 'string' ? log.workflowId : log.workflowId?._id?.toString());
      return {
        ...log,
        workflowId: wfObj?._id?.toString() || log.workflowId?.toString() || log.workflowId,
        workflowName: wfName || 'Automated Pipeline',
      };
    });
  }

  static async findById(id: string, orgId: string) {
    const log: any = await ExecutionLogModel.findOne({
      $or: [{ _id: id }, { executionId: id }],
      organizationId: orgId
    })
      .populate('workflowId', 'name description')
      .lean();
    if (!log) return null;
    const wfObj = typeof log.workflowId === 'object' && log.workflowId !== null ? log.workflowId : null;
    return {
      ...log,
      workflowId: wfObj?._id?.toString() || log.workflowId?.toString() || log.workflowId,
      workflowName: wfObj?.name || log.triggerPayload?.workflowName || 'Automated Pipeline',
    };
  }

  static async findStepLog(executionId: string, stepId: string, orgId: string) {
    const log: any = await this.findById(executionId, orgId);
    if (!log || !log.steps) return null;
    return log.steps.find((s: any) => s.stepId === stepId) || null;
  }

  static async getStats(orgId: string) {
    const totalExecutions = await ExecutionLogModel.countDocuments({ organizationId: orgId });
    const successfulExecutions = await ExecutionLogModel.countDocuments({ organizationId: orgId, status: 'COMPLETED' });
    const failedExecutions = await ExecutionLogModel.countDocuments({ organizationId: orgId, status: 'FAILED' });

    const recentLogs = await ExecutionLogModel.find({ organizationId: orgId })
      .sort({ startedAt: -1 })
      .limit(100)
      .lean();

    let totalDuration = 0;
    let aiInvocations = 0;
    let totalCoercions = 0;

    recentLogs.forEach((l: any) => {
      totalDuration += l.durationMs || 0;
      aiInvocations += l.metrics?.aiBridgeInvocations || 0;
      totalCoercions += l.metrics?.totalCoercionsCount || 0;
    });

    const avgDurationMs = recentLogs.length > 0 ? Math.round(totalDuration / recentLogs.length) : 0;
    const successRate = totalExecutions > 0 ? Number(((successfulExecutions / totalExecutions) * 100).toFixed(1)) : 100;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      avgDurationMs,
      aiInvocations,
      totalCoercions
    };
  }
}
