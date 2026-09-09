import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import { WorkflowSchedulerService } from './services/workflow-scheduler.service';
import { startMemoryExtractionWorker } from './jobs/memory-extraction.job';
import { OAuthRefreshDaemon } from './jobs/oauth-refresh.job';
import { PollingSchedulerJob } from './jobs/polling-scheduler.job';
import { WebhookRenewalDaemon } from './jobs/webhook-renewal.job';
import { TelegramPollingDaemon } from './jobs/telegram-polling.job';

import { browserToolService } from './services/browser-tool.service';

async function bootstrap(retries = 3) {
  try {
    // 1. Connect to Database Infrastructure
    await connectDatabase();

    // 2. Instantiate Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Handle Port Conflicts & Automatic Re-bind Retry
    let portRetryCount = 0;
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        portRetryCount++;
        if (portRetryCount <= 3) {
          logger.warn(`⚠️ [Server] Port ${env.port} is currently in use. Retrying bind (${portRetryCount}/3) in 1.5 seconds...`);
          setTimeout(() => {
            try {
              server.close();
            } catch {}
            server.listen(env.port);
          }, 1500);
        } else {
          logger.error(`❌ [Server] Port ${env.port} is occupied by an external process. To free it, run: taskkill /F /PID <pid>`);
          process.exit(1);
        }
      } else {
        logger.error('[Server] HTTP server error:', err);
      }
    });

    // 4. Start Server
    server.listen(env.port, () => {
      logger.info(`🚀 [Modular Backend] Server running on port ${env.port} [${env.nodeEnv}]`);

      // Warm up Playwright MCP headless browser service (non-blocking)
      browserToolService.warmup().catch((e) => logger.warn('[Server] Browser warmup notice:', e.message));

      // 5. Start Background Workflow Cron Scheduler Engine (polls active workflows every 10s)
      WorkflowSchedulerService.start(10000);

      // 6. Start OAuth2 Token Refresh Daemon (checks expiring tokens every 10 mins)
      OAuthRefreshDaemon.start(600000);

      // 7. Start Polling Trigger Worker (polls non-webhook triggers every 5 mins)
      PollingSchedulerJob.start(300000);

      // 8. Start Webhook Renewal Daemon (renews Jira/Drive webhooks every 6 hours) (Patch 4)
      WebhookRenewalDaemon.start(21600000);

      // 9. Start Telegram Bot Polling Daemon (polls Telegram messages every 3s)
      TelegramPollingDaemon.start(3000);

      // 9. Start Memory Extraction Worker (processes async memory extraction after conversations)
      try {
        startMemoryExtractionWorker();
      } catch (workerErr: any) {
        logger.warn(`[Server] Memory extraction worker setup deferred: ${workerErr?.message || workerErr}`);
      }
    });

    // Clean shutdown handlers
    const shutdown = async () => {
      TelegramPollingDaemon.stop();
      OAuthRefreshDaemon.stop();
      WorkflowSchedulerService.stop();
      await browserToolService.closeAllSessions().catch(() => {});
      server.close();
    };

    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
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
