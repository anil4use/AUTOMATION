import { Router } from 'express';
import { WorkflowController } from './workflow.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { createWorkflowSchema, updateWorkflowSchema } from './workflow.validation';

const router = Router();

router.use(authMiddleware as any);

router.get('/', WorkflowController.list as any);
router.post('/', validationMiddleware(createWorkflowSchema), WorkflowController.create as any);
router.get('/:id', WorkflowController.getById as any);
router.put('/:id', validationMiddleware(updateWorkflowSchema), WorkflowController.update as any);
router.delete('/:id', WorkflowController.delete as any);
router.post('/:id/run', WorkflowController.run as any);

export default router;
