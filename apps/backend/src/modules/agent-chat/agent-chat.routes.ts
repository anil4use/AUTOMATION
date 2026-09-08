import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { AgentChatController } from './agent-chat.controller';

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// Message streaming
router.post('/message', AgentChatController.postMessageStream as any);
router.post('/confirm', AgentChatController.postConfirmAction as any);

// Conversation management
router.get('/conversations', AgentChatController.getConversations as any);
router.get('/conversations/:id', AgentChatController.getConversationById as any);
router.patch('/conversations/:id/title', AgentChatController.updateConversationTitle as any);
router.delete('/conversations/:id', AgentChatController.deleteConversation as any);

// Save as workflow
router.post('/convert-workflow', AgentChatController.convertPlanToWorkflow as any);

export default router;
