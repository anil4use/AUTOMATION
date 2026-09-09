import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ConversationService } from '../modules/whatsapp-agent/conversation.service';
import { MemoryExtractionService } from '../modules/whatsapp-agent/memory-extraction.service';
import { MemoryExtractionJobPayload } from '../modules/whatsapp-agent/whatsapp-agent.types';
import { APP_CONSTANTS } from '../config/constants';

/**
 * Memory Extraction BullMQ Worker
 *
 * Processes async memory extraction jobs queued after conversation turns.
 * Runs in the background so it doesn't slow down the real-time webhook response.
 *
 * To start this worker standalone: import and call startMemoryExtractionWorker()
 * It can run in the same process as the backend or in the separate worker app.
 */
export function startMemoryExtractionWorker(): Worker {
  const worker = new Worker<MemoryExtractionJobPayload>(
    APP_CONSTANTS.QUEUE_NAMES.MEMORY_EXTRACTION,
    async (job: Job<MemoryExtractionJobPayload>) => {
      const { automationId, organizationId, externalUserId, channel, conversationId, agentModel } =
        job.data;

      logger.info(
        `[MemoryExtractionWorker] Processing job ${job.id} for user ${externalUserId} in conversation ${conversationId}`
      );

      // Get recent conversation history for extraction
      // We look at the last 10 exchanges (20 messages) for memory analysis
      const history = await ConversationService.getHistory(conversationId, 20);

      if (history.length === 0) {
        logger.info(`[MemoryExtractionWorker] No messages found for conversation ${conversationId}, skipping`);
        return { extracted: 0 };
      }

      // Map 'agent' role to match MemoryExtractionService expectations
      const historyForExtraction = history.map((m) => ({
        role: m.role as 'user' | 'agent',
        content: m.content,
      }));

      const extracted = await MemoryExtractionService.extractAndPersist(
        organizationId,
        automationId,
        externalUserId,
        channel,
        historyForExtraction,
        agentModel
      );

      logger.info(
        `[MemoryExtractionWorker] Extracted ${extracted.length} facts for user ${externalUserId}`
      );

      return { extracted: extracted.length, facts: extracted };
    },
    {
      connection: env.redisUrl
        ? { url: env.redisUrl, keepAlive: 10000 }
        : {
            host: env.redisHost,
            port: env.redisPort,
            password: env.redisPassword || undefined,
            keepAlive: 10000,
          },
      concurrency: 5, // Process up to 5 extraction jobs in parallel
    }
  );

  let lastErrorLog = 0;
  worker.on('completed', (job) => {
    logger.info(`[MemoryExtractionWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[MemoryExtractionWorker] Job ${job?.id} failed: ${err?.message || err}`);
  });

  worker.on('error', (err: any) => {
    const msg = err?.message || (typeof err === 'string' ? err : '');
    // Ignore transient cloud socket idle resets
    if (err?.code === 'ECONNRESET' || msg.includes('ECONNRESET')) return;

    const now = Date.now();
    // Throttle error logging to once every 30 seconds if Redis is not running locally
    if (now - lastErrorLog > 30000) {
      lastErrorLog = now;
      logger.warn(`[MemoryExtractionWorker] Redis connection status: ${msg}. (Note: Start Redis if async background queues are required)`);
    }
  });

  logger.info('[MemoryExtractionWorker] Memory extraction worker started');
  return worker;
}
