# Feature 05: Next.js Frontend UI & Builder

**Status**: `DONE`  
**Related Master Plan Section**: Phase 1 — Core Platform & Phase 3 Builder  
**Related Task ID**: TSK-005  

---

## Overview

`apps/frontend` is a Next.js 14 App Router web application featuring a glassmorphism dark theme CSS design system, React Flow builder workspace, AI prompt generator bar, and real-time Socket.io status listeners.

---

## Page Route Hierarchy

```
src/app/
├── layout.tsx                # Root layout & global CSS fonts
├── page.tsx                  # High-impact landing page
├── (auth)/
│   ├── login/page.tsx        # Sign-in
│   └── register/page.tsx     # Account registration
└── (dashboard)/
    ├── layout.tsx            # Navbar & Sidebar layout wrapper
    ├── dashboard/page.tsx    # Analytics & recent workflow table
    ├── workflows/
    │   ├── page.tsx          # Workflows list & management
    │   └── [id]/page.tsx     # React Flow DAG Builder canvas
    ├── connectors/page.tsx   # Integration SDK status & OAuth account connections
    ├── executions/page.tsx   # Audit logs & execution detail modal
    ├── ai-agent/page.tsx     # Prompt-to-workflow AI draft generator
    └── settings/page.tsx     # Plan subscriptions & team seats
```

---

## Component Architecture

- **`WorkflowCanvas`**: Interactive canvas for dragging and linking workflow nodes.
- **`NodePalette`**: Sidebar palette of available Connector SDK integrations.
- **`FieldMapper`**: Dynamic parameter configuration & template field mapper.
- **`AIPromptBar`**: Natural language input bar for auto-generating DAG drafts.
- **`Zustand Store` (`src/store/useWorkflowStore.ts`)**: State management for DAG canvas nodes, edges, and selection.

---

## Verification & Testing Instructions
1. Run `npm run dev --filter=@automation/frontend`.
2. Visit `http://localhost:3000/dashboard`.
