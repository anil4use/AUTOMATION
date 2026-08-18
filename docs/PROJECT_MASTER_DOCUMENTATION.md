# Automation Platform — Project Master Documentation (Source of Truth)

**Project Name**: AutoFlow AI Automation Platform (Zapier-Style MERN + AI Agent)  
**Architecture**: Monorepo (Turborepo + NPM Workspaces)  
**Primary Stack**: Next.js 14 (Tailwind CSS + Design Tokens), Node.js / Express (TypeScript), BullMQ / Redis, MongoDB Atlas (Mongoose), Groq / Gemini LLM.  
**Master Build Plan**: [Automation_Platform_Master_Build_Plan.docx](file:///d:/CODE/AUTOMATIONS/docs/Automation_Platform_Master_Build_Plan.docx)  
**Master Task Status File**: [TASK_STATUS.md](file:///d:/CODE/AUTOMATIONS/docs/TASK_STATUS.md)

---

## 📌 Context Initialization Guide for New AI Sessions

When starting a new session or task in this repository, the AI agent MUST execute the following initialization workflow:
1. **Read this Master Documentation file** (`docs/PROJECT_MASTER_DOCUMENTATION.md`) to understand the architecture, completed work, and pending items.
2. **Read the Task Status File** (`docs/TASK_STATUS.md`) to verify that all 38 tasks across Phases 0 to 5 are `DONE`.
3. **Read the specific feature documentation** in `docs/features/` before modifying code related to that domain.
4. **Before declaring completion of any new task**:
   - Update `docs/TASK_STATUS.md` and the relevant feature markdown file.
   - Run workspace typecheck/build checks (`npm run test` or `npx tsc --noEmit`).

---

## 🏗️ System Architecture & Directory Structure

```
AUTOMATIONS/
├── apps/
│   ├── frontend/            # Next.js App Router UI (Workflows Table, Start/Stop Toggles, Zapier Canvas, Executions Inspector, Logs Stream)
│   ├── backend/             # Modular Express REST API (7-Layer Architecture + Stripe Billing + Log API)
│   └── worker/              # BullMQ Background Worker Process (DAG Engine + Redis Rate Limiter)
├── packages/
│   ├── connector-sdk/       # Uniform Plugin SDK (10 Multi-App Plugins: AutoFlow Schedule, Gmail, Slack, Sheets, Drive, Notion, Stripe, WhatsApp, Webhooks, AI Node)
│   ├── database/            # Mongoose ODM Models (User, Org, Workflow, Connection, Log, Usage)
│   ├── shared-types/        # Shared DTOs, DAG Contracts & API interfaces
│   └── config/              # Shared tsconfig.base.json & eslint.base.json
├── scripts/
│   └── test-runner.ts       # End-to-End Automated Integration Test Suite (npm run test - 17/17 PASSED)
└── docs/                    # Central Documentation Hub
    ├── Automation_Platform_Master_Build_Plan.docx  # Original Master Spec
    ├── PROJECT_MASTER_DOCUMENTATION.md              # (This File - Source of Truth)
    ├── TASK_STATUS.md                               # Comprehensive Task Status Tracker
    └── features/                                    # Detailed Feature Documentation
```

---

## ⚙️ Workflows Management & Execution Control System

- **Workflows Management Table (`/workflows`)**:
  - Displays all created user workflows with creation date, last execution timestamp, run count, and connected app badges.
  - **Start / Stop (Active / Paused) Toggle Switches**: Instantly activate (`RUNNING`) or stop (`PAUSED`) workflow execution rules.
  - **Action Controls**: ⚡ Start/Stop toggle, 🧪 Test Run trigger, 📄 View Logs link, ✏️ Canvas Edit, and 🗑️ Delete Workflow.
  - **LocalStorage Persistence**: Saving a workflow in the builder canvas (`/workflows/[id]`) persists the workflow and redirects to `/workflows`.

- **Execution Audit Logs & Control (`/executions`)**:
  - Filter logs by status (`ALL`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
  - **Stop Running Job**: Instant cancellation button (`Stop Job`) for running executions.
  - **Detailed Log Inspector**: Modal drawer displaying step-by-step execution payloads and timestamped status logs.

---

## 🧪 Automated Testing & System Log Infrastructure

- **Automated Integration Test Suite (`scripts/test-runner.ts`)**: Run `npm run test` (**17 PASSED | 0 FAILED**).
- **Centralized System Logging (`/logs`)**: Express `/api/v1/logs` log stream API console.

---

## 📂 Feature Documentation Map

| Feature Area | Document File | Description |
| :--- | :--- | :--- |
| **Monorepo & Tooling** | [01_monorepo_and_tooling.md](file:///d:/CODE/AUTOMATIONS/docs/features/01_monorepo_and_tooling.md) | Workspace packages, Turborepo pipeline, tsconfig, Docker setup |
| **Backend Modular System** | [02_backend_modular_architecture.md](file:///d:/CODE/AUTOMATIONS/docs/features/02_backend_modular_architecture.md) | 7-layer architecture, Express routes, controllers, services, repositories, billing, logs |
| **Connector SDK & OAuth Security** | [03_connector_sdk.md](file:///d:/CODE/AUTOMATIONS/docs/features/03_connector_sdk.md) | AES-256 encryption, OAuth2 flows, 10 multi-app connector plugins |
| **BullMQ Worker Engine** | [04_bullmq_worker_engine.md](file:///d:/CODE/AUTOMATIONS/docs/features/04_bullmq_worker_engine.md) | DAG topological runner, step execution, retries, rate limiter |
| **Zapier Next.js UI & Builder** | [05_frontend_nextjs_ui.md](file:///d:/CODE/AUTOMATIONS/docs/features/05_frontend_nextjs_ui.md) | Workflows table, Start/Stop toggles, Zapier vertical builder, Executions inspector |
| **AI Agent Service** | [06_ai_agent_service.md](file:///d:/CODE/AUTOMATIONS/docs/features/06_ai_agent_service.md) | Natural language prompt → Structured JSON DAG generation, clarification loop |
| **Database & Shared Types** | [07_database_and_shared_types.md](file:///d:/CODE/AUTOMATIONS/docs/features/07_database_and_shared_types.md) | Mongoose ODM schemas & TypeScript contracts |
| **Design Tokens & Tailwind** | [08_frontend_design_system_and_tokens.md](file:///d:/CODE/AUTOMATIONS/docs/features/08_frontend_design_system_and_tokens.md) | Zero inline styles, central tokens.ts, Tailwind CSS integration |
