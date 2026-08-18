import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.post('/webhook', BillingController.handleWebhook as any);

router.use(authMiddleware as any);
router.get('/usage', BillingController.getUsage as any);
router.post('/checkout', BillingController.createCheckout as any);

export default router;
