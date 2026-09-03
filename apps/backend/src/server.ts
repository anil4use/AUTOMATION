import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import { WorkflowSchedulerService } from './services/workflow-scheduler.service';
import { startMemoryExtractionWorker } from './jobs/memory-extraction.job';
import { OAuthRefreshDaemon } from './jobs/oauth-refresh.job';
import { PollingSchedulerJob } from './jobs/polling-scheduler.job';

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

      // 5. Start OAuth2 Token Refresh Daemon (checks expiring tokens every 10 mins)
      OAuthRefreshDaemon.start(600000);

      // 6. Start Polling Trigger Worker (polls non-webhook triggers every 5 mins)
      PollingSchedulerJob.start(300000);

      // 7. Start Memory Extraction Worker (processes async memory extraction after conversations)
      try {
        startMemoryExtractionWorker();
      } catch (workerErr: any) {
        logger.warn(`[Server] Memory extraction worker setup deferred: ${workerErr?.message || workerErr}`);
      }
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
