# Feature 08: Frontend Design Tokens, Theme Architecture & UI Rules

**Status**: `DONE`  
**Related Reference**: `D:\aripra_projects\taslim\car-daddys-crm\frontend-next` (CLAUDE.md & STRUCTURE.md)  
**Related Task ID**: TSK-013  
**Implementation Date**: 2026-08-18  

---

## 📌 Strict Frontend Rules (Mandatory)

1. **NO INLINE STYLES**: Components MUST NOT use inline `style={{ ... }}` objects anywhere in JSX.
2. **ZERO HARDCODED HEX / PX VALUES**: Every color, font size, spacing, border radius, and shadow MUST reference design tokens or Tailwind CSS token utilities.
3. **SINGLE SOURCE OF TRUTH DESIGN TOKENS**:
   - `src/styles/theme.css`: Raw `:root` CSS custom properties (`--af-*`).
   - `src/styles/tokens.ts`: TypeScript token reference object.
   - `tailwind.config.ts`: Configured with theme variables from `tokens.ts`.
4. **REUSABLE ATOMIC UI PRIMITIVES (`src/components/ui/`)**:
   - Always import UI primitives (`Button`, `Heading`, `Text`, `Badge`, `SectionCard`) from `@/components/ui`.
5. **FEATURE FOLDER PRIVATE SUB-COMPONENTS (`_components/`)**:
   - Feature sub-components inside `_components/` are private to that feature domain and must NOT be imported by other features.

---

## File Architecture (`apps/frontend/src/`)

```
src/
├── app/                  # Next.js App Router (auth & dashboard routes)
├── components/
│   ├── layout/           # App-level structural components (Navbar, Sidebar)
│   ├── builder/          # Workflow canvas builder components
│   ├── ai/               # AI prompt bar
│   ├── dashboard/        # Stat cards & tables
│   └── ui/               # Reusable UI primitives (Button, Heading, Text, Badge, SectionCard, index.ts)
├── styles/
│   ├── theme.css         # Designer's raw CSS custom properties (:root vars)
│   ├── tokens.ts         # TypeScript token reference object
│   └── globals.css       # Tailwind directives & token class helpers (.glass-card, .glow-button)
├── lib/
│   ├── utils.ts          # cn() Tailwind class merging helper (clsx + tailwind-merge)
│   └── api-client.ts     # Axios API client
└── store/
    └── useWorkflowStore.ts # Zustand workflow state
```

---

## Verification & Testing Instructions
1. Run `npm run build` at monorepo root.
2. Verify zero TypeScript errors and zero inline CSS usage.
