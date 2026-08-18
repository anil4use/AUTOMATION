import { Router } from 'express';
import { ExecutionController } from './execution.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/', ExecutionController.listLogs as any);
router.get('/:id', ExecutionController.getLogById as any);

export default router;
