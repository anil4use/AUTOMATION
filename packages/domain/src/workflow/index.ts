export interface WorkflowNodeDomain {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'loop' | 'subworkflow';
  connectorId: string;
  operationId: string;
  name?: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface WorkflowEdgeDomain {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, any>;
}

export interface WorkflowDomainModel {
  id: string;
  organizationId: string;
  creatorId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: number;
  environment: 'dev' | 'staging' | 'prod';
  definition: {
    nodes: WorkflowNodeDomain[];
    edges: WorkflowEdgeDomain[];
  };
  triggerState?: Record<string, any>;
  isAiGenerated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
