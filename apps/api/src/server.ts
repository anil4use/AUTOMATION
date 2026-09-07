import { app } from './app';
import { createLogger } from '@automation/observability';

const logger = createLogger('ServerBootstrap');
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`AutoFlow API Gateway running on port ${PORT}`);
});
