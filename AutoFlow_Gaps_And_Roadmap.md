# Gap Analysis & Feature Roadmap: What AutoFlow Does Not Have Yet

This document provides a comprehensive comparison between **Zapier-grade industry standards** and **AutoFlow's current capabilities**, highlighting the gaps and defining the future development roadmap.

---

## 1. Feature Gap Matrix (Zapier vs. AutoFlow)

| Feature Area | Zapier Standard | AutoFlow Current State | Gap Severity / Priority |
|---|---|---|---|
| **Connector Framework** | 7,000+ Apps via Partner CLI SDK | 55+ Core Manifests in SDK | 🟡 Medium (Expand Connector Library) |
| **AI Workflow Generator** | Basic / Limited Prompt-to-Zap | **Advanced** (Gemini 3.6 / Groq Copilot) | 🟢 AutoFlow Ahead |
| **Conversational AI Agent & Memory** | Separate Product (Zapier Central) | **Integrated** (WhatsApp Agent & Memory Engine) | 🟢 AutoFlow Ahead |
| **Visual Workflow Canvas** | Drag-and-drop Graph Builder | Visual Canvas + In-canvas AI Copilot | 🟢 AutoFlow Equivalent |
| **Conditional Paths & Branching** | Multi-branch `Paths` & nested DAG trees | Linear DAG execution / basic Condition Node | 🔴 High Priority Gap |
| **Inbound Webhook Routing** | Universal Webhook Router for any app | Specific Webhooks (WhatsApp/Stripe/Custom) | 🔴 High Priority Gap |
| **Polling Trigger System** | Periodic API Polling with state cursor | Fixed Cron Schedule & Webhooks only | 🔴 High Priority Gap |
| **Dynamic Form Option Loading** | Live API option fetch in UI (e.g. channels list) | Predefined static schema options | 🟡 Medium Priority Gap |
| **OAuth Token Refresh Daemon** | Automated background token refresh worker | Encrypted Token storage & manual exchange | 🔴 High Priority Gap |
| **Rate Limiting & Idempotency** | Per-App / Per-Connection rate limiting + deduplication | Worker concurrency control | 🟡 Medium Priority Gap |
| **Partner CLI SDK / Developer Portal** | Public CLI (`zapier push`) for 3rd-party devs | In-repo typescript connector manifests | 🔵 Low Priority / Phase 5 |

---

## 2. Detailed Gap Breakdown (What We Don't Have Yet)

### Gap 1: Advanced Conditional Branching / Paths Node
- **What Zapier Has**: Users can create multi-branch execution trees where Branch A executes if `lead.value > 10000` and Branch B executes if `lead.value <= 10000`. Both branches can execute different sub-pipelines.
- **What AutoFlow Has Currently**: `DAGRunner` processes nodes sequentially. We have a `Condition` connector manifest, but the runner does not yet dynamically skip or split execution branches along true/false graph edges.

### Gap 2: Inbound Webhook Router for Arbitrary App Triggers
- **What Zapier Has**: Every Zap trigger can generate a permanent unique URL (`https://hooks.zapier.com/hooks/catch/12345/abc/`). Any external service can POST any JSON to it, and Zapier parses and routes it to the specific workflow.
- **What AutoFlow Has Currently**: Dedicated webhook endpoints for WhatsApp (`/api/v1/wa/webhook/:id`) and specific connectors, but lacks a single universal `/api/v1/webhooks/catch/:webhookId` router service that accepts arbitrary JSON from any custom web service.

### Gap 3: State-Aware Polling Trigger Engine
- **What Zapier Has**: For apps without webhooks (e.g., legacy CRMs, RSS feeds, email inboxes), Zapier runs a polling daemon every 5–15 minutes. It keeps track of a `last_seen_cursor` timestamp/ID and triggers a workflow run for each new record found.
- **What AutoFlow Has Currently**: Fixed cron schedules (polling every X seconds) or push webhooks. We do not yet store a per-connection `polling_cursor` state in MongoDB for polling apps.

### Gap 4: Dynamic Dropdown Option Loading in Builder UI
- **What Zapier Has**: When configuring a Slack action in the UI, Zapier makes an API call to Slack to populate a drop-down list of the user's actual Slack channels (`#general`, `#sales`, etc.).
- **What AutoFlow Has Currently**: Input schemas support text inputs and static select lists. We need to implement an API route `/api/v1/connectors/:app/choices/:action` that calls the third-party API via `ConnectionModel` credentials to return live choices to the React builder UI.

### Gap 5: Automated OAuth 2.0 Token Refresh Worker
- **What Zapier Has**: A background process that checks access token expiration times (`expires_in`) and automatically uses `refresh_token` to rotate tokens before they expire.
- **What AutoFlow Has Currently**: Credentials are encrypted at rest using AES-256 in `ConnectionModel`. However, if an OAuth access token expires after 1 hour (e.g. Google OAuth), the user must re-authenticate manually instead of an automated worker refreshing it in the background.

### Gap 6: Per-App Rate Limiting & Idempotency Keys
- **What Zapier Has**:
  - Idempotency keys (`execution_id + step_id`) attached to outbound requests so retries never create duplicate charges or rows.
  - Per-connector rate limiters (e.g. max 10 req/sec for Google Sheets) to prevent getting 429 blocked.
- **What AutoFlow Has Currently**: BullMQ retries failed jobs, but we do not attach explicit idempotency headers or enforce per-provider rate limiter tokens in Redis.

---

## 3. Development Roadmap (Phases 1 – 5)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Advanced DAG Branching & Universal Webhook Router              │
│  - Implement true/false branch skipping in DAGRunner                    │
│  - Create /api/v1/webhooks/catch/:webhookId universal catch endpoint   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: OAuth Refresh Daemon & Polling Trigger Engine                  │
│  - Add background OAuth token refresh worker                            │
│  - Implement polling worker with state cursor (last_seen_id/timestamp)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Dynamic Choices API for UI Form Builder                        │
│  - Implement live dropdown choice fetching (/connectors/:app/choices)   │
│  - Add dependent field loading (Spreadsheet → Worksheet → Columns)      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Enterprise Rate Limiting & Idempotency Layer                   │
│  - Add Redis token-bucket rate limiter per connector provider           │
│  - Inject idempotency headers (X-Idempotency-Key) on action executions   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Partner SDK & Community Connector Portal                       │
│  - Open Connector Manifest SDK for community submissions                │
│  - Create developer portal for custom app registration                  │
└─────────────────────────────────────────────────────────────────────────┘
```
