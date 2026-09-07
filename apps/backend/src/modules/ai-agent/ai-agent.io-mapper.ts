import { manifestRegistry } from '@automation/connector-sdk';

/**
 * 4-Tier IO Field Matcher for AI Engine (Decision 5)
 *
 * Tier 1 (1.0): Exact key name match (e.g. 'subject' → 'subject')
 * Tier 2 (0.9): Exact semantic alias match via CONNECTOR_PROMPT_ALIASES
 * Tier 3 (0.7): Substring / fuzzy match (e.g. 'text' → 'messageText', 'body' → 'content')
 * Tier 4 (0.5): Data type match fallback (string → string)
 */

export const FIELD_ALIASES: Record<string, string[]> = {
  text: ['body', 'content', 'message', 'description', 'snippet', 'userMessage'],
  subject: ['title', 'summary', 'header', 'topic', 'name'],
  to: ['recipient', 'email', 'user', 'channel'],
  from: ['sender', 'author', 'creator'],
  id: ['messageId', 'threadId', 'fileId', 'draftId', 'channelId'],
};

export interface MatchedField {
  sourceNodeId: string;
  sourceField: string;
  targetField: string;
  confidence: number;
  mappingExpression: string;
}

export function findBestFieldMatch(
  targetFieldKey: string,
  targetFieldType: string,
  upstreamOutputs: Array<{ nodeId: string; fields: Array<{ key: string; type: string }> }>
): MatchedField | null {
  let bestMatch: MatchedField | null = null;
  let maxScore = 0;

  for (const upstream of upstreamOutputs) {
    for (const field of upstream.fields) {
      let score = 0;

      // Tier 1: Exact Key Match
      if (field.key.toLowerCase() === targetFieldKey.toLowerCase()) {
        score = 1.0;
      }
      // Tier 2: Semantic Alias Match
      else if (
        FIELD_ALIASES[targetFieldKey.toLowerCase()]?.includes(field.key.toLowerCase()) ||
        FIELD_ALIASES[field.key.toLowerCase()]?.includes(targetFieldKey.toLowerCase())
      ) {
        score = 0.9;
      }
      // Tier 3: Substring / Fuzzy Match
      else if (
        field.key.toLowerCase().includes(targetFieldKey.toLowerCase()) ||
        targetFieldKey.toLowerCase().includes(field.key.toLowerCase())
      ) {
        score = 0.7;
      }
      // Tier 4: Type Match
      else if (field.type === targetFieldType) {
        score = 0.5;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = {
          sourceNodeId: upstream.nodeId,
          sourceField: field.key,
          targetField: targetFieldKey,
          confidence: score,
          mappingExpression: `{{${upstream.nodeId}.output.${field.key}}}`,
        };
      }
    }
  }

  return bestMatch;
}

export function autoMapNodeInputs(
  targetNodeId: string,
  connectorId: string,
  operationId: string,
  upstreamNodes: Array<{ id: string; connectorId: string; operationId: string }>
): Record<string, string> {
  const targetManifest = manifestRegistry.getManifest(connectorId);
  if (!targetManifest) return {};

  const operations = [...(targetManifest.triggers || []), ...(targetManifest.actions || [])];
  const targetOp = operations.find((o) => o.id === operationId);
  if (!targetOp) return {};

  // Build upstream outputs schema
  const upstreamOutputs = upstreamNodes.map((u) => {
    const manifest = manifestRegistry.getManifest(u.connectorId);
    const ops = [...(manifest?.triggers || []), ...(manifest?.actions || [])];
    const op = ops.find((o) => o.id === u.operationId);
    return {
      nodeId: u.id,
      fields: (op?.outputs || []).map((out) => ({ key: out.key, type: out.type })),
    };
  });

  const fieldMapping: Record<string, string> = {};

  for (const input of targetOp.inputs || []) {
    const match = findBestFieldMatch(input.key, input.type, upstreamOutputs);
    if (match && match.confidence >= 0.7) {
      fieldMapping[input.key] = match.mappingExpression;
    }
  }

  return fieldMapping;
}
