import { UserRepository } from './user.repository';
import { AppError } from '../../shared/errors/app.error';

export class UserService {
  static async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  static async getOrgTeam(orgId: string) {
    return await UserRepository.findByOrg(orgId);
  }

  static async updateProfile(userId: string, data: any) {
    return await UserRepository.update(userId, data);
  }
}
