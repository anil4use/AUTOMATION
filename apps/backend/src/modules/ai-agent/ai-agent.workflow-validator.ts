import { manifestRegistry } from '@automation/connector-sdk';

export interface WorkflowNode {
  id: string;
  connectorId: string;
  actionId?: string;
  triggerId?: string;
  operationId?: string;
  config?: Record<string, any>;
  fieldMapping?: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  missingConnections: string[];
  missingScopes: Record<string, string[]>;
  fieldsNeedingReview?: string[];
}

/**
 * Kahn's Algorithm BFS Cycle Detection (Issue 5)
 */
export function detectCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source)!.push(edge.target);
    }
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  const queue = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);

  let visited = 0;

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    visited++;
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (inDegree.has(neighbor)) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
  }

  return visited !== nodes.length; // true if cycle detected
}

/**
 * Validates variable reference expressions, whitelisting sys.* system variables
 */
export function isValidVariableReference(ref: string, availableOutputs: Map<string, string[]>): boolean {
  if (!ref) return false;
  const cleanRef = ref.replace(/[\{\}\s]/g, '').trim();

  // System variables (sys.*) are always valid
  if (cleanRef.startsWith('sys.')) return true;

  const match = cleanRef.match(/^(node_\d+|trigger)\.output\.(.+)$/);
  if (!match) return false;

  const [, nodeId, fieldKey] = match;
  const nodeOutputs = availableOutputs.get(nodeId);
  if (!nodeOutputs) return false;

  return nodeOutputs.includes(fieldKey);
}

export interface UserConnectionScopeInfo {
  connectorId: string;
  scopes?: string[];
}

/**
 * Validates generated workflow DAG against the ManifestRegistry
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  userConnectedAppIds: string[] | UserConnectionScopeInfo[] = []
): WorkflowValidationResult {
  const errors: string[] = [];
  const missingConnectionsSet = new Set<string>();
  const missingScopes: Record<string, string[]> = {};
  const fieldsNeedingReview: string[] = [];

  const connectedAppIds: string[] = userConnectedAppIds.map((c) =>
    typeof c === 'string' ? c : c.connectorId
  );

  const scopeMap = new Map<string, Set<string>>();
  for (const item of userConnectedAppIds) {
    if (typeof item !== 'string' && item.scopes) {
      scopeMap.set(item.connectorId, new Set(item.scopes));
    }
  }

  // 1. Cycle Detection
  if (detectCycles(nodes, edges)) {
    errors.push('Cycle detected in workflow graph DAG structure. Workflows must be acyclic.');
    return {
      valid: false,
      errors,
      missingConnections: Array.from(missingConnectionsSet),
      missingScopes,
      fieldsNeedingReview,
    };
  }

  // 2. Validate Nodes
  for (const node of nodes) {
    const manifest = manifestRegistry.getManifest(node.connectorId);
    if (!manifest) {
      errors.push(`Node '${node.id}' references unknown connector '${node.connectorId}'.`);
      continue;
    }

    // Connection Check
    if (!connectedAppIds.includes(node.connectorId) && node.connectorId !== 'autoflow-schedule') {
      missingConnectionsSet.add(node.connectorId);
    }

    const opId = node.actionId || node.triggerId || (node as any).operationId;
    if (!opId) {
      errors.push(`Node '${node.id}' missing actionId or triggerId.`);
      continue;
    }

    const operations = [...(manifest.triggers || []), ...(manifest.actions || [])];
    const op = operations.find((o) => o.id === opId);
    if (!op) {
      errors.push(`Node '${node.id}' references invalid operation '${opId}' for connector '${node.connectorId}'.`);
      continue;
    }

    // Required inputs check
    const providedKeys = new Set([
      ...Object.keys(node.config || {}),
      ...Object.keys(node.fieldMapping || {}),
    ]);

    for (const input of op.inputs || []) {
      if (input.required && !providedKeys.has(input.key)) {
        errors.push(`Node '${node.id}' missing required input field '${input.key}' for operation '${opId}'.`);
      }
      if (input.requiredScopes && input.requiredScopes.length > 0) {
        const grantedScopes = scopeMap.get(node.connectorId) || new Set();
        const ungranted = input.requiredScopes.filter((s) => !grantedScopes.has(s));
        if (ungranted.length > 0) {
          missingScopes[node.connectorId] = Array.from(
            new Set([...(missingScopes[node.connectorId] || []), ...ungranted])
          );
        }
      }

      // Mark dynamic choice fields and add to fieldsNeedingReview
      if (input.hasDynamicChoices || input.dynamicChoice) {
        if (!node.config) node.config = {};
        node.config[`_needsChoicesFetch_${input.key}`] = true;
        fieldsNeedingReview.push(`${node.id}.${input.key}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missingConnections: Array.from(missingConnectionsSet),
    missingScopes,
    fieldsNeedingReview,
  };
}
