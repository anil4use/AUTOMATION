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
    const log: any = await ExecutionLogModel.findOne({ _id: id, organizationId: orgId })
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
}
