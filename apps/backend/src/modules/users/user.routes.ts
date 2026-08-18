import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { updateUserProfileSchema } from './user.validation';

const router = Router();

router.use(authMiddleware as any);

router.get('/me', UserController.getMe as any);
router.put('/me', validationMiddleware(updateUserProfileSchema), UserController.updateMe as any);
router.get('/team', UserController.getTeam as any);

export default router;
