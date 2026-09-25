/**
 * Generic variable resolution utility for AutoFlow multi-step execution pipeline.
 * Resolves {{stepId.path}} templates from a shared execution context Map.
 * Zero connector-specific logic — works for any connector output chaining.
 */

/**
 * Resolves all {{key.nested.path}} references in a value (string, object, or array)
 * using the shared context Map populated by prior step outputs.
 *
 * Examples:
 *   {{step_1.emails}}           → full email array from step_1 output
 *   {{step_1.emails[0].from}}   → first email's sender string
 *   {{step_2.file_path}}        → file path string from step_2 output
 */
export function resolveVariables(value: any, context: Map<string, any>): any {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Exact single-expression match: {{key.path}} → returns raw typed value (array, object, etc.)
    const exactMatch = trimmed.match(/^\{\{([\w.[\]]+)\}\}$/);
    if (exactMatch) {
      const path = exactMatch[1];
      const resolved = resolvePath(path, context);
      if (resolved !== undefined) return resolved;
    }

    // Inline string interpolation: "prefix {{step_1.name}} suffix" → string concat
    return value.replace(/\{\{([\w.[\]]+)\}\}/g, (_, path) => {
      const resolved = resolvePath(path, context);
      if (resolved === undefined) return `{{${path}}}`;
      return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((v) => resolveVariables(v, context));
  }

  if (typeof value === 'object' && value !== null) {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveVariables(v, context);
    }
    return out;
  }

  return value;
}

/**
 * Traverses a dot-notation path (e.g. "step_1.emails[0].from") through the context Map.
 */
function resolvePath(path: string, context: Map<string, any>): any {
  // Split on . and bracket accessors: step_1.emails[0].from → ['step_1', 'emails', '0', 'from']
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  const stepKey = parts[0];
  const stepOutput = context.get(stepKey);
  if (stepOutput === undefined) return undefined;

  let current = stepOutput;
  for (let i = 1; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    current = current[parts[i]];
  }
  return current;
}

/**
 * Scans all context values and returns the first array found under common output field names.
 * Used by downstream steps that want to consume a prior step's list output generically.
 */
export function findArrayInContext(context: Map<string, any>, excludeStepId?: string): any[] | null {
  const commonListKeys = ['emails', 'messages', 'rows', 'items', 'data', 'results', 'records', 'list', 'output'];
  for (const [stepId, val] of context.entries()) {
    if (stepId === excludeStepId) continue;
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') {
      for (const k of commonListKeys) {
        if (Array.isArray(val[k]) && val[k].length > 0) return val[k];
      }
    }
  }
  return null;
}
