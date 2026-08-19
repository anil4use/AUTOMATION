import { DAGNode, DAGEdge } from '@automation/shared-types';
import { StepExecutor } from './step-executor';
import { RetryHandler } from './retry-handler';

export class DAGRunner {
  static async run(
    nodes: DAGNode[],
    edges: DAGEdge[],
    triggerPayload: Record<string, any>,
    replayFromNodeId?: string,
    existingNodeResults: Record<string, any> = {},
    orgId?: string
  ) {
    const nodeResults: Record<string, any> = { ...existingNodeResults };
    let foundReplayStart = !replayFromNodeId;

    for (const node of nodes) {
      // If doing a partial replay, skip nodes prior to the replay start node
      if (!foundReplayStart) {
        if (node.id === replayFromNodeId) {
          foundReplayStart = true;
        } else {
          console.log(`[DAGRunner Replay] Skipping previously completed node: ${node.name} (${node.id})`);
          continue;
        }
      }

      if (node.type === 'trigger') {
        nodeResults[node.id] = { output: triggerPayload, status: 'completed' };
        continue;
      }

      console.log(`[DAGRunner Engine] Executing node: ${node.name} (${node.id})`);
      const output = await RetryHandler.executeWithRetry(() =>
        StepExecutor.executeStep(node, nodeResults, triggerPayload, orgId)
      );

      nodeResults[node.id] = { output, status: 'completed', completedAt: new Date().toISOString() };
    }

    return nodeResults;
  }
}
