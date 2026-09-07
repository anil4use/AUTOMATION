import express from 'express';
import cors from 'cors';
import { CreateWorkflowUseCase, PublishWorkflowUseCase, ExecuteWorkflowUseCase } from '@automation/application';
import { createLogger } from '@automation/observability';

const logger = createLogger('API Gateway');
export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '@automation/api', timestamp: new Date().toISOString() });
});

app.post('/api/v1/workflows', async (req, res) => {
  try {
    const workflow = await CreateWorkflowUseCase.execute({
      organizationId: req.body.organizationId || 'org_123',
      creatorId: req.body.creatorId || 'usr_123',
      name: req.body.name || 'Untitled Workflow',
      description: req.body.description,
    });
    res.json({ success: true, workflow });
  } catch (err: any) {
    logger.error('Failed to create workflow', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/workflows/:id/execute', async (req, res) => {
  try {
    const result = await ExecuteWorkflowUseCase.execute({
      workflowId: req.params.id,
      organizationId: req.body.organizationId || 'org_123',
      nodes: req.body.nodes || [],
      edges: req.body.edges || [],
      triggerPayload: req.body.payload || {},
    });
    res.json({ success: true, result });
  } catch (err: any) {
    logger.error(`Execution error for workflow ${req.params.id}`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});
