export interface CreateWorkflowDTO {
  name: string;
  description?: string;
  definition?: {
    nodes: any[];
    edges: any[];
  };
}

export interface UpdateWorkflowDTO {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'paused' | 'archived';
  definition?: {
    nodes: any[];
    edges: any[];
  };
}
