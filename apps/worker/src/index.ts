import { Worker } from 'bullmq';
import { workerConfig } from './config/redis.config';
import { connectDatabase } from '@automation/database';
import { processWorkflowJob } from './processors/workflow.processor';

async function startWorker() {
  try {
    await connectDatabase(workerConfig.mongoUri);

    const worker = new Worker('workflow-execution-queue', processWorkflowJob, {
      connection: workerConfig.redisUrl
        ? { url: workerConfig.redisUrl, keepAlive: 10000 }
        : {
            host: workerConfig.redisHost,
            port: workerConfig.redisPort,
            password: workerConfig.redisPassword || undefined,
            keepAlive: 10000,
          },
      concurrency: workerConfig.concurrency,
    });

    worker.on('ready', () => {
      console.log('⚡ [Worker Engine] BullMQ Worker process connected to Redis and listening for jobs...');
    });

    worker.on('completed', (job) => {
      console.log(`[Worker Engine] Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      console.error(`[Worker Engine] Job ${job?.id} failed with error:`, err);
    });

    worker.on('error', (err: any) => {
      if (err?.code === 'ECONNRESET' || err?.message?.includes('ECONNRESET')) return;
      console.error('[Worker Engine Error]:', err);
    });
  } catch (err) {
    console.error('Failed to start BullMQ worker:', err);
    process.exit(1);
  }
}

startWorker();
