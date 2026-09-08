# Automation Platform — Project Master Documentation (Source of Truth)

**Project Name**: AutoFlow AI Automation Platform (Zapier-Style MERN + AI Agent)  
**Architecture**: Domain-Driven Design (DDD) Monorepo (Turborepo + NPM Workspaces + 14 Packages)  
**Primary Stack**: Next.js 14 App Router, Express REST Gateway (`apps/api`), BullMQ Worker (`apps/worker`), Scheduler Service (`apps/scheduler`), Webhook Ingestion Service (`apps/webhook`), Node.js Backend (`apps/backend`), MongoDB Atlas (Mongoose), Upstash Redis, Groq / Gemini LLM.  
**Master Integration Roadmap**: [MASTER_INTEGRATION_ROADMAP.md](file:///d:/CODE/AUTOMATIONS/docs/MASTER_INTEGRATION_ROADMAP.md)  
**Database Architecture Guide**: [DATABASE_CONNECTOR_ARCHITECTURE_GUIDE.md](file:///d:/CODE/AUTOMATIONS/docs/DATABASE_CONNECTOR_ARCHITECTURE_GUIDE.md)  
**Master Task Status File**: [TASK_STATUS.md](file:///d:/CODE/AUTOMATIONS/docs/TASK_STATUS.md)  
**Last Updated**: 2026-09-08  

---

## 📌 Monorepo & System Architecture (14 Workspace Packages)

```
AUTOMATIONS/
├── apps/
│   ├── frontend/            # Next.js 14 App Router UI (Workflows, Canvas Builder, Co-Pilot, Executions, Connectors)
│   ├── api/                 # Thin Express REST API Gateway (Decoupled Use Cases)
│   ├── backend/             # Enterprise Modular Express Backend (Connectors, OAuth, Verification)
│   ├── worker/              # BullMQ Background Execution Worker (DAG Execution Engine)
│   ├── scheduler/           # Dedicated Polling, Cron & OAuth Renewal Daemon
│   └── webhook/             # High-Throughput Incoming Webhook Ingestion Service
├── packages/
│   ├── domain/              # Pure Domain Entities & Business Logic (Zero Third-Party Dependencies)
│   ├── events/              # Event Bus & Pub/Sub Domain Event System
│   ├── observability/       # Structured Logger, Context Tracer & Diagnostics Metrics
│   ├── workflow-engine/     # Isolated DAG Topological Execution Engine & Step Executor
│   ├── connector-sdk/       # Multi-App Plugin SDK, Database Drivers, Pool Lifecycle & Provider Verification
│   ├── connectors/          # 62 Categorized Manifests & Modular Connector Actions/Triggers
│   ├── application/         # Decoupled Use Cases (CreateWorkflowUseCase, ExecuteWorkflowUseCase)
│   ├── database/            # Mongoose ODM Models (User, Org, Workflow, Connection, Log, AIChat)
│   └── shared-types/        # Shared DTOs, Manifest Schemas & API Interfaces
└── docs/                    # Central Documentation Hub
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

### 6. Full-Power 62-Connector Suite & Dynamic Manifest System
- **62 Platform Connectors**: Exposes 317 actions and 119 triggers across SaaS, AI, Cloud, Storage, and Database integrations.
- **Dynamic Choices API**: Provides cached choices (`GET /v1/connectors/choices/:appId/:fieldId`) with a 5-minute Redis TTL for dynamic workspace items (Slack channels, Gmail labels, GitHub repositories, DB tables).

### 7. Enterprise Database Connector Subsystem (Full Flexibility Protocol)
- **10 Database Engines Supported**: PostgreSQL, MySQL, MongoDB, Redis, DynamoDB, SQL Server (MSSQL), Supabase, PlanetScale, Neon Postgres, SQLite.
- **6 Connection Methods**: Individual Host Fields, Connection URI/String, SSH Tunnel Forwarding, SSL/TLS Certificates, Unix Domain Sockets, Read Replicas.
- **Dialect-Aware Parameterizer (`query-sanitizer.ts`)**: Auto-translates `{{variable.path}}` parameters into dialect placeholders (`$1, $2` for PostgreSQL; `?` for MySQL; `@p1, @p2` for SQL Server).
- **Automated `LIMIT` Capper**: Enforces default 10,000 row ceiling (max 50,000) on SQL queries to prevent worker memory exhaustion.
- **Statement Guard (`allowedStatements`)**: Enforces operation safety (e.g. restricting read-only connections to `SELECT` operations only).
- **Dynamic SSH Tunnel Management**: Port allocation (`15000-25000`), cap of 20 tunnels, and automatic lifecycle binding to connection pool.
- **In-Memory Connection Pooling**: Singleton `poolMap` with 10-minute idle eviction sweeper and `destroyPool()` on credential update/deletion.
- **Production Protection Locks**: Production environment tag (`environmentTag === 'production'`) blocks destructive operations like Redis `FLUSHDB` or SQL `DROP`.
- **Pre-Save Verification Protocol**: All database connections require a successful live ping test (`POST /v1/connectors/test-connection`) before saving to database.

---

## 📂 Feature Documentation Map

| Feature Area | Document File | Description |
| :--- | :--- | :--- |
| **Database Connector Architecture** | [DATABASE_CONNECTOR_ARCHITECTURE_GUIDE.md](file:///d:/CODE/AUTOMATIONS/docs/DATABASE_CONNECTOR_ARCHITECTURE_GUIDE.md) | Full guide for DB engines, SSH tunnels, pooling, parameterization & security |
| **System Diagnostics & Roadmap** | [SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md](file:///d:/CODE/AUTOMATIONS/docs/SYSTEM_DIAGNOSTICS_AND_IMPROVEMENTS.md) | Architectural audit, scalability diagnosis, and feature roadmap |
| **Master Task Status** | [TASK_STATUS.md](file:///d:/CODE/AUTOMATIONS/docs/TASK_STATUS.md) | Comprehensive task tracker across all 10 implementation phases (72/72 tasks) |
