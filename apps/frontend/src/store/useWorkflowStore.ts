import { create } from 'zustand';
import { DAGNode, DAGEdge } from '@automation/shared-types';

interface WorkflowState {
  workflowId: string | null;
  name: string;
  description: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
  selectedNodeId: string | null;
  setWorkflow: (id: string, name: string, description: string, nodes: DAGNode[], edges: DAGEdge[]) => void;
  addNode: (node: DAGNode) => void;
  updateNode: (id: string, update: Partial<DAGNode>) => void;
  selectNode: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  name: 'Untitled Automation',
  description: '',
  nodes: [],
  edges: [],
  selectedNodeId: null,
  setWorkflow: (id, name, description, nodes, edges) => set({ workflowId: id, name, description, nodes, edges }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, update) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...update } : n)),
    })),
  selectNode: (id) => set({ selectedNodeId: id }),
}));
