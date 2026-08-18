import { ConnectionModel } from '@automation/database';

export class ConnectorRepository {
  static async findByOrg(orgId: string) {
    return await ConnectionModel.find({ organizationId: orgId }).select('-encryptedCredentials');
  }

  static async findById(id: string, orgId: string) {
    return await ConnectionModel.findOne({ _id: id, organizationId: orgId });
  }

  static async createConnection(data: any) {
    return await ConnectionModel.create(data);
  }

  static async updateConnection(id: string, orgId: string, data: any) {
    return await ConnectionModel.findOneAndUpdate({ _id: id, organizationId: orgId }, { $set: data }, { new: true });
  }

  static async deleteConnection(id: string, orgId: string) {
    return await ConnectionModel.deleteOne({ _id: id, organizationId: orgId });
  }
}
