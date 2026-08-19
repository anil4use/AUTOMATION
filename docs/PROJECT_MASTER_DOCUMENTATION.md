# Automation Platform — Project Master Documentation (Source of Truth)

**Project Name**: AutoFlow AI Automation Platform (Zapier-Style MERN + AI Agent)  
**Architecture**: Monorepo (Turborepo + NPM Workspaces)  
**Primary Stack**: Next.js 14 App Router, Node.js / Express (TypeScript), BullMQ / Redis, MongoDB Atlas (Mongoose), Groq / Gemini LLM.  
**Master Build Plan**: [Automation_Platform_Master_Build_Plan.docx](file:///d:/CODE/AUTOMATIONS/docs/Automation_Platform_Master_Build_Plan.docx)  
**Master Task Status File**: [TASK_STATUS.md](file:///d:/CODE/AUTOMATIONS/docs/TASK_STATUS.md)  
**Last Updated**: 2026-08-19  

---

## 📌 Monorepo & System Architecture

```
AUTOMATIONS/
├── apps/
│   ├── frontend/            # Next.js 14 App Router UI (Workflows, Canvas Builder, Executions, Connectors, AI Agent Chat)
│   ├── backend/             # Modular Express REST API (7-Layer Architecture + Stripe Billing + Log API + MongoDB Atlas)
│   └── worker/              # BullMQ Background Worker Process (DAG Engine + Auto-Credential Resolver + Redis Rate Limiter)
├── packages/
│   ├── connector-sdk/       # 11 Native Multi-App Plugins (Schedule, Web Search, Gmail, Slack, Sheets, Drive, Notion, Stripe, WhatsApp, Webhooks, AI Node)
│   ├── database/            # Mongoose ODM Models (User, Org, Workflow, Connection, Log, Usage, AIChat)
│   ├── shared-types/        # Shared DTOs, DAG Contracts & API interfaces
│   └── config/              # Shared tsconfig.base.json & eslint.base.json
├── scripts/
│   └── test-runner.ts       # End-to-End Automated Integration Test Suite (17/17 PASSED)
└── docs/                    # Central Documentation Hub
    ├── Automation_Platform_Master_Build_Plan.docx  # Original Master Spec
    ├── PROJECT_MASTER_DOCUMENTATION.md              # (This File - Source of Truth)
    ├── TASK_STATUS.md                               # Comprehensive Task Status Tracker
    └── features/                                    # Detailed Feature Documentation
```

---

## ⚙️ Core Platform Systems & Parity

### 1. Real MongoDB Atlas REST API & Auth Parity
- **Authentication**: `POST /api/v1/auth/login` and `POST /api/v1/auth/register` persist real user records in MongoDB Atlas (`users` collection).
- **Session Persistence**: JWT tokens and session metadata are stored in **both HTTP Cookies (`document.cookie`) and LocalStorage**.
- **Route Guard**: Dashboard layout (`layout.tsx`) checks `isLoadingSession` to ensure sessions persist across page refreshes without auto-logout.
- **API Interceptor**: `apiClient` (`api-client.ts`) handles JWT header injection and 401 response auto-cleanup.

### 2. Multi-App Connector SDK & Auto-Configuration (11 Native Plugins)
- **Native Plugins**: `autoflow-schedule`, `web-search`, `gmail`, `slack`, `google-sheets`, `google-drive`, `notion`, `stripe`, `whatsapp`, `http-request`, `ai-agent`.
- **AES-256-CBC Encryption**: `ConnectionModel` stores OAuth and API key credentials encrypted with AES-256-CBC in MongoDB Atlas.
- **Worker Auto-Configuration**: `StepExecutor` automatically fetches and decrypts user credentials from MongoDB by `organizationId`, injects system AI keys for AI steps, and auto-provisions fallbacks so workflow steps execute seamlessly.

### 3. AI Conversational Prompt-to-Workflow Agent (`/ai-agent`)
- **Gemini & Groq LLM Chat**: Powered by `gemini-2.0-flash` and Groq `openai/gpt-oss-20b`. Answers user queries in rich text without outputting raw Python code.
- **Native Connector Awareness**: Recommends platform connectors and verifies active user connections in MongoDB Atlas (✅ `Connected` vs ⚠️ `Not Connected`).
- **Vertical DAG Generation**: Generates structured 1-way DAG drafts with pre-configured step operations and variable mappings (`{{nodes.node_2.output.result}}`).
- **Canvas Hydration**: Clicking **"Open Builder Canvas & Activate All Steps"** auto-loads all generated DAG steps vertically onto the visual builder canvas (`/workflows/new`).
- **MongoDB Atlas Chat History**: `AIChatModel` persists user messages, AI responses, and drafts in MongoDB Atlas (`GET/POST/DELETE /api/v1/ai-agent/chat-history`).

---

## 📂 Feature Documentation Map

| Feature Area | Document File | Description |
| :--- | :--- | :--- |
| **Monorepo & Tooling** | [01_monorepo_and_tooling.md](file:///d:/CODE/AUTOMATIONS/docs/features/01_monorepo_and_tooling.md) | Workspace packages, Turborepo pipeline, tsconfig, Docker setup |
| **Backend Modular System** | [02_backend_modular_architecture.md](file:///d:/CODE/AUTOMATIONS/docs/features/02_backend_modular_architecture.md) | 7-layer architecture, Express routes, controllers, services, repositories |
| **Connector SDK & Security** | [03_connector_sdk.md](file:///d:/CODE/AUTOMATIONS/docs/features/03_connector_sdk.md) | AES-256 encryption, 11 native connector plugins, worker auto-configuration |
| **BullMQ Worker Engine** | [04_bullmq_worker_engine.md](file:///d:/CODE/AUTOMATIONS/docs/features/04_bullmq_worker_engine.md) | DAG topological runner, step execution, retries, rate limiter |
| **Zapier Next.js UI & Builder** | [05_frontend_nextjs_ui.md](file:///d:/CODE/AUTOMATIONS/docs/features/05_frontend_nextjs_ui.md) | Next.js 14 App Router, visual DAG builder, canvas draft loader, executions inspector |
| **AI Agent Service** | [06_ai_agent_service.md](file:///d:/CODE/AUTOMATIONS/docs/features/06_ai_agent_service.md) | Gemini/Groq LLM chat, connector checks, vertical DAG generation, MongoDB chat history |
| **Database & Shared Types** | [07_database_and_shared_types.md](file:///d:/CODE/AUTOMATIONS/docs/features/07_database_and_shared_types.md) | Mongoose ODM schemas (`AIChatModel`) & TypeScript contracts |
| **Design Tokens & Tailwind** | [08_frontend_design_system_and_tokens.md](file:///d:/CODE/AUTOMATIONS/docs/features/08_frontend_design_system_and_tokens.md) | Central design tokens (`tokens.ts`) & Tailwind CSS styling |
