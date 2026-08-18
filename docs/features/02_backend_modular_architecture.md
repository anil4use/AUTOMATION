# Feature 02: Modular Backend Architecture

**Status**: `DONE`  
**Related Master Plan Section**: Phase 1 — Core Platform Foundation  
**Related Task ID**: TSK-002  

---

## Overview

The backend (`apps/backend/src/`) is built on **Node.js, Express, and TypeScript** using a strict **7-layer modular architecture**. Each feature domain lives in its own folder inside `modules/`, ensuring separation of concerns, testability, and clean maintainability.

---

## Module Layout Standard

Each feature module contains exactly:
```
modules/<feature_name>/
├── <feature>.controller.ts   # Express request handlers & HTTP response formatting
├── <feature>.service.ts      # Core business logic
├── <feature>.repository.ts   # Database persistence layer & Mongoose queries
├── <feature>.routes.ts       # Express router definition with middlewares
├── <feature>.validation.ts   # Zod request validation schemas
├── <feature>.types.ts        # Module-specific DTOs & TypeScript interfaces
└── <feature>.model.ts        # Mongoose ODM model reference/definition
```

---

## Active Modules Overview

| Module Name | Purpose | Key Operations |
| :--- | :--- | :--- |
| `auth` | Registration & Authentication | JWT issuing, password hashing (bcrypt), org creation |
| `users` | User & Team Management | Profile fetch/update, org team member list |
| `workflows` | Workflow CRUD & Execution Dispatch | Save/load DAG definition, run workflow |
| `connectors` | Integrations & Credentials | List available SDK connectors, user connected accounts |
| `ai-agent` | AI Prompt-to-Workflow Engine | Natural language prompt → JSON DAG draft |
| `executions` | Execution Logs & Monitoring | View BullMQ execution logs & step outputs |

---

## Global Backend Directories

- **`config/`**: `env.ts`, `database.ts`, `logger.ts`, `constants.ts`
- **`middleware/`**: `auth.middleware.ts`, `error.middleware.ts`, `rate-limit.middleware.ts`, `validation.middleware.ts`
- **`shared/`**: `errors/app.error.ts`, `utils/response.ts`, `utils/pagination.ts`, `types/common.types.ts`
- **`infrastructure/`**: `database/`, `redis/`, `queue/`, `storage/`, `email/`
- **`jobs/`**: `workflow-execution.job.ts`, `notification.job.ts`

---

## Verification & Testing Instructions
1. Run `npm run dev --filter=@automation/backend` to start the server.
2. Endpoint check: `GET http://localhost:5000/health`.
