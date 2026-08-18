# Automation Platform — Project Master Documentation (Source of Truth)

**Project Name**: Automation Platform (Zapier-Style MERN + AI Agent)  
**Architecture**: Monorepo (Turborepo + NPM Workspaces)  
**Primary Stack**: Next.js 14 (Tailwind CSS + Design Tokens), Node.js / Express (TypeScript), BullMQ / Redis, MongoDB Atlas (Mongoose), Groq / Gemini LLM.  
**Master Build Plan**: [Automation_Platform_Master_Build_Plan.docx](file:///d:/CODE/AUTOMATIONS/docs/Automation_Platform_Master_Build_Plan.docx)  
**Master Task Status File**: [TASK_STATUS.md](file:///d:/CODE/AUTOMATIONS/docs/TASK_STATUS.md)

---

## 📌 Context Initialization Guide for New AI Sessions

When starting a new session or task in this repository, the AI agent MUST execute the following initialization workflow:
1. **Read this Master Documentation file** (`docs/PROJECT_MASTER_DOCUMENTATION.md`) to understand the architecture, completed work, and pending items.
2. **Read the Task Status File** (`docs/TASK_STATUS.md`) to verify that all 38 tasks across Phases 0 to 6 are `DONE`.
3. **Read the specific feature documentation** in `docs/features/` before modifying code related to that domain.
4. **Before declaring completion of any new task**:
   - Update `docs/TASK_STATUS.md` and the relevant feature markdown file.
   - Run workspace typecheck/build checks (`npm run build` or `npx tsc`).

---

## 🏗️ System Architecture Overview

```
AUTOMATIONS/
├── apps/
│   ├── frontend/            # Next.js App Router UI (Tailwind CSS + Design Tokens, React Flow, Socket.io, AI Agent)
│   ├── backend/             # Modular Express REST API (7-Layer Module Architecture + Stripe Billing)
│   └── worker/              # BullMQ Background Worker Process (DAG Engine + Redis Rate Limiter)
├── packages/
│   ├── connector-sdk/       # Uniform Plugin SDK (Gmail, Slack, Sheets, AI Processor Node)
│   ├── database/            # Mongoose ODM Models (User, Org, Workflow, Connection, Log, Usage)
│   ├── shared-types/        # Shared DTOs, DAG Contracts & API interfaces
│   └── config/              # Shared tsconfig.base.json & eslint.base.json
└── docs/                    # Central Documentation Hub
    ├── Automation_Platform_Master_Build_Plan.docx  # Original Master Spec
    ├── PROJECT_MASTER_DOCUMENTATION.md              # (This File - Source of Truth)
    ├── TASK_STATUS.md                               # Comprehensive Task Status Tracker
    └── features/                                    # Detailed Feature Documentation
```

---

## 📊 Phase-by-Phase Implementation Status (100% COMPLETE)

### Phase 0 — Validation & Planning (`100% DONE`)
- All kickoff specs, trigger/action maps, pricing models, and master build plan signed off.

### Phase 1 — Core Platform Foundation (`100% DONE`)
- Monorepo, JWT Auth, Mongoose schemas, React Flow builder UI, BullMQ worker queue, Tailwind CSS design system, and clean 0-error workspace compilation verified.

### Phase 2 — Connector SDK & Integrations (`100% DONE`)
- Reusable plugin SDK, OAuth2 authorization & callback flows for Google/Slack, AES-256 token encryption, API key/webhook auth, field mapping UI, and connector palette.

### Phase 3 — AI Prompt-to-Automation Agent (`100% DONE`)
- Natural language prompt parsing engine (`AIAgentService`), structured JSON DAG generator, DAG validation layer, canvas draft renderer, missing accounts modal trigger, clarification chat loop, and mid-workflow AI Processing Node (`AINodeConnector`).

### Phase 4 — Execution Engine & Reliability (`100% DONE`)
- Topological DAG runner (`DAGRunner`), template variable interpolator, exponential backoff retry handler (`RetryHandler`), Redis rate limiter (`RateLimiter`), real-time Socket.io execution streaming, partial failure step replay, and execution audit logs UI (`/executions`).

### Phase 5 — Business Features & Billing (`100% DONE`)
- MongoDB `UsageModel` counters & team RBAC active. Stripe Test Mode checkout sessions, plan upgrades, usage dashboard meters on `/settings`, and transactional email alerts (`EmailService`).

### Phase 6 — Hardening, Deployment & Launch (`100% DONE`)
- AES-256 secrets encryption active. Multi-tenant data isolation audited (`organizationId` scoping verified across all queries), Docker containerization (`Dockerfile` for frontend, backend, worker, and root `docker-compose.yml`), and workspace health checks verified.

---

## 📂 Feature Documentation Map

| Feature Area | Document File | Description |
| :--- | :--- | :--- |
| **Monorepo & Tooling** | [01_monorepo_and_tooling.md](file:///d:/CODE/AUTOMATIONS/docs/features/01_monorepo_and_tooling.md) | Workspace packages, Turborepo pipeline, tsconfig, Docker setup |
| **Backend Modular System** | [02_backend_modular_architecture.md](file:///d:/CODE/AUTOMATIONS/docs/features/02_backend_modular_architecture.md) | 7-layer architecture, Express routes, controllers, services, repositories, billing |
| **Connector SDK & OAuth Security** | [03_connector_sdk.md](file:///d:/CODE/AUTOMATIONS/docs/features/03_connector_sdk.md) | AES-256 encryption, OAuth2 flows, connector plugin SDK |
| **BullMQ Worker Engine** | [04_bullmq_worker_engine.md](file:///d:/CODE/AUTOMATIONS/docs/features/04_bullmq_worker_engine.md) | DAG topological runner, step execution, retries, rate limiter |
| **Frontend UI & Builder** | [05_frontend_nextjs_ui.md](file:///d:/CODE/AUTOMATIONS/docs/features/05_frontend_nextjs_ui.md) | Next.js App Router, React Flow builder, Socket.io, Settings |
| **AI Agent Service** | [06_ai_agent_service.md](file:///d:/CODE/AUTOMATIONS/docs/features/06_ai_agent_service.md) | Natural language prompt → Structured JSON DAG generation, clarification loop |
| **Database & Shared Types** | [07_database_and_shared_types.md](file:///d:/CODE/AUTOMATIONS/docs/features/07_database_and_shared_types.md) | Mongoose ODM schemas & TypeScript contracts |
| **Design Tokens & Tailwind** | [08_frontend_design_system_and_tokens.md](file:///d:/CODE/AUTOMATIONS/docs/features/08_frontend_design_system_and_tokens.md) | Zero inline styles, central tokens.ts, Tailwind CSS integration |
