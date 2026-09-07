import { createLogger } from '@automation/observability';

const logger = createLogger('SchedulerDaemon');

logger.info('AutoFlow Dedicated Polling, Cron & Token Renewal Scheduler Started');
setInterval(() => {
  logger.info('Running polling & token renewal daemon loop...');
}, 300000); // 5 mins
