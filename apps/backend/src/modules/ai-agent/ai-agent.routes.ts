import { Router } from 'express';
import { AIAgentController } from './ai-agent.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { generateWorkflowSchema } from './ai-agent.validation';

const router = Router();

router.use(authMiddleware as any);

router.post('/generate', validationMiddleware(generateWorkflowSchema), AIAgentController.generate as any);

export default router;
