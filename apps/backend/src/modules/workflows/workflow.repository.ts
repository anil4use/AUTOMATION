import { WorkflowModel } from '@automation/database';

export class WorkflowRepository {
  static async create(data: any) {
    return await WorkflowModel.create(data);
  }

  static async findByOrg(orgId: string) {
    return await WorkflowModel.find({ organizationId: orgId }).sort({ updatedAt: -1 });
  }

  static async findById(id: string, orgId: string) {
    return await WorkflowModel.findOne({ _id: id, organizationId: orgId });
  }

  static async update(id: string, orgId: string, data: any) {
    return await WorkflowModel.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: data }, { new: true });
  }

  static async delete(id: string, orgId: string) {
    return await WorkflowModel.deleteOne({ _id: id, organizationId: orgId });
  }
}
