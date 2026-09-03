import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { WhatsAppAgentController } from './whatsapp-agent.controller';
import { WhatsAppSimulatorController } from './whatsapp-simulator.controller';

const router = Router();

// ── Webhook Routes (public — called by Meta) ─────────────────────────────────
router.get('/webhook/:automationId', WhatsAppAgentController.verifyWebhook as any);
router.post('/webhook/:automationId', WhatsAppAgentController.receiveMessage as any);

// ── Authenticated Routes ──────────────────────────────────────────────────────
router.use(authMiddleware as any);

// Simulator — test the agent without a real WhatsApp number
router.post('/simulate', WhatsAppSimulatorController.simulate as any);
router.post('/automations/quick-create', WhatsAppSimulatorController.quickCreate as any);

// Automation CRUD
router.post('/automations', WhatsAppAgentController.createAutomation as any);
router.get('/automations', WhatsAppAgentController.listAutomations as any);
router.get('/automations/:id', WhatsAppAgentController.getAutomation as any);
router.put('/automations/:id', WhatsAppAgentController.updateAutomation as any);
router.delete('/automations/:id', WhatsAppAgentController.deleteAutomation as any);

// Conversation Management
router.get('/conversations', WhatsAppAgentController.listConversations as any);
router.get('/conversations/:id/messages', WhatsAppAgentController.getConversationMessages as any);

// User Memory
router.get('/users/:externalUserId/memory', WhatsAppAgentController.getUserMemory as any);

export default router;
