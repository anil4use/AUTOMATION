import { Router } from 'express';
import { AIAgentController } from './ai-agent.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/chat-history', AIAgentController.getHistory as any);
router.delete('/chat-history', AIAgentController.clearHistory as any);
router.post('/chat', AIAgentController.chat as any);
router.post('/generate', AIAgentController.generate as any);
router.post('/copilot', AIAgentController.copilot as any);

export default router;
