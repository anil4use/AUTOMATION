import { Router } from 'express';
import { WorkflowController } from './workflow.controller';
import { WorkflowTestController } from './workflow-test.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/', WorkflowController.list as any);
router.post('/test-trigger', WorkflowTestController.testTrigger as any);
router.post('/test-step', WorkflowTestController.testStep as any);
router.post('/', WorkflowController.create as any);
router.get('/:id', WorkflowController.getById as any);
router.put('/:id', WorkflowController.update as any);
router.delete('/:id', WorkflowController.delete as any);
router.post('/:id/run', WorkflowController.run as any);
router.post('/:id/execute', WorkflowController.run as any);

export default router;
