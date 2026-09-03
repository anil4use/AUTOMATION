import { Router } from 'express';
import { WebhookGatewayController } from './webhook-gateway.controller';

const router = Router();

// Universal Catch Webhook Endpoints (Public — called by external apps like Stripe, GitHub, Shopify, Custom Forms)
// No JWT auth required. Security handled via webhookId lookup and signature verification if configured.

/** POST /api/v1/webhooks/catch/:webhookId — Universal POST webhook catch */
router.post('/catch/:webhookId', WebhookGatewayController.catchWebhook as any);

/** GET /api/v1/webhooks/catch/:webhookId — Universal GET webhook catch */
router.get('/catch/:webhookId', WebhookGatewayController.catchWebhook as any);

/** PUT /api/v1/webhooks/catch/:webhookId — Universal PUT webhook catch */
router.put('/catch/:webhookId', WebhookGatewayController.catchWebhook as any);

export default router;
