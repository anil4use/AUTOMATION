# Automation Platform (Zapier-Style MERN + AI Agent)

An enterprise-grade, AI-native automation platform monorepo engineered with Next.js, Node.js/Express, BullMQ queue workers, and a standardized Connector SDK.

## Monorepo Architecture

```
AUTOMATIONS/
├── apps/
│   ├── frontend/         # Next.js App Router UI (React Flow Canvas, AI Agent, Dashboard)
│   ├── backend/          # Node.js + Express REST API & Socket.io Server
│   └── worker/           # BullMQ Background Worker (DAG Execution Engine)
├── packages/
│   ├── connector-sdk/    # Uniform Integration SDK & Built-in Connectors (Gmail, Slack, Sheets, AI)
│   ├── database/         # Centralized Mongoose Schemas (Users, Workflows, Logs, Connections)
│   ├── shared-types/     # TypeScript contracts, DTOs & DAG Interfaces
│   └── config/           # Shared tsconfig & tooling configs
└── docs/                 # Automation Platform Master Build Plan
```

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment Variables**
   Copy `env.example` to `.env` in the root directory and update credentials.

3. **Run Development Environment**
   ```bash
   npm run dev
   ```

4. **Build All Services**
   ```bash
   npm run build
   ```

## Key Technologies
- **Frontend**: Next.js 14, React 18, React Flow, Zustand, Socket.io Client, CSS Modules / Vanilla CSS Design Tokens
- **Backend API**: Node.js, Express, TypeScript, JWT Auth, AES-256 Crypto, Socket.io
- **Worker & Queue**: BullMQ, Redis (Upstash)
- **Database**: MongoDB Atlas (Mongoose ODM)
- **AI Engine**: Groq / Google Gemini structured JSON output mode
