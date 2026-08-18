import { Job } from 'bullmq';
import { WorkflowModel, ExecutionLogModel } from '@automation/database';
import { DAGRunner } from '../engine/dag-runner';
import Redis from 'ioredis';
import { workerConfig } from '../config/redis.config';

let publisher: Redis | null = null;
function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis({
      host: workerConfig.redisHost,
      port: workerConfig.redisPort,
      password: workerConfig.redisPassword,
    });
  }
  return publisher;
}

function publishEvent(orgId: string, payload: any) {
  try {
    const pub = getPublisher();
    pub.publish('execution_events', JSON.stringify({ orgId, ...payload }));
  } catch (e) {
    console.error('[Worker] Redis publish event failed:', e);
  }
}

export async function processWorkflowJob(job: Job) {
  const { workflowId, orgId, triggerPayload, replayFromNodeId, existingResults } = job.data;
  console.log(`[Worker Engine] Starting processing job ${job.id} for workflow ${workflowId}`);

  const log = await ExecutionLogModel.create({
    workflowId,
    organizationId: orgId,
    status: 'running',
    triggerPayload,
    startedAt: new Date(),
  });

  publishEvent(orgId, {
    event: 'job_started',
    jobId: job.id,
    logId: log._id.toString(),
    workflowId,
    status: 'running',
  });

  try {
    const workflow = await WorkflowModel.findById(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    const nodeResults = await DAGRunner.run(
      workflow.definition.nodes,
      workflow.definition.edges,
      triggerPayload,
      replayFromNodeId,
      existingResults
    );

    log.status = 'completed';
    log.nodeResults = nodeResults;
    log.completedAt = new Date();
    await log.save();

    publishEvent(orgId, {
      event: 'job_completed',
      jobId: job.id,
      logId: log._id.toString(),
      workflowId,
      status: 'completed',
      nodeResults,
    });

    console.log(`[Worker Engine] Job ${job.id} completed successfully`);
    return nodeResults;
  } catch (err: any) {
    console.error(`[Worker Engine] Job ${job.id} failed:`, err);
    log.status = 'failed';
    log.error = err.message;
    log.completedAt = new Date();
    await log.save();

    publishEvent(orgId, {
      event: 'job_failed',
      jobId: job.id,
      logId: log._id.toString(),
      workflowId,
      status: 'failed',
      error: err.message,
    });

    throw err;
  }
}
