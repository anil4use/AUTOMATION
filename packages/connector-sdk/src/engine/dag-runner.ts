import { DAGNode, DAGEdge } from '@automation/shared-types';
import { StepExecutor } from './step-executor';

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

    // Check if this is a manual test run (Trigger Now)
    const isManualTriggerNow = Boolean(
      triggerPayload.manualTrigger || triggerPayload.isTestRun || triggerPayload.triggerNow || true
    );

    for (const node of nodes) {
      if (!foundReplayStart) {
        if (node.id === replayFromNodeId) {
          foundReplayStart = true;
        } else {
          console.log(`[DAGRunner Replay] Skipping previously completed node: ${node.name || node.id}`);
          continue;
        }
      }

      // Check if this node was marked for skipping due to a condition branch
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
        console.log(`[DAGRunner Engine] Step Skipped: ${node.name || node.id} (Branch condition not met)`);

        // Propagate skip to downstream nodes
        const outgoingEdges = edges.filter((e) => e.source === node.id);
        outgoingEdges.forEach((e) => skippedNodeIds.add(e.target));
        continue;
      }

      // Handle Trigger Nodes or Schedule Timers
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
        console.log(`[DAGRunner Engine] Trigger Step Executed: ${node.name || node.id} (Schedule Timer Bypassed: ${isManualTriggerNow})`);
        continue;
      }

      // Handle Action Nodes & Condition Nodes
      const stepStartedAt = new Date().toISOString();
      const startTime = Date.now();

      console.log(`[DAGRunner Engine] Executing real step: ${node.name || node.id} (${node.connectorId})`);
      try {
        const output = await StepExecutor.executeStep(node, nodeResults, triggerPayload, orgId);
        const durationMs = Date.now() - startTime;

        nodeResults[node.id] = {
          nodeId: node.id,
          name: node.name || node.id,
          connectorId: node.connectorId,
          operationId: node.operationId || 'execute',
          status: 'completed',
          output,
          startedAt: stepStartedAt,
          completedAt: new Date().toISOString(),
          durationMs,
        };
        console.log(`[DAGRunner Engine] Step Completed: ${node.name || node.id} in ${durationMs}ms`);

        // If this is a Condition Node, route outgoing edges based on matchedBranch
        const isConditionNode = node.connectorId === 'autoflow-condition' || node.connectorId === 'condition';
        if (isConditionNode && output && output.matchedBranch) {
          const activeBranch = String(output.matchedBranch).toLowerCase(); // 'true' or 'false'
          const outgoingEdges = edges.filter((e) => e.source === node.id);

          outgoingEdges.forEach((edge: any) => {
            const edgeHandle = String(edge.sourceHandle || edge.data?.branch || '').toLowerCase();
            if (edgeHandle && edgeHandle !== activeBranch) {
              skippedNodeIds.add(edge.target);
              console.log(`[DAGRunner Engine] Condition branch '${edgeHandle}' not matched. Marking node '${edge.target}' as skipped.`);
            }
          });
        }
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        console.error(`[DAGRunner Engine] Step Failed: ${node.name || node.id} (${node.connectorId}) after ${durationMs}ms - Error:`, err.message);

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
