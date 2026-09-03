import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import { WorkflowSchedulerService } from './services/workflow-scheduler.service';

async function bootstrap(retries = 3) {
  try {
    // 1. Connect to Database Infrastructure
    await connectDatabase();

    // 2. Instantiate Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Start Server
    server.listen(env.port, () => {
      logger.info(`🚀 [Modular Backend] Server running on port ${env.port} [${env.nodeEnv}]`);

      // 4. Start Background Workflow Cron Scheduler Engine (polls active workflows every 10s)
      WorkflowSchedulerService.start(10000);
    });
  } catch (error) {
    logger.error('Failed to start modular backend server:', error);
    if (retries > 0) {
      logger.info(`[Server] Retrying MongoDB connection in 2 seconds (${retries} attempts left)...`);
      setTimeout(() => bootstrap(retries - 1), 2000);
    } else {
      process.exit(1);
    }
  }
}

bootstrap();
