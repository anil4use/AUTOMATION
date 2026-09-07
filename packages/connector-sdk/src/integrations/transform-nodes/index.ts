import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

function evaluatePathQuery(obj: any, pathStr: string): any[] {
  if (!obj || !pathStr) return [obj];
  const cleanPath = pathStr.replace(/^\$\.?/, '');
  if (!cleanPath) return [obj];
  
  const parts = cleanPath.split('.');
  let curr = [obj];
  
  for (const part of parts) {
    const nextArr: any[] = [];
    const key = part.replace(/\[\*\]/g, '').replace(/\[\d+\]/g, '');
    
    for (const item of curr) {
      if (item && typeof item === 'object') {
        const val = item[key];
        if (Array.isArray(val)) {
          nextArr.push(...val);
        } else if (val !== undefined) {
          nextArr.push(val);
        }
      }
    }
    curr = nextArr;
  }
  return curr;
}

// 1. Text Transformer Manifest & Class
export const textTransformerManifest: ConnectorManifest = {
  id: 'transform-text',
  name: 'Text Transformer',
  description: 'Native string manipulation — Regex replace, split, join, casing conversions & text formatting.',
  category: 'Utilities',
  icon: '/icons/text-transform.svg',
  authType: 'none',
  triggers: [],
  actions: [
    {
      id: 'replace',
      name: 'Replace Text / Regex',
      description: 'Replaces occurrences of text or regex pattern.',
      type: 'action',
      inputs: [
        { key: 'input', label: 'Input Text', type: 'string', required: true },
        { key: 'pattern', label: 'Search String or Regex Pattern', type: 'string', required: true },
        { key: 'replacement', label: 'Replacement String', type: 'string', required: true },
        { key: 'isRegex', label: 'Treat as Regular Expression', type: 'boolean', required: false },
      ],
      outputs: [{ key: 'result', label: 'Transformed Text', type: 'string', required: true }],
    },
    {
      id: 'split',
      name: 'Split String to Array',
      description: 'Splits text by delimiter into an array.',
      type: 'action',
      inputs: [
        { key: 'input', label: 'Input Text', type: 'string', required: true },
        { key: 'delimiter', label: 'Delimiter (default: comma)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'items', label: 'Result Array', type: 'json', required: true },
        { key: 'count', label: 'Item Count', type: 'number', required: true },
      ],
    },
    {
      id: 'convert_case',
      name: 'Convert Case',
      description: 'Converts text to UPPERCASE, lowercase, or Title Case.',
      type: 'action',
      inputs: [
        { key: 'input', label: 'Input Text', type: 'string', required: true },
        { key: 'targetCase', label: 'Target Case (uppercase, lowercase, titlecase)', type: 'string', required: true },
      ],
      outputs: [{ key: 'result', label: 'Transformed Text', type: 'string', required: true }],
    },
  ],
};

export class TextTransformerConnector extends BaseConnector {
  manifest = textTransformerManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const text = String(inputs.input || '');

    if (actionId === 'replace') {
      const pattern = inputs.pattern || '';
      const replacement = inputs.replacement || '';
      let result = text;
      if (inputs.isRegex) {
        const regex = new RegExp(pattern, 'g');
        result = text.replace(regex, replacement);
      } else {
        result = text.replaceAll(pattern, replacement);
      }
      return { success: true, data: { result } };
    }

    if (actionId === 'split') {
      const delimiter = inputs.delimiter || ',';
      const items = text.split(delimiter).map((s) => s.trim());
      return { success: true, data: { items, count: items.length } };
    }

    if (actionId === 'convert_case') {
      const targetCase = String(inputs.targetCase || '').toLowerCase();
      let result = text;
      if (targetCase === 'uppercase') result = text.toUpperCase();
      if (targetCase === 'lowercase') result = text.toLowerCase();
      if (targetCase === 'titlecase') result = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      return { success: true, data: { result } };
    }

    return { success: false, data: {}, error: `Unsupported text action: ${actionId}` };
  }
}
manifestRegistry.register(textTransformerManifest);

// 2. JSON Transformer Manifest & Class
export const jsonTransformerManifest: ConnectorManifest = {
  id: 'transform-json',
  name: 'JSON Transformer',
  description: 'JSONPath querying, stringify, parse & nested object flattening.',
  category: 'Utilities',
  icon: '/icons/json-transform.svg',
  authType: 'none',
  triggers: [],
  actions: [
    {
      id: 'json_path',
      name: 'JSONPath Query',
      description: 'Evaluates a JSONPath query against a JSON object or array.',
      type: 'action',
      inputs: [
        { key: 'jsonInput', label: 'Target JSON (Object or String)', type: 'string', required: true },
        { key: 'path', label: 'JSONPath Expression (e.g. $.items[*].id)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'result', label: 'QueryResult', type: 'json', required: true },
        { key: 'matchCount', label: 'Match Count', type: 'number', required: true },
      ],
    },
    {
      id: 'parse',
      name: 'Parse JSON String',
      description: 'Parses a JSON string into an object/array.',
      type: 'action',
      inputs: [{ key: 'jsonString', label: 'JSON String', type: 'string', required: true }],
      outputs: [{ key: 'data', label: 'Parsed Object', type: 'json', required: true }],
    },
  ],
};

export class JsonTransformerConnector extends BaseConnector {
  manifest = jsonTransformerManifest;

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};

    if (actionId === 'json_path') {
      try {
        const rawJson = typeof inputs.jsonInput === 'string' ? JSON.parse(inputs.jsonInput) : inputs.jsonInput;
        const result = evaluatePathQuery(rawJson, inputs.path || '$');
        return { success: true, data: { result, matchCount: result.length } };
      } catch (err: any) {
        return { success: false, data: {}, error: `JSONPath evaluation failed: ${err.message}` };
      }
    }

    if (actionId === 'parse') {
      try {
        const data = typeof inputs.jsonString === 'string' ? JSON.parse(inputs.jsonString) : inputs.jsonString;
        return { success: true, data: { data } };
      } catch (err: any) {
        return { success: false, data: {}, error: `JSON parse error: ${err.message}` };
      }
    }

    return { success: false, data: {}, error: `Unsupported JSON action: ${actionId}` };
  }
}
manifestRegistry.register(jsonTransformerManifest);
