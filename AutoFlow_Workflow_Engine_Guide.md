# AutoFlow Master Guide: Complete Workflow Architecture, Lifecycle & Execution Engine

This document provides a comprehensive, end-to-end breakdown of how workflows are created, configured, structured, executed, and monitored within the **AutoFlow** automation platform.

---

## Table of Contents
1. [Workflow Core Concepts & Architecture](#1-workflow-core-concepts--architecture)
2. [Workflow Creation Modes](#2-workflow-creation-modes)
   - [Mode A: AI Copilot & Natural Language Prompt Generator](#mode-a-ai-copilot--natural-language-prompt-generator)
   - [Mode B: Manual Drag-and-Drop Visual Canvas Builder](#mode-b-manual-drag-and-drop-visual-canvas-builder)
   - [Mode C: Starter Templates & Cloned Workflows](#mode-c-starter-templates--cloned-workflows)
3. [Node Anatomy: Step Types & Categories](#3-node-anatomy-step-types--categories)
   - [Triggers (Event Sources)](#triggers-event-sources)
   - [Actions (Third-Party Integrations)](#actions-third-party-integrations)
   - [Logic & Flow Control Nodes](#logic--flow-control-nodes)
   - [AI Agents & LLM Pipeline Nodes](#ai-agents--llm-pipeline-nodes)
4. [The 4-Step Step Setup Drawer Workflow](#4-the-4-step-step-setup-drawer-workflow)
   - [Step 1: App & Event Selection](#step-1-app--event-selection)
   - [Step 2: Account Connection & Authentication](#step-2-account-connection--authentication)
   - [Step 3: Set Up Step (Inputs & Variable Tree Mapping)](#step-3-set-up-step-inputs--variable-tree-mapping)
   - [Step 4: Test Step & Live Output Capture](#step-4-test-step--live-output-capture)
5. [Data Flow, Inputs & Outputs Syntax](#5-data-flow-inputs--outputs-syntax)
   - [The Standard Context Object](#the-standard-context-object)
   - [Variable Interpolation Syntax (`{{...}}`)](#variable-interpolation-syntax-)
   - [System Variables](#system-variables)
6. [Workflow Execution Engine & DAG Execution](#6-workflow-execution-engine--dag-execution)
   - [Topological Sort & Dependency Execution](#topological-sort--dependency-execution)
   - [BullMQ Worker Queue Architecture](#bullmq-worker-queue-architecture)
   - [Error Handling, Retries & DLQ](#error-handling-retries--dlq)
7. [Workflow Lifecycle & Versioning](#7-workflow-lifecycle--versioning)
   - [Draft vs Published Versions](#draft-vs-published-versions)
   - [Execution History & Debugger Logs](#execution-history--debugger-logs)

---

## 1. Workflow Core Concepts & Architecture

At its foundation, an **AutoFlow Workflow** is a Directed Acyclic Graph (**DAG**) of execution nodes. Each node represents either an **Event Source (Trigger)**, an **Operation (Action)**, a **Logic Utility (Filter/Router/Delay)**, or an **AI Agent Step**.

```text
               ┌────────────────────────┐
               │    TRIGGER NODE        │  (Webhook / Polling / Schedule)
               │ (e.g. New Lead in CRM) │
               └───────────┬────────────┘
                           │ Outputs: {{trigger.email}}, {{trigger.name}}
                           ▼
               ┌────────────────────────┐
               │   LOGIC FILTER NODE    │  (If {{trigger.status}} === 'QUALIFIED')
               └───────────┬────────────┘
                           │
                           ▼
               ┌────────────────────────┐
               │      ACTION NODE       │  (Google Sheets: Append Row)
               │  Inputs:               │
               │  Row Data = {{trigger}}│
               └───────────┬────────────┘
                           │ Outputs: {{step_2.output.row_index}}
                           ▼
               ┌────────────────────────┐
               │   AI SUMMARY ACTION    │  (Generate Welcome Message)
               └───────────┬────────────┘
                           │ Outputs: {{step_3.output.summary}}
                           ▼
               ┌────────────────────────┐
               │   NOTIFICATION ACTION  │  (Slack: Send Channel Message)
               └────────────────────────┘
```

### Key Principles
1. **Isolated Execution Context**: Upstream nodes produce JSON output schemas. Downstream nodes consume upstream outputs via variable syntax (`{{step_id.output.field}}`).
2. **Schema Normalization**: Every app connector relies on a universal `inputFields` and `outputFields` manifest contract.
3. **Stateless Scalability**: Workflows are parsed into executable step jobs processed asynchronously by distributed workers.

---

## 2. Workflow Creation Modes

AutoFlow supports **three distinct workflow creation paradigms** to cater to non-technical users, power users, and enterprise automated setups.

### Mode A: AI Copilot & Natural Language Prompt Generator

The **AI Prompt Generator** allows users to describe an end-to-end automation in plain English. The AI engine parses intent, selects appropriate connectors, configures edge handles, and sets up preliminary variable mappings.

```text
User Input Prompt:
"Whenever a new issue is created in GitHub with tag 'urgent', create a task in Jira and post an alert in Slack #alerts."
                                │
                                ▼
                       ┌─────────────────┐
                       │  AI Copilot LLM │
                       └────────┬────────┘
                                │ JSON DAG Schema
                                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ ReactFlow Graph Generated:                                   │
 │ Node 0 (Trigger): GitHub "New Issue Created"                 │
 │ Node 1 (Filter) : Filter "labels contains 'urgent'"          │
 │ Node 2 (Action) : Jira "Create Issue"                        │
 │ Node 3 (Action) : Slack "Send Channel Message"               │
 └──────────────────────────────────────────────────────────────┘
```

#### How AI Workflow Generation Works:
1. **Intent Analysis**: The prompt is processed by the AI Agent using `ConnectorManifestRegistry` as context to pick available triggers and actions.
2. **DAG Construction**: Generates ReactFlow nodes (`id`, `type`, `position`, `data`) and directed edges (`source`, `target`, `sourceHandle`, `targetHandle`).
3. **Auto-Field Mapping**: Generates initial step configuration `inputs` mapped using template interpolation (e.g. `{{trigger.output.title}}`).
4. **Validation & Render**: Pushes the generated JSON to the Visual Builder canvas, opening the workflow in `Draft` state for review.

---

### Mode B: Manual Drag-and-Drop Visual Canvas Builder

The **Visual Canvas Builder** provides full granular control over building workflows visually using ReactFlow.

```text
       ┌──────────────────┐
       │ Connector Sidebar│
       ├──────────────────┤
       │ 🔍 Search Apps   │             REACTFLOW CANVAS
       │ 🟢 Webhooks      │      ┌─────────────────────────────┐
       │ 📧 Gmail         │  ──> │ [ Trigger Node ]           │
       │ 💬 Slack         │      └──────────────┬──────────────┘
       │ 📊 Sheets        │                     │
       │ 🤖 AI Agent      │                     ▼
       └──────────────────┘      ┌─────────────────────────────┐
                                 │ [ Action Node ]             │
                                 └─────────────────────────────┘
```

#### Steps in Visual Construction:
1. **Drag Node to Canvas**: Users drag a trigger, connector action, or logic utility from the sidebar onto the infinite canvas.
2. **Connect Handles (Edges)**: Users draw connection lines between output ports (bottom) and input ports (top) of steps to establish execution sequence.
3. **Configure Step in Drawer**: Clicking any canvas node opens the **Step Setup Drawer** to configure credentials, inputs, and test steps.

---

### Mode C: Starter Templates & Cloned Workflows

1. **Preset Gallery**: Pre-built integration templates (e.g. "Shopify Order ➔ WhatsApp Confirmation", "HubSpot Lead ➔ Google Sheets Sync").
2. **One-Click Clone**: Instantly instantiates a full DAG graph in draft mode, pre-populated with optimal step arrangements and logic structures. Users only need to connect their credentials.

---

## 3. Node Anatomy: Step Types & Categories

Every node on the canvas belongs to one of 4 major step categories:

```text
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                            NODE TYPES                                   │
 ├──────────────┬──────────────────┬───────────────────┬───────────────────┤
 │  TRIGGERS    │     ACTIONS      │   LOGIC UTILITIES │     AI AGENTS     │
 ├──────────────┼──────────────────┼───────────────────┼───────────────────┤
 │ Webhook Catch│ Third-Party APIs │ Filter / Switch   │ Prompt Node       │
 │ Polling Engine│ (Slack, Gmail,   │ Delay / Timer     │ Document Extract  │
 │ Schedule Cron│ CRM, Shopify...) │ Loop / Iterator   │ Text Summarizer   │
 │              │                  │ JavaScript Code   │ Memory Extraction │
 └──────────────┴──────────────────┴───────────────────┴───────────────────┘
```

### Triggers (Event Sources)

Triggers initiate workflow executions when external events occur. A workflow must contain **exactly one Trigger node** at root index 0.

#### 1. Webhook Catch Gateway (Real-Time / Instant)
- **URL Format**: `http://api.autoflow.com/api/v1/webhooks/catch/:webhookId`
- **Execution Mechanism**: When a third-party app (e.g., Stripe, GitHub) POSTs data to this endpoint, AutoFlow immediately extracts headers, query params, and JSON body, enqueuing a workflow execution in real-time ($< 100\text{ms}$).

#### 2. Polling Engine (Scheduled Fetching)
- **Execution Mechanism**: For apps without webhooks, AutoFlow runs a background cron worker (`PollingSchedulerJob`).
- **Cursor Tracking**: Maintains a persistent `cursor` (e.g., `last_updated_at` or `max_id`). On each poll (e.g., every 5 minutes), it queries `GET /items?since={cursor}`. If new records are returned, it triggers one execution per record and updates the cursor.

#### 3. Schedule Timers (Time-Based)
- **Execution Mechanism**: Fires automatically based on user-defined cron expressions or time intervals (e.g., "Every Monday at 9:00 AM").

---

### Actions (Third-Party Integrations)

Actions execute operations against external applications via standard API protocols (REST / OAuth / GraphQL).
- **Manifest-Driven**: AutoFlow relies on **55+ Manifest Definitions** defining available actions (`create_lead`, `send_message`, `append_row`).
- **Dynamic Field Schemas**: Each action defines required and optional `inputFields` rendered dynamically in the drawer interface.

---

### Logic & Flow Control Nodes

Logic nodes control graph execution pathways:
1. **Filter Node**: Evaluates boolean conditions (e.g. `{{trigger.output.total}} > 500`). If condition evaluates to `false`, step execution halts cleanly without marking workflow as failed.
2. **Router / Switch Node**: Directs execution down branch `A`, branch `B`, or branch `C` depending on evaluation rules.
3. **Delay Node**: Pauses execution for a specified duration (seconds, hours, days) using BullMQ delayed queues.
4. **Loop / Iterator Node**: Accepts a JSON array (e.g., `{{trigger.output.items}}`) and executes child steps for each array element.
5. **Code Step (Custom JS)**: Allows running sandbox JavaScript/Node.js snippets to perform custom math, regex transformations, or JSON formatting.

---

### AI Agents & LLM Pipeline Nodes

AI Agent nodes integrate intelligence into workflows:
1. **Prompt Node**: Invokes LLMs (OpenAI, Gemini, Anthropic) with interpolated dynamic context.
2. **Text Summarizer**: Condenses long articles, transcripts, or email threads.
3. **Data Extraction Node**: Converts unstructured plain text/HTML into structured JSON adhering to a specified target schema.
4. **Memory Extraction Service**: Reads workspace conversation buffers to store user preferences and context across automated runs.

---

## 4. The 4-Step Step Setup Drawer Workflow

When configuring any step node on the canvas, AutoFlow forces a reliable **4-Step Wizard Sequence** in the setup drawer:

```text
 ┌─────────────────────────────────────────────────────────────────┐
 │                    STEP SETUP DRAWER WIZARD                     │
 ├──────────────┬──────────────────┬─────────────────┬─────────────┤
 │ TAB 1        │ TAB 2            │ TAB 3           │ TAB 4       │
 │ App & Event  │ Account          │ Set Up Step     │ Test Step   │
 │ (Select App) │ (Auth Credential)│ (Map Inputs)    │ (Run Test)  │
 └──────────────┴──────────────────┴─────────────────┴─────────────┘
```

---

### Step 1: App & Event Selection
- **App Search**: Filter through available apps (Slack, HubSpot, Gmail, OpenAI, etc.).
- **Event Picker**: Select the specific Trigger Event or Action Event (e.g. "Create New Lead").
- **Manifest Load**: System loads the application manifest schema into memory.

---

### Step 2: Account Connection & Authentication
Workflow steps cannot execute without verified authentication credentials.

```text
                       ACCOUNT GATEKEEPER FLOW
 ┌─────────────────────────────────────────────────────────────────┐
 │ Account Selector Dropdown                                       │
 │   - Connected Account 1 (anil@company.com) 🟢                   │
 │   - Connected Account 2 (marketing@company.com) 🟢             │
 │   - [+ Connect New Account...]                                  │
 └────────────────────────────────┬────────────────────────────────┘
                                  │
                  If user clicks [+ Connect New Account]
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
     OAuth 2.0 PKCE Flow                    API Key / Custom Auth
  ┌─────────────────────────┐             ┌─────────────────────────┐
  │ Opens Secure Auth Popup │             │ AccountConnectModal     │
  │ User approves access    │             │ Input API Key/Secret    │
  │ Token saved & encrypted │             │ Credential stored safe  │
  └─────────────────────────┘             └─────────────────────────┘
```

- **Authentication Badge**: Frontend displays live visual feedback:
  - `Connected 🟢`: Valid account credential bound to step.
  - `Connect ⚠️`: Unauthenticated. Step setup remains blocked.
- **Token Refresh Daemon**: Background process automatically checks token expiration and uses refresh tokens to maintain active access seamlessly.

---

### Step 3: Set Up Step (Inputs & Variable Tree Mapping)

This tab renders dynamic input forms based on the selected connector event's `inputFields`.

```text
 dynamic input fields:
 ┌─────────────────────────────────────────────────────────────────┐
 │ Channel Name*:  [ #general                             ]        │
 │                                                                 │
 │ Message Text*:  [ New lead received: {{trigger.output.name}} ]  │
 │                 └──────────────────┬───────────────────────┘    │
 │                                    │                            │
 │                        Visual Variable Tree Picker              │
 │                     ┌────────────────────────────────┐          │
 │                     │ ⚡ Trigger: Webhook Catch       │          │
 │                     │   ├── name: "Anil Kumar"      │          │
 │                     │   ├── email: "anil@test.com"  │          │
 │                     │   └── phone: "+1234567890"    │          │
 │                     └────────────────────────────────┘          │
 └─────────────────────────────────────────────────────────────────┘
```

- **Dynamic Choices API**: If a field depends on live user account data (e.g. dropdown of Slack Channels or Google Drive Folders), frontend invokes `/api/v1/connectors/:appId/choices/:fieldId` using connected credentials.
- **Data Tree Picker (`DataTreePicker.tsx`)**: Allows users to visually click upstream variables to insert template pills into input fields without manual typing.

---

### Step 4: Test Step & Live Output Capture

Before a step can be finalized, users run a **Live Test Execution**:

```text
 ┌─────────────────────────────────────────────────────────────────┐
 │                         TEST STEP TAB                           │
 ├─────────────────────────────────────────────────────────────────┤
 │  [ ▶ Send Test Request to App ]                                 │
 ├─────────────────────────────────────────────────────────────────┤
 │ STATUS: 200 OK (Success 🟢)                                      │
 │ EXECUTION DURATION: 142ms                                       │
 │                                                                 │
 │ OUTPUT PAYLOAD (Captured Output Schema):                        │
 │ {                                                               │
 │   "id": "msg_998124",                                           │
 │   "channel": "C0412345",                                        │
 │   "ts": "1725439890.001",                                       │
 │   "message": { "text": "New lead received: Anil Kumar" }        │
 │ }                                                               │
 └─────────────────────────────────────────────────────────────────┘
```

#### Why Test Step is Critical:
1. **Verifies Credentials**: Confirms third-party API accepts the payload.
2. **Generates Downstream Output Schema**: Captures actual json keys returned by API, making them immediately available as clickable variable pills in subsequent workflow steps!

---

## 5. Data Flow, Inputs & Outputs Syntax

### The Standard Context Object
During execution, the workflow engine maintains a state dictionary containing outputs from every executed node:

```json
{
  "trigger": {
    "event": "webhook_catch",
    "body": {
      "lead_id": "LD-9912",
      "customer_email": "jane.doe@example.com",
      "amount": 1499.00
    },
    "headers": { "user-agent": "Stripe-Hookshot/1.0" }
  },
  "step_1": {
    "status": "SUCCESS",
    "output": {
      "row_number": 42,
      "spreadsheet_id": "1A2b3C4d5E6f"
    }
  },
  "step_2": {
    "status": "SUCCESS",
    "output": {
      "slack_message_ts": "1725439900.002",
      "channel_id": "C998811"
    }
  }
}
```

---

### Variable Interpolation Syntax (`{{...}}`)

When configuring input fields, dynamic values are embedded using double curly braces:

| Variable Template | Execution Resolution | Output Value |
| :--- | :--- | :--- |
| `{{trigger.body.customer_email}}` | Looks up `context.trigger.body.customer_email` | `"jane.doe@example.com"` |
| `{{trigger.body.amount}}` | Looks up `context.trigger.body.amount` | `1499.00` |
| `{{step_1.output.row_number}}` | Looks up `context.step_1.output.row_number` | `42` |
| `Hello {{trigger.body.customer_email}}, your row is {{step_1.output.row_number}}` | Evaluates string template | `"Hello jane.doe@example.com, your row is 42"` |

---

### System Variables
AutoFlow provides globally reserved `{{sys}}` dynamic runtime tokens:

| Token | Description | Example |
| :--- | :--- | :--- |
| `{{sys.timestamp}}` | Current UTC ISO timestamp | `2026-09-04T12:00:00.000Z` |
| `{{sys.execution_id}}` | Unique ID of current workflow run | `exec_8f99a01b` |
| `{{sys.workflow_id}}` | Unique ID of current workflow | `wf_330198` |

---

## 6. Workflow Execution Engine & DAG Execution

The backend **Workflow Execution Engine** processes execution triggers reliably using BullMQ worker pools.

```text
  EVENT TRIGGER (Webhook / Poll / Schedule)
                    │
                    ▼
     ┌─────────────────────────────┐
     │  DAG Graph Parser           │
     │  - Reads Workflow Nodes     │
     │  - Performs Topological Sort│
     └──────────────┬──────────────┘
                    │ Execution Plan (Ordered Batches)
                    ▼
     ┌─────────────────────────────┐
     │ BullMQ Execution Queue      │
     │ (workflow-executions)       │
     └──────────────┬──────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
 ┌───────────┐             ┌───────────┐
 │ Worker 1  │             │ Worker 2  │  (Parallel Node Workers)
 └─────┬─────┘             └─────┬─────┘
       │                         │
       └────────────┬────────────┘
                    │
                    ▼
     ┌─────────────────────────────┐
     │ StepExecutor                │
     │ 1. Resolve Auth Credentials │
     │ 2. Interpolate {{inputs}}   │
     │ 3. Execute Connector API    │
     │ 4. Save Output to MongoDB   │
     └─────────────────────────────┘
```

---

### Topological Sort & Dependency Execution

1. **Graph Analysis**: The `DAGRunner` validates that the ReactFlow graph has no cycles.
2. **Execution Ordering**: Calculates step dependencies. Nodes without dependencies (Root Trigger) run first. Subsequent nodes run as soon as all parent nodes complete successfully.
3. **Branch Parallelism**: If Node 0 splits into Node 1 (Slack) and Node 2 (Email) concurrently, the runner executes both in parallel via worker tasks.

---

### BullMQ Worker Queue Architecture

- **Job Enqueue**: When triggered, a new master job is dispatched to BullMQ.
- **State Locking**: Redis maintains execution state locks to guarantee idempotency and prevent duplicate executions for identical webhook payload IDs.

---

### Error Handling, Retries & DLQ

1. **Exponential Backoff**: If an external API returns transient errors (e.g. HTTP 503, 429 Rate Limit), BullMQ automatically retries the step job up to 5 times with exponential delay ($2^n \times 1000\text{ms}$).
2. **Error Routing Branches**: Workflows can configure explicit `On Error` handles to route execution to a fallback alert branch if a step fails.
3. **Dead Letter Queue (DLQ)**: Hard failures (e.g. 401 Unauthorized, invalid payloads) move to the workspace DLQ for manual inspection and re-replay.

---

## 7. Workflow Lifecycle & Versioning

```text
 ┌──────────────┐         Publish Action        ┌─────────────────┐
 │ Draft (v2)   │ ────────────────────────────> │ Published (v1)  │
 ├──────────────┤                               ├─────────────────┤
 │ Editable     │ <──────────────────────────── │ Live Executions │
 │ Testable     │          New Draft            │ In Production   │
 └──────────────┘                               └─────────────────┘
```

### Draft vs Published Versions

- **Draft Mode**: Active development version. Edits on the canvas alter the draft JSON without disrupting active production automations.
- **Published Mode**: Immutable production version. Incoming webhooks and cron schedules always execute against the latest **Published** graph definition.
- **Publish Action**: Overwrites production pointer to current draft, incrementing major version number (`v1 ➔ v2`).

---

### Execution History & Debugger Logs

Every execution generates a comprehensive audit trail accessible via the dashboard:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION LOG: #exec_881923 (Status: SUCCESS 🟢) - Total Time: 412ms        │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚡ [0ms] TRIGGER: Webhook Catch                                              │
│    Inputs : { headers: {...}, body: { lead_id: "LD-9912" } }               │
│    Outputs: { lead_id: "LD-9912", email: "user@test.com" }                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🟢 [120ms] STEP 1: HubSpot - Find Lead                                      │
│    Inputs : { email: "user@test.com" }                                      │
│    Outputs: { hubspot_id: "HS-5512", score: 85 }                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🟢 [310ms] STEP 2: Slack - Send Alert                                       │
│    Inputs : { channel: "#sales", text: "Lead user@test.com score: 85" }     │
│    Outputs: { message_id: "ts_123456" }                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary Matrix

| Feature | Capabilities & Options |
| :--- | :--- |
| **Creation Methods** | AI Copilot Prompting, Visual Drag-and-Drop Canvas, One-Click Templates |
| **Trigger Types** | Instant Webhook Catch Gateway, Scheduled Polling Engine (Cursor), Cron Timers |
| **Node Types** | Triggers, Actions (55+ Connectors), Logic (Filter, Router, Delay, Loop, Code), AI Agents |
| **Auth Mechanics** | OAuth 2.0 PKCE, API Key, Custom Auth Headers, Automatic Token Refresh Daemon |
| **Data Mapping** | Dynamic Input Forms, Live Choices Dropdown API, `DataTreePicker` Variable Interpolation |
| **Execution Engine**| Topological DAG Runner, BullMQ Task Queues, Redis Idempotency, Exponential Retries |
| **Versioning** | Immutable Published Production vs Sandbox Draft Workspace |

