export interface ExecutionStepDomain {
  nodeId: string;
  name: string;
  connectorId: string;
  operationId: string;
  status: 'completed' | 'failed' | 'skipped' | 'paused_waiting_approval';
  output?: Record<string, any>;
  error?: string;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
}

export interface ExecutionDomainModel {
  id: string;
  workflowId: string;
  organizationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused_waiting_approval';
  triggerPayload: Record<string, any>;
  stepResults: Record<string, ExecutionStepDomain>;
  approvalToken?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}
