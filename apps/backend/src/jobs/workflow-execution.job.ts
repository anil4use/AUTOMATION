import { getWorkflowQueue } from '../infrastructure/queue';

export async function dispatchWorkflowJob(workflowId: string, orgId: string, payload: Record<string, any>) {
  const queue = getWorkflowQueue();
  return await queue.add('execute-dag', { workflowId, orgId, payload });
}
