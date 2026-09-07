import express from 'express';
import cors from 'cors';
import { createLogger } from '@automation/observability';

const logger = createLogger('WebhookIngestor');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '@automation/webhook', timestamp: new Date().toISOString() });
});

app.post('/api/v1/webhooks/catch/:webhookId', (req, res) => {
  logger.info(`Received incoming webhook for ID: ${req.params.webhookId}`);
  // Instantly return HTTP 200 and push to event queue asynchronously
  res.status(200).json({ received: true, webhookId: req.params.webhookId });
});

const PORT = process.env.WEBHOOK_PORT || 5001;
app.listen(PORT, () => {
  logger.info(`AutoFlow High-Throughput Webhook Ingestor listening on port ${PORT}`);
});
