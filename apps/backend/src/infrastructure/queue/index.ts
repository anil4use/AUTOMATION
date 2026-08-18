import { Queue } from 'bullmq';
import { env } from '../../config/env';
import { APP_CONSTANTS } from '../../config/constants';
import { logger } from '../../config/logger';

let queue: Queue | null = null;

export function getWorkflowQueue(): Queue {
  if (!queue) {
    queue = new Queue(APP_CONSTANTS.QUEUE_NAMES.WORKFLOW_EXECUTION, {
      connection: {
        host: env.redisHost,
        port: env.redisPort,
        password: env.redisPassword,
      },
    });
    logger.info('[Queue Infrastructure] BullMQ queue initialized');
  }
  return queue;
}
