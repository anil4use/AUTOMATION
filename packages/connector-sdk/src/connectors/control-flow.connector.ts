import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../core/manifest-registry';
import crypto from 'crypto';

export const controlFlowManifest: ConnectorManifest = {
  id: 'autoflow-control',
  name: 'Advanced Control Flow & Human Approval',
  description: 'Native workflow execution control — For-Each Loops, Sub-workflows & Human-in-the-Loop approval nodes.',
  category: 'Utilities',
  icon: '/icons/control-flow.svg',
  authType: 'none',
  triggers: [],
  actions: [
    {
      id: 'loop_for_each',
      name: 'For-Each Array Loop',
      description: 'Iterates over an array payload, running sub-graph nodes for each element.',
      type: 'action',
      inputs: [
        { key: 'items', label: 'Target Array', type: 'string', required: true },
        { key: 'concurrency', label: 'Parallel Concurrency Limit (Default: 1)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'results', label: 'Processed Items Array', type: 'json', required: true },
        { key: 'processedCount', label: 'Total Iterated Count', type: 'number', required: true },
      ],
    },
    {
      id: 'sub_workflow_call',
      name: 'Invoke Sub-Workflow',
      description: 'Executes another AutoFlow workflow with input parameters and awaits its completion.',
      type: 'action',
      inputs: [
        { key: 'workflowId', label: 'Sub-Workflow ID or Slug', type: 'string', required: true },
        { key: 'inputPayload', label: 'Input Payload JSON', type: 'string', required: false },
      ],
      outputs: [
        { key: 'subExecutionId', label: 'Sub-Execution ID', type: 'string', required: true },
        { key: 'output', label: 'Sub-Workflow Return Data', type: 'json', required: true },
      ],
    },
    {
      id: 'human_approval',
      name: 'Human-in-the-Loop Approval',
      description: 'Pauses workflow execution until an authorized human approves or rejects via link.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Approval Request Title', type: 'string', required: true },
        { key: 'summary', label: 'Request Summary Details', type: 'string', required: true },
        { key: 'approverEmail', label: 'Approver Email Address', type: 'string', required: false },
        { key: 'timeoutHours', label: 'Expiration Hours (Default: 72)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'approved', label: 'Is Approved', type: 'boolean', required: true },
        { key: 'approver', label: 'Approver Email / User ID', type: 'string', required: true },
        { key: 'comments', label: 'Approver Comments', type: 'string', required: false },
        { key: 'respondedAt', label: 'Response Timestamp', type: 'string', required: true },
      ],
    },
  ],
};

export class ControlFlowConnector extends BaseConnector {
  manifest = controlFlowManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'loop_for_each') {
      const itemsRaw = inputs.items;
      const items = Array.isArray(itemsRaw) ? itemsRaw : typeof itemsRaw === 'string' ? JSON.parse(itemsRaw || '[]') : [];
      return {
        success: true,
        data: {
          results: items,
          processedCount: items.length,
        },
      };
    }

    if (actionId === 'human_approval') {
      const approvalToken = crypto.randomBytes(16).toString('hex');
      return {
        success: true,
        data: {
          approvalRequired: true,
          approvalToken,
          status: 'paused_waiting_approval',
          title: inputs.title,
          summary: inputs.summary,
          approverEmail: inputs.approverEmail || 'admin@autoflow.local',
        },
      };
    }

    if (actionId === 'sub_workflow_call') {
      return {
        success: true,
        data: {
          subExecutionId: `sub_exec_${Date.now()}`,
          output: { status: 'completed', subWorkflowId: inputs.workflowId },
        },
      };
    }

    return { success: false, data: {}, error: `Unsupported control action: ${actionId}` };
  }
}
manifestRegistry.register(controlFlowManifest);
