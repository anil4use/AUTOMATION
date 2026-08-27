# Automation Platform — Project Master Documentation (Source of Truth)

**Project Name**: AutoFlow AI Automation Platform (Zapier-Style MERN + AI Agent)  
**Architecture**: Monorepo (Turborepo + NPM Workspaces)  
**Primary Stack**: Next.js 14 App Router, Node.js / Express (TypeScript), BullMQ / Redis, MongoDB Atlas (Mongoose), Groq / Gemini LLM.  
**Master Build Plan**: [Automation_Platform_Master_Build_Plan.docx](file:///d:/CODE/AUTOMATIONS/docs/Automation_Platform_Master_Build_Plan.docx)  
**Master Integration Roadmap**: [MASTER_INTEGRATION_ROADMAP.md](file:///d:/CODE/AUTOMATIONS/docs/MASTER_INTEGRATION_ROADMAP.md)  
**System Diagnostics & Roadmap**: [SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md](file:///d:/CODE/AUTOMATIONS/docs/SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md)  
**Master Task Status File**: [TASK_STATUS.md](file:///d:/CODE/AUTOMATIONS/docs/TASK_STATUS.md)  
**Last Updated**: 2026-08-27  

---

## 📌 Monorepo & System Architecture

```
AUTOMATIONS/
├── apps/
│   ├── frontend/            # Next.js 14 App Router UI (Workflows, Canvas Builder, Co-Pilot, Executions, Connectors, AI Agent Chat)
│   ├── backend/             # Modular Express REST API (7-Layer Architecture + AI Co-Pilot API + MongoDB Atlas)
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
    ├── SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md       # Diagnostic Health & Roadmap
    ├── PROJECT_MASTER_DOCUMENTATION.md              # (This File - Source of Truth)
    ├── TASK_STATUS.md                               # Comprehensive Task Status Tracker
    └── features/                                    # Detailed Feature Documentation
```

---

## ⚙️ Core Platform Systems & Advanced Features

### 1. In-Canvas AI Co-Pilot Assistant (`/workflows/[id]`)
- **Live Canvas State Mutation**: Interactive AI assistant sidebar allowing real-time prompt-driven step additions, step deletions, parameter updates (schedules, sheet names, search queries), and edge re-wiring directly on the visual ReactFlow canvas.
- **Dynamic AI Suggestions**: Generates context-aware suggestion chips based on the live workflow state (`📊 Change Sheet to "Anil_dev"`, `⏱️ Change Schedule to Hourly`).
- **Co-Pilot REST Endpoint**: `POST /v1/ai-agent/copilot` processes canvas nodes/edges with Gemini 2.0 Flash / Groq LLMs and returns updated canvas JSON + mutation summary badges.

### 2. Fully Dynamic LLM Workflow Compiler
- **100% Dynamic Prompt Pipeline**: Replaced static regex rules with LLM JSON compilation (`DYNAMIC_WORKFLOW_SYSTEM_PROMPT`). Compiles custom search queries, spreadsheet names, AI prompts, and variable interpolation templates for any user workflow request.

### 3. Debounced Auto-Save Draft Engine
- **Zero-Data-Loss Architecture**: Automatically syncs canvas modifications to MongoDB Atlas (`PUT /v1/workflows/:id`) and `localStorage` after a 1.5-second debounce timeout.
- **Header Status Badge**: Live visual indicator in the builder header (`🟡 Saving Draft...` $\rightarrow$ `🟢 Draft Auto-Saved (07:11 PM)`).

### 4. Live 1-Second Countdown Ticker (`Workflows Page`)
- **`LiveNextExecutionCountdown`**: Real-time ticking 1-second countdown badge (`⏱️ 38m : 57s`) for hourly, interval, and daily target schedules.
- **Status Aware**: Displays `⚡ Triggering now...` when countdown reaches zero, and `⏸️ Paused` for inactive workflows.

### 5. Native Web Search & Scraper SDK (`WebSearchConnector`)
- **Native Platform Connector**: Integrates live Tavily API searching (`search_web`), DuckDuckGo web scraping fallback, and live URL text extraction (`scrape_url`) with zero user API key setup required (`authType: 'none'`).

### 6. Google Sheets 400 Range Repair & Tab Auto-Creation
- **Automatic Worksheet Creation**: Catches `400 Bad Request: Unable to parse range` errors (e.g. missing `JobListings` tab), issues a `batchUpdate` `addSheet` request to create the worksheet tab dynamically, and retries append operations cleanly.

---

## 📂 Feature Documentation Map

| Feature Area | Document File | Description |
| :--- | :--- | :--- |
| **System Diagnostics & Roadmap** | [SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md](file:///d:/CODE/AUTOMATIONS/docs/SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md) | Architectural audit, scalability diagnosis, and feature roadmap |
| **Monorepo & Tooling** | [01_monorepo_and_tooling.md](file:///d:/CODE/AUTOMATIONS/docs/features/01_monorepo_and_tooling.md) | Workspace packages, Turborepo pipeline, tsconfig, Docker setup |
| **Backend Modular System** | [02_backend_modular_architecture.md](file:///d:/CODE/AUTOMATIONS/docs/features/02_backend_modular_architecture.md) | 7-layer architecture, Express routes, controllers, services, repositories |
| **Connector SDK & Security** | [03_connector_sdk.md](file:///d:/CODE/AUTOMATIONS/docs/features/03_connector_sdk.md) | AES-256 encryption, 11 native connector plugins, worker auto-configuration |
| **BullMQ Worker Engine** | [04_bullmq_worker_engine.md](file:///d:/CODE/AUTOMATIONS/docs/features/04_bullmq_worker_engine.md) | DAG topological runner, step execution, retries, rate limiter |
| **Zapier Next.js UI & Builder** | [05_frontend_nextjs_ui.md](file:///d:/CODE/AUTOMATIONS/docs/features/05_frontend_nextjs_ui.md) | Next.js 14 App Router, visual DAG builder, canvas draft loader, executions inspector |
| **AI Agent & Co-Pilot** | [06_ai_agent_service.md](file:///d:/CODE/AUTOMATIONS/docs/features/06_ai_agent_service.md) | Gemini/Groq LLM chat, in-canvas AI Co-Pilot assistant, vertical DAG compiler |
| **Database & Shared Types** | [07_database_and_shared_types.md](file:///d:/CODE/AUTOMATIONS/docs/features/07_database_and_shared_types.md) | Mongoose ODM schemas (`AIChatModel`) & TypeScript contracts |
| **Design Tokens & Tailwind** | [08_frontend_design_system_and_tokens.md](file:///d:/CODE/AUTOMATIONS/docs/features/08_frontend_design_system_and_tokens.md) | Central design tokens (`tokens.ts`) & Tailwind CSS styling |
