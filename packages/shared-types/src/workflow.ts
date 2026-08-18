export type NodeType = 'trigger' | 'action' | 'condition' | 'ai-agent';

export interface FieldMapping {
  [targetField: string]: string; // Templated string e.g. "{{nodes.trigger_1.output.body}}"
}

export interface DAGNode {
  id: string;
  type: NodeType;
  connectorId: string; // e.g. 'gmail', 'slack', 'google-sheets', 'ai-agent'
  operationId: string; // e.g. 'new_email_received', 'send_channel_message'
  name: string;
  config: Record<string, any>;
  fieldMapping: FieldMapping;
  position?: { x: number; y: number };
}

export interface DAGEdge {
  id: string;
  source: string; // node id
  target: string; // node id
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface Workflow {
  id: string;
  organizationId: string;
  creatorId: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  definition: WorkflowDefinition;
  isAiGenerated?: boolean;
  aiPrompt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface NodeExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt: string;
  completedAt?: string;
  retryCount: number;
}

export interface WorkflowExecutionLog {
  id: string;
  workflowId: string;
  organizationId: string;
  status: ExecutionStatus;
  triggerPayload: Record<string, any>;
  nodeResults: Record<string, NodeExecutionResult>;
  error?: string;
  startedAt: string;
  completedAt?: string;
}
