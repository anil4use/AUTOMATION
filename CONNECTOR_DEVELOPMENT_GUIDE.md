# AutoFlow V2 — Connector & SDK Development Guide

> [!IMPORTANT]
> **This file is superseded.** The canonical and up-to-date standards are now in:
> - 📋 **[`docs/CONNECTOR_DEVELOPMENT_STANDARD.md`](docs/CONNECTOR_DEVELOPMENT_STANDARD.md)** — Complete guide, templates, and 10/10 checklist for all new connectors
> - 🔧 **[`docs/CONNECTOR_AUDIT_FIX_TRACKER.md`](docs/CONNECTOR_AUDIT_FIX_TRACKER.md)** — Backlog of all 60 connectors that need to be fixed
>
> When adding a **new connector**, use `CONNECTOR_DEVELOPMENT_STANDARD.md` only.
> This file is kept for historical reference.

---

Welcome to the **AutoFlow V2 Connector & SDK Development Guide**. This document outlines the standard workflow, rules, and architecture for adding new connectors, integrations, and capability SDKs to the AutoFlow platform.

AutoFlow V2 uses a **Database-Driven Connector Platform** architecture. MongoDB serves as the single source of truth for connector metadata, capabilities, action schemas, authentication fields, feature support matrices, and test suites, while TypeScript code provides execution strategies and adapters.

---

## 📑 Table of Contents
1. [Core Principles](#1-core-principles)
2. [V2 Architecture Overview](#2-v2-architecture-overview)
3. [Step-by-Step Guide: Adding a New Connector](#3-step-by-step-guide-adding-a-new-connector)
   - [Step 1: Create Integration Directory & Manifest](#step-1-create-integration-directory--manifest)
   - [Step 2: Define Actions & Input/Output Schemas](#step-2-define-actions--inputoutput-schemas)
   - [Step 3: Implement Execution Strategy / Adapter](#step-3-implement-execution-strategy--adapter)
   - [Step 4: Register Authentication Specification](#step-4-register-authentication-specification)
   - [Step 5: Register in Connector SDK Registry](#step-5-register-in-connector-sdk-registry)
   - [Step 6: Add to Auto-Seeder & Database Schemas](#step-6-add-to-auto-seeder--database-schemas)
   - [Step 7: Add Test Runner Suite & Health Check](#step-7-add-test-runner-suite--health-check)
4. [Dynamic Frontend UI & Dynamic Field Rendering](#4-dynamic-frontend-ui--dynamic-field-rendering)
5. [Error Handling & Code Standards](#5-error-handling--code-standards)
6. [Checklist for Adding New Connectors](#6-checklist-for-adding-new-connectors)

---

## 1. Core Principles

> [!IMPORTANT]
> **V1 Backward Compatibility**: Never break existing workflow definitions, node execution IDs, or stored connection credentials. Always use `CONNECTOR_SDK_V2_ENABLED` feature gating with automatic V1 fallback resolving.

> [!CAUTION]
> **STRICT ZERO-MOCK POLICY**: The platform MUST NEVER invent, return, or fallback to dummy, static, fake, or mock data under any circumstances. All action tests, dynamic options endpoints, and workflow steps MUST execute against real provider APIs using authentic credentials. If an API call fails or credentials are invalid, return a real, structured error payload with exact provider status.

1. **No Raw Code in MongoDB**: Database stores metadata (*WHAT* a connector can do, field types, schemas, descriptions, icons, capabilities). TypeScript executors define *HOW* it executes safely.
2. **Zero-Setup Auto-Bootstrap**: Every new connector MUST be included in the seeder payload (`scripts/seed-connectors-v2.ts`) so that deploying the platform on any fresh environment automatically populates MongoDB on server startup.
3. **Dynamic Frontend Rendering & Optional Test Inputs**: Frontend components render form fields and actions dynamically based on `/api/v2/connectors` responses. In the Testing Center, input fields are **optional** so users can test specific fields without being blocked by required field validation.
4. **Universal Dynamic Response Visualization**: The frontend uses a schema-agnostic recursive inspector with dynamic type detection (Data Tables for arrays, HTML frames for HTML output, Markdown views for text, Image boxes for URLs/base64, Tree View for objects) allowing any app's dynamic output to be inspected and mapped into `{{step_X.output.path}}` variables.
5. **Mandatory Authentication Setup Guides & Provider Redirect Links**: Every connector MUST provide explicit setup instructions, `documentationUrl`, and per-field `docUrl`/`help` text explaining how users can generate credentials (e.g., Client ID, Client Secret, API Token). The frontend connection modal MUST display a **"📖 Setup Guide"** and a **"🔗 Open Provider Console"** redirect link so users can easily obtain their keys.
6. **Comprehensive Feature Coverage**: Do not create hollow connectors with only a "ping" test. Implement full-featured actions (e.g., CRUD, search, pagination, bulk operations, webhook triggers).

---

## 2. V2 Architecture Overview

```
                                 ┌──────────────────────────────────────────────┐
                                 │           MongoDB Connector Store            │
                                 │ (Connectors, Actions, Auth, Tests, Matrix)   │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                                                        ▼
                                         ┌──────────────────────────────┐
                                         │     Connector Runtime V2     │
                                         │   (Feature Flag: V2 / V1)    │
                                         └──────────────┬───────────────┘
                                                        │
              ┌───────────────────┬─────────────────────┼─────────────────────┬───────────────────┐
              ▼                   ▼                     ▼                     ▼                   ▼
    ┌───────────────────┐ ┌───────────────┐   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────┐
    │ Generic HTTP Exec │ │ Database Exec │   │ Playwright Exec   │ │    AI SDK Exec    │ │ Adapter Exec  │
    └─────────┬─────────┘ └───────┬───────┘   └─────────┬─────────┘ └─────────┬─────────┘ └───────┬───────┘
              │                   │                     │                     │                   │
              └───────────────────┴─────────────────────┼─────────────────────┴───────────────────┘
                                                        │
                                                        ▼
                                         ┌──────────────────────────────┐
                                         │ Target Provider / REST / API │
                                         └──────────────────────────────┘
```

---

## 3. Step-by-Step Guide: Adding a New Connector

### Step 1: Create Integration Directory & Manifest

Create a new directory in `packages/connector-sdk/src/integrations/<connector-id>/`.

Example: `packages/connector-sdk/src/integrations/my-service/`
Create `manifest.ts`:

```ts
import { ConnectorManifest } from '../../core/types';

export const MY_SERVICE_MANIFEST: ConnectorManifest = {
  id: 'my-service',
  slug: 'my-service',
  name: 'My Service',
  displayName: 'My Service Platform',
  description: 'Automate tasks, data sync, and messaging with My Service.',
  category: 'productivity',
  version: '2.0.0',
  icon: 'https://assets.autoflow.ai/icons/my-service.svg',
  provider: 'MyService Inc.',
  website: 'https://myservice.com',
  documentationUrl: 'https://docs.myservice.com',
  status: 'published',
  runtimeType: 'adapter', // 'http' | 'oauth_api' | 'sdk' | 'database' | 'browser' | 'webhook' | 'ai' | 'adapter'
  adapterType: 'MyServiceAdapter',
  capabilities: ['create', 'read', 'update', 'delete', 'search', 'oauth'],
  tags: ['productivity', 'collaboration', 'automation'],
};
```

---

### Step 2: Define Actions & Input/Output Schemas

Create `actions.ts`:

```ts
import { ConnectorActionDefinition } from '../../core/types';

export const MY_SERVICE_ACTIONS: ConnectorActionDefinition[] = [
  {
    actionId: 'create_item',
    name: 'Create Item',
    description: 'Creates a new item in My Service workspace.',
    type: 'action',
    semanticType: 'create',
    executionType: 'adapter',
    adapterMethod: 'createItem',
    inputSchema: {
      type: 'object',
      required: ['title', 'workspaceId'],
      properties: {
        workspaceId: {
          type: 'string',
          title: 'Workspace ID',
          description: 'Select target workspace',
          dynamicOptions: {
            endpoint: '/api/v2/connectors/my-service/actions/create_item/options/workspaceId',
          },
        },
        title: {
          type: 'string',
          title: 'Item Title',
          description: 'Title of the item to create',
        },
        content: {
          type: 'string',
          title: 'Content / Body',
          description: 'Detailed description or markdown content',
        },
        priority: {
          type: 'string',
          title: 'Priority',
          enum: ['low', 'medium', 'high', 'urgent'],
          default: 'medium',
        },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        url: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
    capabilities: ['create'],
    destructive: false,
    enabled: true,
  },
  {
    actionId: 'search_items',
    name: 'Search Items',
    description: 'Searches items by title, status, or tag.',
    type: 'search',
    semanticType: 'search',
    executionType: 'adapter',
    adapterMethod: 'searchItems',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', title: 'Search Query' },
        limit: { type: 'number', title: 'Max Results', default: 20 },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        items: { type: 'array' },
        total: { type: 'number' },
      },
    },
    capabilities: ['search', 'read'],
    destructive: false,
    enabled: true,
  },
];
```

---

### Step 3: Implement Execution Strategy / Adapter

Create `adapter.ts`:

```ts
import { BaseConnectorAdapter, ExecutionContext, ExecutionResult } from '../../core/base-connector';

export class MyServiceAdapter extends BaseConnectorAdapter {
  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const { actionId, input, credentials } = context;

    switch (actionId) {
      case 'create_item':
        return this.createItem(input, credentials);
      case 'search_items':
        return this.searchItems(input, credentials);
      default:
        throw new Error(`Unsupported action '${actionId}' in MyServiceAdapter`);
    }
  }

  private async createItem(input: any, credentials: any): Promise<ExecutionResult> {
    const token = credentials.accessToken || credentials.apiKey;
    const response = await fetch('https://api.myservice.com/v1/items', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: {
          code: 'PROVIDER_ERROR',
          message: `My Service API request failed: ${response.statusText}`,
          details: errorText,
        },
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  }

  private async searchItems(input: any, credentials: any): Promise<ExecutionResult> {
    // Implement search logic...
    return { success: true, data: { items: [], total: 0 } };
  }
}
```

---

### Step 4: Register Authentication Specification

Create `auth.ts`:

```ts
import { ConnectorAuthenticationSpec } from '../../core/types';

export const MY_SERVICE_AUTH: ConnectorAuthenticationSpec = {
  authenticationId: 'my-service-oauth2',
  connectorId: 'my-service',
  type: 'oauth2', // 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'connection_string'
  name: 'OAuth 2.0 Authentication',
  description: 'Connect using official OAuth 2.0 authorization.',
  recommended: true,
  fields: [
    {
      key: 'clientId',
      label: 'Client ID',
      type: 'string',
      required: true,
      placeholder: 'Enter My Service Client ID',
    },
    {
      key: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      placeholder: 'Enter My Service Client Secret',
    },
  ],
  scopes: ['read', 'write', 'offline_access'],
  authorizationUrl: 'https://myservice.com/oauth/authorize',
  tokenUrl: 'https://myservice.com/oauth/token',
  refreshTokenSupported: true,
};
```

---

### Step 5: Register in Connector SDK Registry

Export the new integration from `packages/connector-sdk/src/index.ts` and add it to `packages/connector-sdk/src/core/manifest-registry.ts`:

1. In `packages/connector-sdk/src/index.ts`:
   ```ts
   export * from './integrations/my-service';
   ```
2. In `packages/connector-sdk/src/core/manifest-registry.ts`:
   - Import `MY_SERVICE_MANIFEST`, `MY_SERVICE_ACTIONS`, `MY_SERVICE_AUTH`.
   - Register in `ALL_50_CONNECTOR_MANIFESTS` array.

---

### Step 6: Add to Auto-Seeder & Database Schemas

Add the complete connector definition (manifest, actions, auth specs, feature support matrix, test definitions) into `scripts/seed-connectors-v2.ts` and `ConnectorSeederService`:

```ts
// scripts/seed-connectors-v2.ts
const newConnectorPayload = {
  manifest: MY_SERVICE_MANIFEST,
  actions: MY_SERVICE_ACTIONS,
  authentication: MY_SERVICE_AUTH,
  features: [
    { featureId: 'create_item', name: 'Item Creation', category: 'CRUD', status: 'SUPPORTED' },
    { featureId: 'realtime_webhooks', name: 'Realtime Webhooks', category: 'Events', status: 'SUPPORTED' },
  ],
  tests: [
    {
      testId: 'test_create_item',
      name: 'Test Item Creation',
      actionId: 'create_item',
      sampleInput: { title: 'Test AutoFlow Item', content: 'Automated test' },
      expectedOutputKeys: ['id', 'title'],
    },
  ],
};
```

When the server starts up or when `npm run connectors:seed` is executed, MongoDB will automatically upsert this connector into:
- `connectors`
- `connector_actions`
- `connector_authentications`
- `connector_features`
- `connector_test_definitions`

---

### Step 7: Add Test Runner Suite & Health Check

In `packages/connector-sdk/src/integrations/my-service/test-suite.ts`:

```ts
export const MY_SERVICE_TEST_SUITE = {
  connectorId: 'my-service',
  healthCheck: async (credentials: any) => {
    // Ping API health / verify token validity
    const res = await fetch('https://api.myservice.com/v1/me', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    return { ok: res.ok, statusText: res.statusText };
  },
};
```

---

## 4. Dynamic Frontend UI & Dynamic Field Rendering

The AutoFlow frontend renders connector forms dynamically:
- Field inputs (text, password, select, textarea) are parsed from `action.inputSchema`.
- Dependent options (e.g. selecting a Slack channel after selecting a workspace) call:
  `GET /api/v2/connectors/:connectorId/actions/:actionId/options/:fieldId`
- Form state validation uses standard JSON Schema rules defined in MongoDB `ConnectorActionSchema`.

---

## 5. Error Handling & Code Standards

All execution errors must be caught and converted into standard structured errors:

| Standard Error Code | Trigger Condition |
| :--- | :--- |
| `AUTHENTICATION_FAILED` | Token expired, invalid API key, missing scope, 401 Unauthorized |
| `RATE_LIMITED` | Provider returned 429 Too Many Requests |
| `INVALID_INPUT` | Input payload violated JSON Schema constraints |
| `PROVIDER_ERROR` | Upstream provider 5xx server error or unhandled failure |
| `NETWORK_TIMEOUT` | Connection timed out or DNS resolution failure |

---

## 6. Checklist for Adding New Connectors

- [ ] Directory created in `packages/connector-sdk/src/integrations/<connector-id>`
- [ ] `manifest.ts` created with valid slug, category, status, and capabilities
- [ ] `actions.ts` created with full CRUD & search action definitions and dynamic schemas
- [ ] `adapter.ts` or HTTP strategy implemented handling error scenarios cleanly
- [ ] `auth.ts` created with security scopes and required user fields
- [ ] Exported in `packages/connector-sdk/src/index.ts`
- [ ] Included in `ALL_50_CONNECTOR_MANIFESTS` registry
- [ ] Seed payload added to `scripts/seed-connectors-v2.ts` and `ConnectorSeederService`
- [ ] Test cases defined in `connector_test_definitions`
- [ ] `npm run connectors:seed` executed cleanly
- [ ] Frontend tested via `/connectors` dynamic UI and Action Test Runner
