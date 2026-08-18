import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';

async function bootstrap() {
  try {
    // 1. Connect to Database Infrastructure
    await connectDatabase();

    // 2. Instantiate Express App & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 3. Start Server
    server.listen(env.port, () => {
      logger.info(`🚀 [Modular Backend] Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (error) {
    logger.error('Failed to start modular backend server:', error);
    process.exit(1);
  }
}

bootstrap();
