import { Router } from 'express';
import { AIControlPlaneController } from './ai-control-plane.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Secure all control plane routes (add requireAdmin if available, for now just requireAuth)
router.use(authMiddleware);

// Providers & Models
router.get('/providers', AIControlPlaneController.listProviders);
router.post('/providers', AIControlPlaneController.createProvider);
router.post('/providers/sync', AIControlPlaneController.syncProviders);
router.put('/providers/:providerId', AIControlPlaneController.updateProvider);
router.delete('/providers/:providerId', AIControlPlaneController.deleteProvider);

router.get('/models', AIControlPlaneController.listModels);
router.post('/models', AIControlPlaneController.createModel);
router.put('/models/:id', AIControlPlaneController.updateModel);
router.delete('/models/:id', AIControlPlaneController.deleteModel);
router.get('/providers/:providerId/models', AIControlPlaneController.getModelsByProvider);

// Prompts
router.get('/prompts', AIControlPlaneController.listPrompts);
router.post('/prompts', AIControlPlaneController.createPromptVersion);
router.post('/test-prompt', AIControlPlaneController.testPrompt);
router.post('/generate-test-payload', AIControlPlaneController.generateTestPayload);
router.post('/format-response', AIControlPlaneController.formatResponse);
router.post('/save-to-vault', AIControlPlaneController.saveToVault);
router.post('/execute-plan', AIControlPlaneController.executePlan);
router.get('/prompts/history/:feature/:promptKey', AIControlPlaneController.getPromptHistory);
router.put('/prompts/activate/:id', AIControlPlaneController.activatePromptVersion);
router.get('/prompts/:id', AIControlPlaneController.getPrompt);
router.get('/prompts/:feature/:promptKey/active', AIControlPlaneController.getActivePromptVersions);

// Task Configs
router.get('/tasks', AIControlPlaneController.listTaskConfigs);
router.post('/tasks/simulate-route', AIControlPlaneController.simulateTaskRoute);
router.get('/tasks/:feature/:task', AIControlPlaneController.getTaskConfig);
router.put('/tasks/:feature/:task', AIControlPlaneController.updateTaskConfig);

// Logs
router.get('/logs', AIControlPlaneController.listExecutionLogs);

export const aiControlPlaneRoutes = router;
