# Comprehensive Guide: AutoFlow Platform Current Architecture & Features

This document outlines the full architecture, code structure, implemented modules, and technical features of **AutoFlow** (our conversational AI automation platform).

---

## 1. System Overview & Technology Stack

AutoFlow is built as a high-performance **Turbo Monorepo** leveraging Node.js, TypeScript, Express, Next.js 14, MongoDB, and Redis/BullMQ.

```
                    ┌─────────────────────────┐
                    │    Next.js 14 Frontend  │
                    │ (Workflow Canvas & Chat)│
                    └────────────┬────────────┘
                                 │ REST / Socket
                                 ▼
                    ┌─────────────────────────┐
                    │    Express API Server   │
                    │   (apps/backend)        │
                    └────────────┬────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
     ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
     │ MongoDB Atlas │   │ Redis / BullMQ│   │ Connector SDK │
     │  (Database)   │   │(Task Queues)  │   │(55+ Integrat.)│
     └───────────────┘   └───────────────┘   └───────────────┘
```

### Technology Stack
- **Monorepo Manager**: Turbo (`turbo run dev`, `turbo run build`)
- **Backend**: Node.js, TypeScript, Express, Mongoose (MongoDB), BullMQ (Redis), JWT Authentication, Crypto (AES-256 token encryption)
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, Axios
- **Connector Framework**: `@automation/connector-sdk` (TypeScript)
- **AI Engines**: Google Gemini 3.6 Flash / Groq Llama 3.3 & Compound models + Local Smart Conversational Fallback Engine

---

## 2. Directory Structure & Workspace Architecture

```
d:\CODE\AUTOMATIONS
├── apps/
│   ├── backend/                      # Main Express API Server
│   │   ├── src/
│   │   │   ├── config/               # Env, Logger, Database, Constants
│   │   │   ├── infrastructure/       # Redis BullMQ Queue initialization
│   │   │   ├── jobs/                 # Memory extraction background worker
│   │   │   ├── middleware/           # Auth JWT middleware, error handler
│   │   │   ├── modules/
│   │   │   │   ├── auth/             # User register, login, session
│   │   │   │   ├── ai-agent/         # Workflow copilot (Prompt → DAG JSON)
│   │   │   │   ├── whatsapp-agent/   # WA Agent, memory, simulator, webhook
│   │   │   │   ├── workflows/        # Workflow CRUD & execution controller
│   │   │   │   ├── connectors/       # Connector catalog & credential verifier
│   │   │   │   ├── executions/       # Execution logs & history
│   │   │   │   └── dashboard/        # Analytics & system metrics
│   │   │   └── server.ts             # HTTP server bootstrap & worker startup
│   │
│   └── frontend/                     # Next.js 14 Web Application
│       ├── src/
│       │   ├── app/(dashboard)/
│       │   │   ├── dashboard/        # Stats & overview
│       │   │   ├── workflows/        # Canvas builder & workflow manager
│       │   │   ├── ai-agent/         # Natural language workflow copilot
│       │   │   ├── whatsapp-agent/   # In-browser WhatsApp Simulator UI
│       │   │   ├── connectors/       # Integrations catalog & auth setup
│       │   │   ├── executions/       # Real-time execution logs viewer
│       │   │   └── settings/         # User & org settings
│       │   ├── components/           # UI design tokens, Navbar, Sidebar
│       │   └── lib/                  # Axios apiClient & socket client
│
└── packages/
    ├── connector-sdk/                # Standardized Integration SDK
    │   ├── src/
    │   │   ├── core/                 # BaseConnector, ManifestRegistry, StepExecutor, DAGRunner
    │   │   ├── messaging/            # NormalizedMessage, BaseMessagingAdapter, WhatsAppAdapter
    │   │   └── integrations/         # 55+ Connector Manifests & Verification Logic
    │
    ├── database/                     # Shared MongoDB Mongoose Models
    │   ├── src/
    │   │   ├── models/               # User, Org, Workflow, ExecutionLog, WAAutomation, WAConversation, WAMessage, UserMemory
    │   │   └── index.ts              # Model exports & DB connection helper
    │
    └── shared-types/                 # Shared TypeScript interfaces & DTOs
```

---

## 3. Core Working Features & Modules

### 1. Standardized DAG Workflow Engine
- **DAGRunner & StepExecutor**: Traverses node graphs, evaluates inputs, resolves dynamic expressions (`{{node_id.output.field}}`), and runs step tasks.
- **Node Execution Logging**: Records step start times, end times, output data, error traces, and status (`SUCCESS`, `FAILED`, `PENDING`).

### 2. 55+ Enterprise Connectors catalog (`@automation/connector-sdk`)
Supports predefined integration manifests across major services:
- **Schedules & Logic**: Cron Scheduler, Filter/Condition, Code Executor, Delay, Webhook Receiver
- **Google Suite**: Gmail, Google Sheets, Google Drive, Google Calendar
- **Communication & Social**: WhatsApp, Slack, Discord, Telegram, Notion, Email (SMTP)
- **Database & Cloud**: PostgreSQL, MongoDB, MySQL, Firebase, AWS S3
- **Dev & Ops**: GitHub, GitLab, Jira, Trello, Asana
- **E-Commerce & Billing**: Stripe, Shopify, Razorpay, QuickBooks, HubSpot, Salesforce
- **AI Processors**: AI Text Generator, Web Search, Document Summarizer
- **Credential Verification (`ProviderVerifier`)**: Verifies real API credentials (e.g. Gmail OAuth, Slack tokens, Stripe keys) before saving connection records in MongoDB.

### 3. AutoFlow AI Copilot (Prompt → Workflow Generator)
- Converts plain English text prompts into complete, multi-node workflow DAG JSONs.
- Operates in-canvas to allow users to generate, modify, or extend workflow nodes dynamically using Gemini 3.6 Flash / Groq LLMs.

### 4. Human-Like Conversational AI Agent (WhatsApp Agent Module)
- **Channel-Agnostic SDK Layer**: Built on top of `NormalizedMessage` and `BaseMessagingAdapter`. Switching from WhatsApp to Telegram or Slack requires only subclassing `BaseMessagingAdapter`.
- **WhatsAppAdapter**: Normalizes incoming Meta WhatsApp webhooks, formats outbound text replies, and processes GET verification challenges.
- **Layered Prompt Engine**: Combines Agent Personality + Structured User Profile + Long-Term Memory Facts + Conversation History + Current Message.
- **Long-Term Memory Engine**:
  - `UserMemoryModel` tracks user facts and structured profile details per organization and automation.
  - `MemoryExtractionService` runs post-conversation LLM fact extraction with confidence filtering (≥ 0.7) and fallback pattern matching.
- **In-Browser WhatsApp Simulator UI**: Located at `/whatsapp-agent`. Allows testing the full conversation, memory accumulation, and AI reply pipeline directly in the browser with **zero external WhatsApp API keys**.
- **Smart Conversational Fallback Engine**: Multi-tier LLM fallback (`gemini-3.6-flash` → `groq/compound` → `groq/compound-mini` → `Smart Fallback Engine`). Guarantees **100% human-like conversation uptime** even if external LLM API keys hit rate limits or are unconfigured.

---

## 4. Database Schema Summary

| Model | Collection | Purpose |
|---|---|---|
| `UserModel` | `users` | User credentials, role (`admin`/`member`), org reference |
| `OrganizationModel` | `organizations` | Multi-tenant organization boundaries |
| `WorkflowModel` | `workflows` | Workflow DAG definitions, trigger config, nodes, and edges |
| `ConnectionModel` | `connections` | Encrypted third-party API credentials (AES-256) |
| `ExecutionLogModel` | `execution_logs` | Detailed execution history, step statuses, and duration |
| `WhatsAppAutomationModel` | `whatsapp_automations` | WA agent configs, encrypted Meta tokens, personality, access rules |
| `WAConversationModel` | `wa_conversations` | Conversation session state, timeout tracking, message counts |
| `WAMessageModel` | `wa_messages` | Normalized message history (user & agent turns) |
| `UserMemoryModel` | `user_memories` | Long-term memory profile and extracted facts (`key`, `value`, `confidence`) |
