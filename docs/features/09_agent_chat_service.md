# Feature 09: Agent Chat Execution Service & Conversational AI Engine

**Status**: `DONE`  
**Related Master Plan Section**: Phase 6 & Phase 7 — AI Conversational Agent & Real-Time Execution Engine  
**Module Directory**: [`apps/backend/src/modules/agent-chat/`](file:///d:/CODE/AUTOMATIONS/apps/backend/src/modules/agent-chat)  
**Frontend View**: [`apps/frontend/src/app/(dashboard)/agent-chat/page.tsx`](file:///d:/CODE/AUTOMATIONS/apps/frontend/src/app/\(dashboard\)/agent-chat/page.tsx)  

---

## 📌 Overview

The **Agent Chat Execution Service** (`AgentChatService`) is an AI-powered execution environment in AutoFlow. Unlike static prompt-to-workflow tools, the Agent Chat acts as an **interactive autonomous agent** that can directly execute multi-step tool calls across connected SaaS applications, databases, search APIs, and browsers, stream real-time Server-Sent Events (SSE) to the frontend, enforce safety protocols for destructive operations, and convert chat execution plans into visual drag-and-drop workflow DAGs with 1 click.

```
[ User Request ] 
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ POST /api/v1/agent-chat/message (SSE Stream Endpoint)   │
└──────────────────────────┬──────────────────────────────┘
                           │
 1. Check Rate Limits & Concurrency Locks (Upstash Redis)
                           │
 2. Load Active Organization Credentials & Connections
                           │
 3. Two-Tier Connector Context & Manifest Budgeting
                           │
 4. LLM Intent Parser (Gemini 2.0 Flash / Groq LLM)
       │
       ├────────► (Fallback: Universal Dynamic Intent Matcher)
       │
 5. Destructive Operation Detection & Confirmation Shield
       │
       ├──[ Destructive ]──► Emit 'confirmation_required' SSE & Await Approval
       │
       └──[ Safe Plan ]────► 6. Execute Steps & Hydrate Inputs Dynamically
                                    │
                                    ├── Database Connectors (Postgres, Mongo, MySQL, Redis, DynamoDB)
                                    └── SaaS Plugins (Gmail, Slack, Sheets, Notion, GitHub, Web Search)
                                    │
                            7. Synthesize Response & Format Resource Links
                                    │
                            8. Persist Session to MongoDB Atlas (AgentConversationModel)
                                    │
                            9. [Optional] Convert Execution Plan to Visual Canvas DAG Workflow
```

---

## ⚙️ Core Architecture & Operational Pipeline

### 1. Real-Time Server-Sent Events (SSE) Streaming
- **Endpoint**: `POST /api/v1/agent-chat/message`
- Streams structured SSE payloads in real-time (`Content-Type: text-event-stream`) to update the frontend step execution state live.
- **Event Types**:
  - `step_start`: Notifies UI when step execution begins.
  - `step_complete`: Emits output data preview upon step success.
  - `step_error`: Emits error code and message on step failure.
  - `confirmation_required`: Pauses execution for user approval on destructive operations.
  - `final_response`: Sends final AI synthesized Markdown reply with execution outputs.

### 2. Rate Limiting & Concurrency Guard (`Upstash Redis`)
- **Rate Limit**: 10 messages per minute per user.
- **Execution Lock**: Enforces single concurrent execution lock per user (`agent_lock:<userId>` TTL 130s) to prevent race conditions or duplicate parallel executions.

### 3. Two-Tier Connector Context & Token Budgeting
- Dynamically analyzes the user's message using alias keywords (`CONNECTOR_KEYWORD_ALIASES`).
- **Tier 1 (Full Schema Injection)**: If connector keywords match user intent or connected apps count $\le 10$, full manifest actions and input schemas are injected into the system prompt.
- **Tier 2 (Stub Summary)**: For unmatched applications, compact metadata stubs are injected to conserve LLM token budget.

### 4. Intent Parser & Universal Dynamic Fallback
- **Primary Parser (`parseIntentFromLLM`)**: Utilizes `gemini-3.6-flash` or `groq/compound` to generate JSON execution plans (`ExecutionPlan`).
- **Universal Matcher Fallback (`parseUniversalDynamicIntent`)**: If LLM API fails or returns invalid JSON, a heuristic token-scoring engine matches user query intent against active connector actions automatically.

### 5. Destructive Action Confirmation Shield
- Inspects planned actions against dangerous action patterns (`DESTRUCTIVE_KEYWORDS`: *delete, drop, truncate, destroy, flush, purge* and `DESTRUCTIVE_ACTION_IDS`).
- If detected, execution halts, saves pending state in `AgentConversationModel`, and emits a `confirmation_required` SSE event.
- **Confirmation Endpoint**: `POST /api/v1/agent-chat/confirm` allows the user to accept or reject execution.

### 6. Dynamic Input Hydration & Variable Resolution
- Resolves template variables across steps using `{{step_N.output.field}}` or loop variables `{{item.field}}`.
- **`hydrateActionInputs`**: Automatically populates required default inputs (e.g., spreadsheet titles, folder names, database collections, search topics, or default emails) if omitted by the user or LLM.

### 7. Conversational Response Synthesis & Link Formatting
- Synthesizes all step output payloads into a clean, human-readable Markdown report via LLM.
- Auto-extracts generated URL links (e.g., Google Sheet URLs, Google Doc links, web search results) and formats them into clickable Markdown links.

### 8. 1-Click Plan-to-Workflow Conversion
- **Endpoint**: `POST /api/v1/agent-chat/convert-workflow`
- Converts any successful execution plan from a chat message into a fully wired, vertical DAG workflow draft saved to `WorkflowModel` in MongoDB Atlas.
- Generates trigger node (`autoflow-schedule`, `webhook`, or `manual`) and action nodes (`position: { x: 400, y: 80 + idx * 270 }`).

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/agent-chat/message` | SSE streaming endpoint for processing chat prompts & executing actions |
| `POST` | `/api/v1/agent-chat/confirm` | SSE streaming endpoint for confirming/cancelling destructive operations |
| `GET` | `/api/v1/agent-chat/conversations` | List user's conversation history with auto-generated AI titles |
| `GET` | `/api/v1/agent-chat/conversations/:id` | Fetch single conversation details & messages |
| `PATCH` | `/api/v1/agent-chat/conversations/:id/title` | Rename conversation title |
| `DELETE` | `/api/v1/agent-chat/conversations/:id` | Delete conversation and stored message logs |
| `POST` | `/api/v1/agent-chat/convert-workflow` | Convert chat execution plan to visual ReactFlow DAG draft |

---

## 🛠️ Code Location Summary

- **Routes**: [`apps/backend/src/modules/agent-chat/agent-chat.routes.ts`](file:///d:/CODE/AUTOMATIONS/apps/backend/src/modules/agent-chat/agent-chat.routes.ts)
- **Controller**: [`apps/backend/src/modules/agent-chat/agent-chat.controller.ts`](file:///d:/CODE/AUTOMATIONS/apps/backend/src/modules/agent-chat/agent-chat.controller.ts)
- **Service Core**: [`apps/backend/src/modules/agent-chat/agent-chat.service.ts`](file:///d:/CODE/AUTOMATIONS/apps/backend/src/modules/agent-chat/agent-chat.service.ts)
- **Database Model**: [`packages/database/src/models/agent-conversation.model.ts`](file:///d:/CODE/AUTOMATIONS/packages/database/src/models/agent-conversation.model.ts)
- **Frontend UI Component**: [`apps/frontend/src/app/(dashboard)/agent-chat/page.tsx`](file:///d:/CODE/AUTOMATIONS/apps/frontend/src/app/\(dashboard\)/agent-chat/page.tsx)
