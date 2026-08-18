export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: 'admin' | 'member';
  avatar?: string;
}

export interface AuthResponseData {
  user: UserDTO;
  token: string;
}

export interface GenerateWorkflowRequest {
  prompt: string;
  connectorIds?: string[];
}

export interface GenerateWorkflowResponseData {
  draftWorkflow: {
    name: string;
    description: string;
    nodes: any[];
    edges: any[];
  };
  missingConnectors: string[];
  clarificationNeeded?: string;
}
