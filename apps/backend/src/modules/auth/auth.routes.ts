import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validationMiddleware } from '../../middleware/validation.middleware';
import { registerSchema, loginSchema } from './auth.validation';

const router = Router();

router.get('/google/url', AuthController.getGoogleUrl);
router.post('/google/callback', AuthController.handleGoogleCallback);
router.post('/google', AuthController.googleAuth);
router.post('/register', validationMiddleware(registerSchema), AuthController.register);
router.post('/login', validationMiddleware(loginSchema), AuthController.login);

export default router;
