import { UserModel, OrganizationModel } from '@automation/database';

export class AuthRepository {
  static async findByEmail(email: string) {
    return await UserModel.findOne({ email });
  }

  static async createUser(userData: any) {
    return await UserModel.create(userData);
  }

  static async createOrganization(orgData: any) {
    return await OrganizationModel.create(orgData);
  }
}
