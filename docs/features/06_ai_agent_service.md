# Feature 06: AI Conversational Prompt-to-Workflow Agent Service

**Status**: `DONE`  
**Related Master Plan Section**: Phase 3 — AI Prompt-to-Automation Agent  
**Related Task ID**: TSK-006 / Real-vs-Mock AI Upgrade  

---

## Overview

The **AI Agent Service** (`apps/backend/src/modules/ai-agent/`) provides a full conversational AI assistant powered by live **Gemini (`gemini-2.0-flash`)** and **Groq (`openai/gpt-oss-20b`)** LLMs.

It converts plain English requirements into step-by-step AutoFlow visual DAG workflows, verifies user connector authentication in MongoDB Atlas, and persists chat history across user sessions.

---

## Key Capabilities

1. **Conversational Intelligence (No Raw Code Outputs)**:
   - Responds natively to greetings (`hi`, `hello`) and general questions without generating hardcoded fake DAGs.
   - Enforces strict system constraints: **Prohibits raw Python scripts, Airflow code, or external code snippets.** Answers using native AutoFlow platform connectors.

2. **Native AutoFlow Connector Awareness (11 Plugins)**:
   - Knows the 11 registered platform connectors (`autoflow-schedule`, `web-search`, `gmail`, `slack`, `google-sheets`, `google-drive`, `notion`, `stripe`, `whatsapp`, `http-request`, `ai-agent`).
   - If an unsupported service is requested, explains how to build it using native AutoFlow `http-request` or `web-search` steps.

3. **Live MongoDB Connector Verification**:
   - Queries `ConnectionModel` in MongoDB Atlas for the user's organization.
   - Displays live status: ✅ `Connected` vs ⚠️ `Not Connected` with a 1-click **Connect Accounts Now** link.

4. **Auto-Configured Vertical DAG Generation**:
   - Maps requirements to vertical 1-way DAG nodes (`position: { x: 250, y: 80 + idx * 180 }`).
   - Pre-populates all operation IDs, step names, configurations, and template variables (`{{nodes.node_2.output.result}}`).

5. **MongoDB Atlas Chat History Persistence**:
   - `AIChatModel` persists user messages, AI responses, connector checks, and workflow drafts in MongoDB Atlas.
   - API Endpoints:
     - `GET /api/v1/ai-agent/chat-history`: Restores chat stream on page reload.
     - `POST /api/v1/ai-agent/chat`: Processes and saves new chat messages.
     - `DELETE /api/v1/ai-agent/chat-history`: Clears user chat history from database.

6. **Canvas Hydration Integration**:
   - Clicking **"Open Builder Canvas & Activate All Steps"** saves the draft to `localStorage` and navigates to `/workflows/new`.
   - `WorkflowCanvas.tsx` detects the draft and auto-loads all pre-configured steps vertically onto the visual builder canvas.

---

## API Endpoints

- `POST /api/v1/ai-agent/chat` — Process conversational message with LLM & save to MongoDB.
- `GET /api/v1/ai-agent/chat-history` — Fetch user's stored chat stream from MongoDB.
- `DELETE /api/v1/ai-agent/chat-history` — Delete user's chat history in MongoDB.

---

## Verification Commands & Tests

```bash
# Typecheck backend & frontend
npx tsc --noEmit (in apps/backend)
npx tsc --noEmit (in apps/frontend)
```
