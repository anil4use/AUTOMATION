import express from 'express';
import cors from 'cors';
import { env } from './config/env';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import workflowRoutes from './modules/workflows/workflow.routes';
import connectorRoutes from './modules/connectors/connector.routes';
import aiAgentRoutes from './modules/ai-agent/ai-agent.routes';
import executionRoutes from './modules/executions/execution.routes';
import billingRoutes from './modules/billing/billing.routes';

import { errorMiddleware } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/workflows', workflowRoutes);
  app.use('/api/v1/connectors', connectorRoutes);
  app.use('/api/v1/ai-agent', aiAgentRoutes);
  app.use('/api/v1/executions', executionRoutes);
  app.use('/api/v1/billing', billingRoutes);

  app.use(errorMiddleware as any);

  return app;
}

export const app = createApp();
