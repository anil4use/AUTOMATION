# Comprehensive Overview: How Zapier Works Architecture-Wise

This document explains the overall architecture, design patterns, and technical mechanisms behind a **Zapier-like Automation Platform**.

---

## 1. High-Level Mental Model

A Zapier-like platform is essentially a **workflow execution engine + standardized connector framework**. It converts user-defined automation rules into executable tasks processed asynchronously by background worker pools.

```
                    ┌─────────────────────────┐
                    │    Workflow Builder     │
                    │   (React / TypeScript)  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   Workflow Definition   │
                    │      (JSON / DAG)       │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│ Trigger         │ ──► │     Workflow Engine     │ ──► │ Action          │
│ (Webhook/Poll)  │     │   (Queue + Task Pool)   │     │ (REST / GraphQL)│
└─────────────────┘     └────────────┬────────────┘     └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  Data Mapper    │
                            │ & Templating    │
                            └────────┬────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │ Execution Logs  │
                            └─────────────────┘
```

---

## 2. Core Architectural Principles

### A. Connector as an Adapter
The workflow engine never calls third-party APIs directly with hardcoded `if/else` logic. Instead, every integration is an **Adapter** implementing a standardized `IConnector` interface:

```
                      Workflow Engine
                             │
                             ▼
                    Connector SDK Interface
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
       Gmail               Slack             HubSpot
      Connector          Connector          Connector
          │                  │                  │
          ▼                  ▼                  ▼
      Gmail API          Slack API         HubSpot API
```

Each connector encapsulates:
- Authentication (OAuth2, API Key, Basic Auth, JWT)
- Input Schema & Output Schema definitions
- Request translation & HTTP execution
- Response normalization & error handling

### B. Trigger Mechanisms: Polling vs. Webhooks
Automation workflows start via one of two trigger types:
1. **Webhooks (Push)**: The external service sends an HTTP POST request to a unique webhook URL managed by the platform. The platform validates the payload, maps it, and queues execution.
2. **Polling (Pull)**: A background cron/scheduler queries the external API periodically (e.g. every 5 or 15 minutes) with a timestamp cursor (`created_after`). If new records are returned, workflow executions are enqueued.

### C. Data Mapping & Variable Interpolation
Triggers produce JSON output data. Subsequent actions consume input schemas filled with expressions like `{{steps.trigger.email}}` or `{{steps.step_1.output.id}}`.

At runtime, the **Data Mapping Engine**:
1. Resolves all `{{...}}` variable placeholders against the accumulated **Execution Context**.
2. Validates the resolved JSON against the action's `inputSchema`.
3. Passes the clean payload to the connector's `execute()` method.

```
Trigger JSON Output ──► Execution Context ──► Template Resolver ──► Connector Input
```

---

## 3. The 8 Fundamental Core Systems

| System | Responsibility |
|---|---|
| **1. Connector SDK** | Abstract interface and contracts for building triggers and actions |
| **2. Auth Manager** | Secure token storage (encrypted at rest), OAuth authorization flows, and token refresh daemons |
| **3. Workflow Definition** | Storage format (DAG/JSON) representing nodes, edges, configs, and mappings |
| **4. Data Mapping Engine** | Expression resolver for `{{step.field}}` template evaluation |
| **5. Workflow Engine / DAG Runner** | Traverses execution graph, handles conditional branching, and manages step states |
| **6. Queue & Worker Pool** | Redis/BullMQ distributed queue system for executing steps asynchronously with retries |
| **7. Trigger Gateway** | Inbound webhook receiver and polling scheduler engines |
| **8. Observability & Audit Logger** | Stores detailed step inputs, outputs, timestamps, and error traces |

---

## 4. Key Execution Features of Zapier

- **Asynchronous Execution**: Webhook HTTP handlers respond immediately with `200 OK` and push the payload onto a queue. Workers process the pipeline off the main thread.
- **Idempotency**: Retries use idempotency keys (`executionId + stepId`) so duplicate API calls (e.g., Stripe payments) are not executed twice.
- **Exponential Backoff & Retries**: Failed steps are retried with exponential delays and jitter to prevent hammering third-party APIs during outages.
- **Rate Limiting per App**: Requests are throttled per API provider to avoid hitting third-party rate limits.
- **Dynamic Field Fetching**: The UI dynamically queries connector endpoints to populate drop-down fields (e.g., fetching a user's specific Slack channels or Google Sheets).
- **Conditional Branching (Paths)**: Evaluates `IF / ELSE` logic nodes to route execution along different paths of a Directed Acyclic Graph (DAG).
