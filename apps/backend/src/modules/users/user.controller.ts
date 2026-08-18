import { Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class UserController {
  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getProfile(req.user!.userId);
      return sendResponse(res, 200, true, user);
    } catch (err) {
      next(err);
    }
  }

  static async getTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const team = await UserService.getOrgTeam(req.user!.organizationId);
      return sendResponse(res, 200, true, team);
    } catch (err) {
      next(err);
    }
  }

  static async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await UserService.updateProfile(req.user!.userId, req.body);
      return sendResponse(res, 200, true, user, 'Profile updated');
    } catch (err) {
      next(err);
    }
  }
}
