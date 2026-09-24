import { ALL_50_CONNECTOR_MANIFESTS, getManifestById, getActionOrTriggerSchema } from '@automation/connector-sdk';
import { apiClient } from './api-client';

export { ALL_50_CONNECTOR_MANIFESTS, getManifestById, getActionOrTriggerSchema };

/**
 * Cache for dynamically loaded connector manifests from backend API
 */
let dynamicManifestCache: Record<string, any> | null = null;
let isFetchingManifests = false;

/**
 * Fetch dynamic connector categories from backend /v1/connectors/registry/categories API
 */
export async function fetchCategories(): Promise<string[]> {
  try {
    const res = await apiClient.get('/v1/connectors/registry/categories');
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
  } catch (err) {}
  return ['All', 'Jobs & Recruitment', 'Google Suite', 'Communication', 'AI', 'Databases', 'CRM', 'Utilities'];
}

/**
 * Fetch dynamic connector manifests from backend /v1/connectors API
 */
export async function fetchDynamicManifests(): Promise<any[]> {
  if (dynamicManifestCache) {
    return Object.values(dynamicManifestCache);
  }
  if (isFetchingManifests) {
    return ALL_50_CONNECTOR_MANIFESTS;
  }
  isFetchingManifests = true;
  try {
    const res = await apiClient.get('/v1/connectors');
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
      const map: Record<string, any> = {};
      res.data.data.forEach((c: any) => {
        map[c.connectorId || c.id] = c;
      });
      dynamicManifestCache = map;
      return res.data.data;
    }
  } catch (err) {
    console.warn('[connector-manifests] Failed to fetch dynamic manifests from backend, using static fallback:', err);
  } finally {
    isFetchingManifests = false;
  }
  return ALL_50_CONNECTOR_MANIFESTS;
}

/**
 * Helper function to retrieve V2 Input Schema (JSONSchema) for a connector action/trigger
 */
export function getV2InputSchema(connectorId: string, actionId: string): any {
  const schemaObj = getActionOrTriggerSchema(connectorId, actionId);
  if (schemaObj?.inputSchema) {
    return schemaObj.inputSchema;
  }
  // Fallback to legacy inputs array conversion if inputSchema is not explicitly present
  if (schemaObj?.inputs && Array.isArray(schemaObj.inputs)) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    schemaObj.inputs.forEach((i: any) => {
      properties[i.key] = {
        title: i.label || i.key,
        type: i.type || 'string',
        description: i.description || '',
      };
      if (i.required) required.push(i.key);
    });
    return {
      type: 'object',
      properties,
      required,
    };
  }
  return { type: 'object', properties: {}, required: [] };
}

/**
 * Helper function to retrieve V2 Output Schema for a connector action/trigger
 */
export function getV2OutputSchema(connectorId: string, actionId: string): any {
  const schemaObj = getActionOrTriggerSchema(connectorId, actionId);
  if (schemaObj?.outputSchema) {
    return schemaObj.outputSchema;
  }
  if (schemaObj?.outputs && Array.isArray(schemaObj.outputs)) {
    const properties: Record<string, any> = {};
    schemaObj.outputs.forEach((o: any) => {
      properties[o.key] = {
        title: o.label || o.key,
        type: 'string',
      };
    });
    return {
      type: 'object',
      properties,
    };
  }
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'object' },
    },
  };
}
