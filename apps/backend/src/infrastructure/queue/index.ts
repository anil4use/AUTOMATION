import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { APP_CONSTANTS } from '../../config/constants';
import { logger } from '../../config/logger';

const redisConnection = {
  host: env.redisHost,
  port: env.redisPort,
  password: env.redisPassword,
};

// ── Workflow Execution Queue ─────────────────────────────────────────────────

let workflowQueue: Queue | null = null;

export function getWorkflowQueue(): Queue {
  if (!workflowQueue) {
    workflowQueue = new Queue(APP_CONSTANTS.QUEUE_NAMES.WORKFLOW_EXECUTION, {
      connection: redisConnection,
    });
    logger.info('[Queue] Workflow execution queue initialized');
  }
  return workflowQueue;
}

// ── Memory Extraction Queue ──────────────────────────────────────────────────

let memoryExtractionQueue: Queue | null = null;

export function getMemoryExtractionQueue(): Queue {
  if (!memoryExtractionQueue) {
    memoryExtractionQueue = new Queue(APP_CONSTANTS.QUEUE_NAMES.MEMORY_EXTRACTION, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,                    // Retry up to 3 times on failure
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,          // Keep last 100 completed jobs for debugging
        removeOnFail: 50,
      },
    });
    logger.info('[Queue] Memory extraction queue initialized');
  }
  return memoryExtractionQueue;
}

