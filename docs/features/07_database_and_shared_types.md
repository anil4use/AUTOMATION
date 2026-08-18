# Feature 07: Database Layer & Shared Types

**Status**: `DONE`  
**Related Master Plan Section**: Phase 1 — Core Platform Foundation  
**Related Task ID**: TSK-007  

---

## Overview

Centralized data management is divided into two packages:
- **`packages/database`**: Mongoose ODM schemas for MongoDB Atlas.
- **`packages/shared-types`**: TypeScript DTOs, DAG Node/Edge contracts, API request/response structures.

---

## ODM Schemas Overview (`packages/database`)

- **`User`**: System users (`email`, `passwordHash`, `name`, `organizationId`, `role`).
- **`Organization`**: Multi-tenant organizations (`name`, `slug`, `plan`, `stripeCustomerId`).
- **`Workflow`**: DAG definitions (`name`, `status`, `definition: { nodes, edges }`, `isAiGenerated`).
- **`Connection`**: Integration credentials (`connectorId`, `authType`, `encryptedCredentials`).
- **`ExecutionLog`**: BullMQ run logs (`workflowId`, `status`, `triggerPayload`, `nodeResults`, `error`).
- **`Usage`**: Metering counters (`period`, `taskExecutionsCount`, `aiGenerationsCount`).

---

## Verification & Testing Instructions
1. Run `npm run build --filter=@automation/shared-types --filter=@automation/database`.
