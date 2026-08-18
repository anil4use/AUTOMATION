import { Response, NextFunction } from 'express';
import { BillingService } from './billing.service';
import { AuthenticatedRequest } from '../../shared/types/common.types';
import { sendResponse } from '../../shared/utils/response';

export class BillingController {
  static async getUsage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const usage = await BillingService.getOrgUsage(req.user!.organizationId);
      return sendResponse(res, 200, true, usage);
    } catch (err) {
      next(err);
    }
  }

  static async createCheckout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { plan } = req.body;
      const session = await BillingService.createCheckoutSession(req.user!.organizationId, plan || 'pro');
      return sendResponse(res, 200, true, session);
    } catch (err) {
      next(err);
    }
  }

  static async handleWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await BillingService.handleWebhook(req.body);
      return sendResponse(res, 200, true, result);
    } catch (err) {
      next(err);
    }
  }
}
