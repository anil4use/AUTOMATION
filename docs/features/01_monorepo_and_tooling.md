# Feature 01: Monorepo & Tooling Architecture

**Status**: `DONE`  
**Related Master Plan Section**: Phase 1 — Core Platform Foundation  
**Related Task ID**: TSK-001  

---

## Overview

The platform is structured as an enterprise TypeScript monorepo managed via **Turborepo** and **NPM Workspaces**. This architecture allows shared code (TypeScript types, database models, connector SDK plugins) to be consumed across applications with strict type safety.

---

## Directory Structure

```
AUTOMATIONS/
├── apps/
│   ├── frontend/         # Next.js 14 App Router UI
│   ├── backend/          # Node.js + Express Modular REST API
│   └── worker/           # Node.js BullMQ Worker Process
├── packages/
│   ├── connector-sdk/    # Plugin SDK for third-party integrations
│   ├── database/         # Centralized Mongoose ODM models
│   ├── shared-types/     # Shared DTOs and DAG contracts
│   └── config/           # Base tsconfig and linter configs
├── turbo.json            # Turborepo task pipeline
├── package.json          # Monorepo root configuration
└── env.example           # Environment template
```

---

## Key Scaffolding Configuration

### Root `package.json`
- Defines `workspaces`: `["apps/*", "packages/*"]`.
- Root scripts for `dev`, `build`, `lint`, and `clean`.

### `turbo.json`
- Defines build pipeline dependency graphs (`dependsOn: ["^build"]`).
- Manages output caching for `.next/**` and `dist/**`.

---

## Verification & Testing Instructions
1. Run `npm install` at root directory to link all packages.
2. Run `npm run build` to compile shared packages before running apps.
