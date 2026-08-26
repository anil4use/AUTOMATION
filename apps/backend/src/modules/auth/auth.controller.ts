import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendResponse } from '../../shared/utils/response';

export class AuthController {
  static async getGoogleUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const data = AuthService.getGoogleAuthUrl();
      return sendResponse(res, 200, true, data, 'Google OAuth Authorization URL');
    } catch (err) {
      next(err);
    }
  }

  static async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const data = await AuthService.handleGoogleCodeExchange(code);
      return sendResponse(res, 200, true, data, 'Google OAuth Code Exchange Successful');
    } catch (err) {
      next(err);
    }
  }

  static async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.googleAuth(req.body);
      return sendResponse(res, 200, true, data, 'Google Authentication Successful');
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.register(req.body);
      return sendResponse(res, 201, true, data, 'User registered successfully');
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.login(req.body);
      return sendResponse(res, 200, true, data, 'Login successful');
    } catch (err) {
      next(err);
    }
  }
}
