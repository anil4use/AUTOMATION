import { Router } from 'express';
import { ExecutionController } from './execution.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/stats', ExecutionController.getStats as any);
router.get('/', ExecutionController.listLogs as any);
router.get('/:id', ExecutionController.getLogById as any);
router.get('/:id/steps/:stepId', ExecutionController.getStepLog as any);
router.get('/:id/stream', ExecutionController.streamLiveLogs as any);

export default router;
