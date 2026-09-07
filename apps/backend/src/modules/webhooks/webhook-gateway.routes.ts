import { Router } from 'express';
import { WebhookGatewayController } from './webhook-gateway.controller';
import { TelegramWebhookController } from './telegram-webhook.controller';

const router = Router();

// Universal Catch Webhook Endpoints
// Meta WhatsApp verification GET handler MUST be registered BEFORE general GET catch (Patch 7)
router.get('/catch/:webhookId', WebhookGatewayController.verifyWhatsAppWebhook as any, WebhookGatewayController.catchWebhook as any);

/** POST /api/v1/webhooks/catch/:webhookId — Universal POST catch */
router.post('/catch/:webhookId', WebhookGatewayController.catchWebhook as any);

/** PUT /api/v1/webhooks/catch/:webhookId — Universal PUT catch */
router.put('/catch/:webhookId', WebhookGatewayController.catchWebhook as any);

/** POST /api/v1/webhooks/telegram/:botId — Telegram Bot Inbound Webhook */
router.post('/telegram/:botId', TelegramWebhookController.handleTelegramWebhook as any);

export default router;
