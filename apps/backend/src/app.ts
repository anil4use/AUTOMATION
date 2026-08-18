import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { APP_CONSTANTS } from './config/constants';
import { errorMiddleware } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import workflowRoutes from './modules/workflows/workflow.routes';
import connectorRoutes from './modules/connectors/connector.routes';
import aiAgentRoutes from './modules/ai-agent/ai-agent.routes';
import executionRoutes from './modules/executions/execution.routes';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: APP_CONSTANTS.APP_NAME, timestamp: new Date().toISOString() });
  });

  // Feature Modules REST Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/v1/connectors', connectorRoutes);
  app.use('/api/v1/ai', aiAgentRoutes);
  app.use('/api/v1/executions', executionRoutes);

  // Global Error Handler Middleware
  app.use(errorMiddleware);

  return app;
}
