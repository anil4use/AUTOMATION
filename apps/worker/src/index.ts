import { Worker } from 'bullmq';
import { workerConfig } from './config/redis.config';
import { connectDatabase } from '@automation/database';
import { processWorkflowJob } from './processors/workflow.processor';

async function startWorker() {
  try {
    await connectDatabase(workerConfig.mongoUri);

    const worker = new Worker('workflow-execution-queue', processWorkflowJob, {
      connection: {
        host: workerConfig.redisHost,
        port: workerConfig.redisPort,
        password: workerConfig.redisPassword,
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
  } catch (err) {
    console.error('Failed to start BullMQ worker:', err);
    process.exit(1);
  }
}

startWorker();
