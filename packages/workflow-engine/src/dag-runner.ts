import { DAGNode, DAGEdge } from '@automation/shared-types';
import { StepExecutor } from './step-executor';
import { createLogger } from '@automation/observability';

const logger = createLogger('DAGRunner');

export class DAGRunner {
  static async run(
    nodes: DAGNode[],
    edges: DAGEdge[],
    triggerPayload: Record<string, any> = {},
    replayFromNodeId?: string,
    existingNodeResults: Record<string, any> = {},
    orgId?: string
  ) {
    const nodeResults: Record<string, any> = { ...existingNodeResults };
    let foundReplayStart = !replayFromNodeId;
    const skippedNodeIds = new Set<string>();

    const isManualTriggerNow = Boolean(
      triggerPayload.manualTrigger || triggerPayload.isTestRun || triggerPayload.triggerNow || true
    );

    for (const node of nodes) {
      if (!foundReplayStart) {
        if (node.id === replayFromNodeId) {
          foundReplayStart = true;
        } else {
          logger.info(`Replay Skipping node: ${node.name || node.id}`);
          continue;
        }
      }

      if (skippedNodeIds.has(node.id)) {
        const stepStartedAt = new Date().toISOString();
        nodeResults[node.id] = {
          nodeId: node.id,
          name: node.name || node.id,
          connectorId: node.connectorId,
          operationId: node.operationId || 'execute',
          status: 'skipped',
          output: { skipped: true, reason: 'Condition branch not taken' },
          startedAt: stepStartedAt,
          completedAt: stepStartedAt,
          durationMs: 0,
        };

        const outgoingEdges = edges.filter((e) => e.source === node.id);
        outgoingEdges.forEach((e) => skippedNodeIds.add(e.target));
        continue;
      }

      if (node.type === 'trigger' || node.connectorId === 'autoflow-schedule') {
        const stepStartedAt = new Date().toISOString();
        nodeResults[node.id] = {
          nodeId: node.id,
          name: node.name || node.id,
          connectorId: node.connectorId,
          operationId: node.operationId || 'trigger',
          status: 'completed',
          output: {
            triggeredAt: stepStartedAt,
            scheduleTimerBypassed: isManualTriggerNow,
            ...triggerPayload,
          },
          startedAt: stepStartedAt,
          completedAt: stepStartedAt,
          durationMs: 0,
        };
        continue;
      }

      const stepStartedAt = new Date().toISOString();
      const startTime = Date.now();

      logger.info(`Executing step: ${node.name || node.id} (${node.connectorId})`);
      try {
        const output = await StepExecutor.executeStep(node, nodeResults, triggerPayload, orgId);
        const durationMs = Date.now() - startTime;

        nodeResults[node.id] = {
          nodeId: node.id,
          name: node.name || node.id,
          connectorId: node.connectorId,
          operationId: node.operationId || 'execute',
          status: output?.status === 'paused_waiting_approval' ? 'paused_waiting_approval' : 'completed',
          output,
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          durationMs,
        };

        const isConditionNode = node.connectorId === 'autoflow-condition' || node.connectorId === 'condition';
        if (isConditionNode && output && output.matchedBranch) {
          const activeBranch = String(output.matchedBranch).toLowerCase();
          const outgoingEdges = edges.filter((e) => e.source === node.id);

          outgoingEdges.forEach((edge: any) => {
            const edgeHandle = String(edge.sourceHandle || edge.data?.branch || '').toLowerCase();
            if (edgeHandle && edgeHandle !== activeBranch) {
              skippedNodeIds.add(edge.target);
            }
          });
        }
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        logger.error(`Step Failed: ${node.name || node.id}`, err);

        nodeResults[node.id] = {
          nodeId: node.id,
          name: node.name || node.id,
          connectorId: node.connectorId,
          operationId: node.operationId || 'execute',
          status: 'failed',
          error: err.message,
          startedAt: stepStartedAt,
          failedAt: new Date().toISOString(),
          durationMs,
        };
        throw err;
      }
    }

    return nodeResults;
  }
}
