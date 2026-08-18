import { ExecutionLogModel } from '@automation/database';

export class ExecutionRepository {
  static async findByOrg(orgId: string, filter: any = {}) {
    return await ExecutionLogModel.find({ organizationId: orgId, ...filter })
      .sort({ startedAt: -1 })
      .limit(50);
  }

  static async findById(id: string, orgId: string) {
    return await ExecutionLogModel.findOne({ _id: id, organizationId: orgId });
  }
}
