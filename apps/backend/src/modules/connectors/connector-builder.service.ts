import { ConnectorManifest, ConnectorOperation } from '@automation/shared-types';
import { manifestRegistry } from '@automation/connector-sdk';

export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'body';
  required?: boolean;
  schema?: { type: string };
  description?: string;
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: any;
}

export class ConnectorBuilderService {
  /**
   * Generates an AutoFlow ConnectorManifest dynamically from an OpenAPI 3.0 specification.
   */
  static buildManifestFromOpenAPI(
    spec: {
      info: { title: string; description?: string; version?: string };
      servers?: Array<{ url: string }>;
      paths: Record<string, Record<string, OpenAPIOperation>>;
    },
    connectorId: string
  ): ConnectorManifest {
    const actions: ConnectorOperation[] = [];

    for (const [pathUrl, methods] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;

        const actionId = `${method.toLowerCase()}_${pathUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const inputs = (op.parameters || []).map((param) => {
          const fieldType: 'string' | 'number' | 'boolean' | 'json' =
            param.schema?.type === 'integer' || param.schema?.type === 'number'
              ? 'number'
              : param.schema?.type === 'boolean'
              ? 'boolean'
              : 'string';
          return {
            key: param.name,
            label: param.name + (param.description ? ` (${param.description})` : ''),
            type: fieldType,
            required: Boolean(param.required),
          };
        });

        actions.push({
          id: actionId,
          name: op.summary || `${method.toUpperCase()} ${pathUrl}`,
          description: op.description || `Auto-generated endpoint action for ${method.toUpperCase()} ${pathUrl}`,
          type: 'action',
          inputs,
          outputs: [
            { key: 'status', label: 'HTTP Status Code', type: 'number', required: true },
            { key: 'data', label: 'Response Body Payload', type: 'json', required: true },
          ],
        });
      }
    }

    const manifest: ConnectorManifest = {
      id: connectorId,
      name: spec.info.title || connectorId,
      description: spec.info.description || `Custom dynamic OpenAPI connector for ${connectorId}`,
      category: 'Custom Integrations',
      icon: '/icons/custom-api.svg',
      authType: 'api_key',
      triggers: [],
      actions,
    };

    manifestRegistry.register(manifest);
    return manifest;
  }
}
