# Feature 04: BullMQ Background Worker Engine

**Status**: `DONE`  
**Related Master Plan Section**: Phase 4 — Execution Engine & Reliability  
**Related Task ID**: TSK-004  

---

## Overview

`apps/worker` is an independent Node.js background process that listens to the BullMQ queue (`workflow-execution-queue`) backed by Upstash Redis. It executes workflows node-by-node in topological order and persists step outputs to MongoDB execution logs.

---

## Key Modules

- **`DAGRunner` (`src/engine/dag-runner.ts`)**: Evaluates DAG nodes in dependency order.
- **`StepExecutor` (`src/engine/step-executor.ts`)**: Resolves template variables (`{{nodes.trigger_1.output.body}}`) and delegates step execution to `packages/connector-sdk`.
- **`RetryHandler` (`src/engine/retry-handler.ts`)**: Handles exponential backoff retries (1s → 5s → 20s) on API failures.
- **`WorkflowProcessor` (`src/processors/workflow.processor.ts`)**: BullMQ job consumer updating MongoDB `ExecutionLog` status (`running` → `completed` / `failed`).

---

## Verification & Testing Instructions
1. Run local Redis or configure Upstash Redis URL in `.env`.
2. Start worker: `npm run dev --filter=@automation/worker`.
