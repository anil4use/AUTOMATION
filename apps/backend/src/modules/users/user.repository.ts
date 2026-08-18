import { UserModel } from '@automation/database';

export class UserRepository {
  static async findById(id: string) {
    return await UserModel.findById(id).select('-passwordHash');
  }

  static async findByOrg(orgId: string) {
    return await UserModel.find({ organizationId: orgId }).select('-passwordHash');
  }

  static async update(id: string, data: any) {
    return await UserModel.findByIdAndUpdate(id, { $set: data }, { new: true }).select('-passwordHash');
  }
}
