# ⚡ AutoFlow — New Connector Development Standard
**Version:** 2.0 | **Status:** MANDATORY for all new connectors

> [!IMPORTANT]
> Every new connector MUST score **10/10** before merging. Use this document as your checklist.
> Copy the templates below, fill them in, and you're done. No exceptions.

---

## 📁 Required File Structure

Every connector lives in:
```
packages/connector-sdk/src/integrations/<connector-id>/
├── index.ts        ← REQUIRED: Manifest + Actions + Execution logic
├── choices.ts      ← REQUIRED if any field has dropdowns (channels, projects, users)
├── manifest.ts     ← OPTIONAL: Only if manifest is very large (prefer inline in index.ts)
├── actions.ts      ← OPTIONAL: Only if actions list is very large (prefer inline in index.ts)
└── webhook.ts      ← OPTIONAL: Only if connector supports inbound webhooks/triggers
```

> [!TIP]
> Keep everything in `index.ts` unless it exceeds ~600 lines. Fewer files = simpler imports.

---

## ✅ The 10/10 Checklist

Before submitting any connector, verify ALL 10 criteria:

```
[ ] 1. ConnectorManifest object defined inside index.ts
[ ] 2. manifestRegistry.register(myManifest) called at bottom of index.ts
[ ] 3. executeAction() or switch(actionId) implemented with real logic
[ ] 4. EVERY action has inputSchema: { type, required, properties } defined
[ ] 5. EVERY action has outputSchema: { type, properties } defined
[ ] 6. choices.ts created + dynamicChoice: { endpoint: '...' } on all dropdown fields
[ ] 7. credentials.accessToken / credentials.apiKey extracted and used
[ ] 8. Real fetch() or axios. calls to the provider API
[ ] 9. try { } catch { } error handling with structured error responses
[ ] 10. At least one trigger defined with type: 'trigger' and full outputs
```

---

## 🔷 Complete `index.ts` Template

Copy this entire template and fill in the `TODO` sections:

```typescript
import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import { get<ConnectorName>Choices } from './choices';   // ← only if you have a choices.ts
import axios from 'axios';

// ─── 1. MANIFEST ─────────────────────────────────────────────────────────────
const <connectorId>Manifest: ConnectorManifest = {
  id: '<connector-id>',                  // TODO: kebab-case, e.g. 'my-service'
  name: '<Display Name>',                // TODO: e.g. 'My Service'
  description: '<One sentence describing what this connector does and its key capabilities.>',
  category: '<Category>',               // TODO: one of: 'Communication' | 'Productivity' | 'CRM & Sales' | 'Developer Tools' | 'AI & ML' | 'Databases' | 'E-Commerce' | 'HR & Recruiting' | 'File Storage' | 'Logic & Control'
  icon: '/icons/<connector-id>.svg',    // TODO: add icon file to frontend public/icons/
  authType: 'oauth2',                   // TODO: 'oauth2' | 'api_key' | 'bearer_token' | 'basic_auth' | 'none'
  docsUrl: 'https://docs.<service>.com',
  website: 'https://<service>.com',
  version: '2.0.0',

  // ── Triggers (events that START a workflow) ──────────────────────────────
  triggers: [
    {
      id: 'new_<event>',               // TODO: snake_case
      name: 'New <Event Name>',
      description: 'Triggers when a new <event> occurs in <service>.',
      type: 'trigger',
      deliveryMethod: 'webhook',        // 'webhook' | 'polling'
      inputs: [
        // Fields the user fills in to configure the trigger
        {
          key: 'projectId',
          label: 'Project',
          type: 'string',
          required: true,
          dynamicChoice: { endpoint: 'project' },  // ← links to choices.ts
        },
      ],
      outputs: [
        // What data this trigger passes to the next step
        { key: 'id',        label: 'Record ID',    type: 'string',  required: true  },
        { key: 'title',     label: 'Title',        type: 'string',  required: true  },
        { key: 'createdAt', label: 'Created At',   type: 'string',  required: true  },
        { key: 'url',       label: 'Web URL',      type: 'string',  required: false },
      ],
    },
  ],

  // ── Actions (things this connector can DO) ───────────────────────────────
  actions: [
    {
      id: 'create_<item>',             // TODO: snake_case verb_noun
      name: 'Create <Item>',
      description: 'Creates a new <item> in <service>.',
      type: 'action',

      // ✅ REQUIRED: inputSchema — defines the form the user fills in
      inputSchema: {
        type: 'object',
        required: ['title'],            // ← list all required field keys
        properties: {
          projectId: {
            type: 'string',
            title: 'Project',
            description: 'The project to create the item in',
            // For dynamic dropdowns, add:
            dynamicOptions: {
              endpoint: '/api/v2/connectors/<connector-id>/actions/create_<item>/options/projectId',
            },
          },
          title: {
            type: 'string',
            title: 'Item Title',
            description: 'The name or title of the item to create',
          },
          description: {
            type: 'string',
            title: 'Description',
            description: 'Optional detailed description',
          },
          priority: {
            type: 'string',
            title: 'Priority',
            description: 'Item priority level',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
          },
        },
      },

      // ✅ REQUIRED: outputSchema — defines what this action returns
      outputSchema: {
        type: 'object',
        properties: {
          id:        { type: 'string',  title: 'Item ID' },
          title:     { type: 'string',  title: 'Item Title' },
          url:       { type: 'string',  title: 'Web URL' },
          createdAt: { type: 'string',  title: 'Created At' },
          success:   { type: 'boolean', title: 'Success' },
        },
      },

      inputs: [
        // ← Keep this in sync with inputSchema.properties for legacy compatibility
        { key: 'projectId',   label: 'Project',      type: 'string', required: false, dynamicChoice: { endpoint: 'project' } },
        { key: 'title',       label: 'Item Title',   type: 'string', required: true  },
        { key: 'description', label: 'Description',  type: 'string', required: false },
        { key: 'priority',    label: 'Priority',     type: 'string', required: false, enum: ['low','medium','high','urgent'] },
      ],
      outputs: [
        { key: 'id',        label: 'Item ID',   type: 'string',  required: true  },
        { key: 'title',     label: 'Title',     type: 'string',  required: true  },
        { key: 'url',       label: 'Web URL',   type: 'string',  required: false },
        { key: 'createdAt', label: 'Created At',type: 'string',  required: true  },
      ],
    },

    // TODO: Add more actions: get_all, update_<item>, delete_<item>, search_<items>
    // The more actions the better — comprehensive connectors are full-power connectors.
  ],
};

// ─── 2. CONNECTOR CLASS ───────────────────────────────────────────────────────
export class <ConnectorName>Connector extends BaseConnector {
  readonly manifest = <connectorId>Manifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const { stepInput, connectionCredentials } = context;

    // ✅ 7. Auth handling — always extract credentials this way
    const token = connectionCredentials?.accessToken
      || connectionCredentials?.apiKey
      || connectionCredentials?.token;

    if (!token) {
      return {
        success: false,
        error: { code: 'AUTHENTICATION_FAILED', message: 'Missing or invalid API credentials.' },
      };
    }

    // ✅ 3. Real action routing
    switch (actionId) {
      case 'create_<item>': return this._create<Item>(stepInput, token);
      case 'get_all':       return this._getAll(stepInput, token);
      case 'update_<item>': return this._update<Item>(stepInput, token);
      case 'delete_<item>': return this._delete<Item>(stepInput, token);
      default:
        return {
          success: false,
          error: { code: 'UNSUPPORTED_ACTION', message: `Action '${actionId}' is not supported.` },
        };
    }
  }

  // ─── Private Action Implementations ────────────────────────────────────────

  // ✅ 8 + 9: Real API calls + error handling
  private async _create<Item>(input: any, token: string): Promise<ConnectorExecutionOutput> {
    try {
      const response = await axios.post(
        'https://api.<service>.com/v1/<items>',
        {
          title:       input.title,
          description: input.description,
          priority:    input.priority || 'medium',
          project:     input.projectId,
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      const item = response.data;
      return {
        success: true,
        data: {
          id:        item.id,
          title:     item.title,
          url:       item.url || `https://<service>.com/items/${item.id}`,
          createdAt: item.created_at,
          success:   true,
        },
      };
    } catch (err: any) {
      const status  = err?.response?.status;
      const message = err?.response?.data?.message || err?.message || 'Unknown error';
      return {
        success: false,
        error: {
          code:    status === 401 ? 'AUTHENTICATION_FAILED' : status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR',
          message: `<Service> API error: ${message}`,
          details: err?.response?.data,
        },
      };
    }
  }

  private async _getAll(input: any, token: string): Promise<ConnectorExecutionOutput> {
    try {
      const response = await axios.get('https://api.<service>.com/v1/<items>', {
        headers: { Authorization: `Bearer ${token}` },
        params:  { limit: input.limit || 50, offset: input.offset || 0, q: input.query },
      });

      const items = response.data.data || response.data.items || response.data || [];
      return {
        success: true,
        data: {
          items,
          totalCount: response.data.total || items.length,
          limit:      input.limit || 50,
          hasMore:    items.length === (input.limit || 50),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'PROVIDER_ERROR', message: err?.message || 'Failed to fetch records.' },
      };
    }
  }

  // TODO: implement _update<Item> and _delete<Item> following same pattern
}

// ─── 3. REGISTER ─────────────────────────────────────────────────────────────
// ✅ This MUST be at the bottom — registers the manifest into the global registry
manifestRegistry.register(<connectorId>Manifest);

export const <connectorId>ConnectorInstance = new <ConnectorName>Connector();
```

---

## 🔷 Complete `choices.ts` Template

Create this if ANY field uses `dynamicChoice: { endpoint: '...' }`:

```typescript
import axios from 'axios';
import { ChoiceOption } from '@automation/shared-types';

interface <ConnectorName>Credentials {
  accessToken?: string;
  apiKey?: string;
}

/**
 * Fetches dynamic dropdown options for <ConnectorName> fields.
 * fieldId matches the endpoint value in dynamicChoice: { endpoint: '<fieldId>' }
 */
export async function get<ConnectorName>Choices(
  fieldId: string,
  credentials: <ConnectorName>Credentials
): Promise<ChoiceOption[]> {
  const token = credentials?.accessToken || credentials?.apiKey;

  // Always provide sensible fallback options when no credentials yet
  if (!token) {
    return getFallbackOptions(fieldId);
  }

  try {
    switch (fieldId) {
      case 'project':
      case 'projectId': {
        const response = await axios.get('https://api.<service>.com/v1/projects', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 100 },
        });
        const projects = response.data.data || response.data || [];
        return projects.map((p: any) => ({
          label: p.name,
          value: p.id,
          description: p.description,
        }));
      }

      case 'user':
      case 'userId': {
        const response = await axios.get('https://api.<service>.com/v1/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const users = response.data.data || response.data || [];
        return users.map((u: any) => ({
          label: u.name || u.email,
          value: u.id,
          description: u.email,
        }));
      }

      default:
        return [];
    }
  } catch {
    return getFallbackOptions(fieldId);
  }
}

function getFallbackOptions(fieldId: string): ChoiceOption[] {
  // Return meaningful static placeholders so the UI doesn't break
  if (fieldId === 'project' || fieldId === 'projectId') {
    return [
      { label: 'My Project (connect to see real list)', value: 'sample-project-id' },
    ];
  }
  return [];
}
```

---

## 🔷 Auth Spec Convention

Your connector's `authType` field maps to these standard auth setups:

| authType | What to put in credentials | Notes |
|---|---|---|
| `oauth2` | `{ accessToken, refreshToken, expiresAt }` | Handled by OAuth2 flow — user logs in via provider |
| `api_key` | `{ apiKey }` | User pastes API key directly |
| `bearer_token` | `{ token }` | Same as api_key but called `token` |
| `basic_auth` | `{ username, password }` | HTTP Basic Auth |
| `none` | `{}` | No auth needed (webhooks, public APIs) |

**Provider Console URLs** (add to your connector's manifest):
```typescript
docsUrl: 'https://docs.<service>.com/api',
providerConsoleUrl: 'https://developer.<service>.com/settings/keys',
```

---

## 🔷 Error Code Standards

Always use these exact error codes in your `catch` blocks:

| Code | When to use |
|---|---|
| `AUTHENTICATION_FAILED` | Token expired, invalid key, 401 response |
| `RATE_LIMITED` | Provider returned 429 |
| `INVALID_INPUT` | User provided bad/missing required field |
| `PROVIDER_ERROR` | Provider returned 5xx or unexpected error |
| `NETWORK_TIMEOUT` | Fetch/axios timeout or DNS failure |
| `UNSUPPORTED_ACTION` | `default:` case in switch(actionId) |
| `NOT_FOUND` | Resource doesn't exist (404) |

---

## 🔷 Action Naming Convention

Follow these patterns for action IDs:

| Pattern | Example | When |
|---|---|---|
| `create_<noun>` | `create_issue` | Creating a new record |
| `update_<noun>` | `update_issue` | Updating an existing record |
| `delete_<noun>` | `delete_issue` | Deleting a record |
| `get_<noun>` | `get_issue` | Fetching a single record by ID |
| `get_all` | `get_all` | Listing/searching multiple records |
| `search_<noun>s` | `search_issues` | Search with keyword query |
| `send_<noun>` | `send_message` | Sending/dispatching something |
| `upload_<noun>` | `upload_file` | Uploading content |

---

## 🔷 Register Export in `src/index.ts`

After creating your connector, add it to the SDK index:

```typescript
// packages/connector-sdk/src/index.ts
export * from './integrations/<connector-id>';   // ← add this line
```

---

## 🔷 After Creating — Run the Seeder

```bash
# Seeds your new connector's manifest, actions, auth spec, and test definitions into MongoDB
npm run connectors:seed
```

Then verify in the frontend:
1. Open `/connectors` — your new connector must appear in the list
2. Click **Test Actions** — form fields must render from `inputSchema`, not static defaults  
3. Run at least one action test — must hit real API, not return mock data
4. Check **Action Output** — output visualizer must show real response

---

## 🔷 Quality Gate — PR Checklist

Before opening a PR for a new connector:

```
[ ] connector folder exists at packages/connector-sdk/src/integrations/<id>/
[ ] index.ts has ConnectorManifest with id, name, description, category, icon, authType
[ ] manifestRegistry.register() called at bottom of index.ts
[ ] Every action has inputSchema with required[] and properties{}
[ ] Every action has outputSchema with properties{}
[ ] choices.ts exists if any field uses dynamicChoice
[ ] All credential extraction uses connectionCredentials (not hardcoded)
[ ] Real API calls implemented — no mock/fake returns
[ ] try/catch error handling with structured error codes
[ ] At least 1 trigger defined (if provider supports webhooks)
[ ] Exported in packages/connector-sdk/src/index.ts
[ ] npm run connectors:seed runs without errors
[ ] Connector appears in /connectors frontend page
[ ] Action test drawer shows dynamic form fields (not generic placeholders)
[ ] At least 1 live action test passes with real API response
[ ] No personal emails, hardcoded IDs, or test-only credentials in code
```

---

## ❌ What NOT To Do

```typescript
// ❌ NEVER put connectors inline in manifest-registry.ts
const _STATIC_MANIFESTS = [
  { id: 'my-connector', ... }  // DON'T DO THIS
];

// ❌ NEVER return mock/fake data
return { success: true, data: { id: 'fake_id_123' } };  // DON'T DO THIS

// ❌ NEVER hardcode credentials or test emails
const token = 'sk_test_hardcoded';                        // DON'T DO THIS
input.email = input.email || 'someone@gmail.com';         // DON'T DO THIS

// ❌ NEVER skip inputSchema/outputSchema
{
  id: 'create_item',
  inputs: [...],     // legacy format only — ALSO add inputSchema
  // inputSchema missing ← THIS BREAKS THE TEST DRAWER
}

// ❌ NEVER return without a try/catch
private async _createItem(input: any, token: string) {
  const res = await axios.post(...);  // if this throws, it crashes
  return { success: true, data: res.data };
}
```

---

## ✅ What a Perfect `index.ts` Looks Like

A 10/10 connector has:
- **~200–800 lines** (not too thin, not bloated)
- **1 manifest object** with all metadata filled in
- **3–15 actions** covering full CRUD + search
- **1–10 triggers** if the service supports webhooks
- **`inputSchema` + `outputSchema`** on every single action
- **`dynamicChoice`** on every dropdown field (project, user, channel, etc.)
- **1 `switch(actionId)`** routing to private `_methodName()` functions
- **Real `axios` or `fetch` calls** to the provider API in every private method
- **`try/catch`** in every private method returning structured errors
- `manifestRegistry.register()` at the very bottom

See [`slack/index.ts`](../packages/connector-sdk/src/integrations/slack/index.ts) as the current best reference (8/10 — would be 10/10 with `inputSchema` + `outputSchema`).

---

*This document is the law for all new connectors. Update it if standards change.*
*Last updated: 2026-09-24*
