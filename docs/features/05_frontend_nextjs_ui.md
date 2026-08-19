# Feature 05: Next.js Frontend UI, Zapier Builder Flow & Dynamic Manifest-Driven Forms

**Status**: `DONE`  
**Related Master Plan Section**: Phase 4 — Next.js Visual DAG Builder & Dynamic Field Mapping  
**Related Task ID**: TSK-005, TSK-027 through TSK-033, Real-vs-Mock Audit Fixes  
**Last Updated**: 2026-08-19  

---

## 🎨 Visual Builder & Dynamic Manifest-Driven Field Form Generator

The visual workflow canvas (`/workflows/[id]`) features a dynamic manifest-driven configuration drawer (`FieldMapper.tsx`) that updates in real time based on the selected connector plugin:

### 1. Dynamic Action / Event Selection (`1. Setup` Tab)
- Dynamically populates the **Action / Event** dropdown from the selected connector's manifest (`CONNECTOR_MANIFESTS`):
  - **Gmail**: `Send Email Notification / Auto-Reply` vs `New Incoming Email Trigger`
  - **Slack**: `Post Channel Message` vs `New Channel Message Trigger`
  - **Google Sheets**: `Append Row to Spreadsheet` vs `New Row Added Trigger`
  - **AI Processor Node**: `Summarize, Auto-Reply & Extract Text with AI`
  - **WhatsApp Business**: `Send WhatsApp Text Message` vs `Inbound Message Trigger`
  - **Web Search & Scraper**: `Search Google / Tavily & Scrape Web Pages`
  - **Notion Workspace**: `Create Database Page Record`
  - **Stripe Payments**: `Payment Checkout Succeeded Trigger` vs `Create Customer`
  - **HTTP Request / Webhook**: `Custom HTTP REST API Call` (POST, GET, PUT, DELETE)

### 2. Dynamic Input Parameter Form Generator (`2. Configure` Tab)
- Automatically renders customized inputs (text inputs, textareas, dropdowns) for EVERY parameter defined in the selected operation manifest.
- **Gmail Send Email**: `To (Recipient Email)`, `Subject`, `Email Body Content / Auto-Reply`
- **Gmail New Email**: `Mailbox Label / Folder` (INBOX/IMPORTANT/STARRED), `Search Filter`
- **Slack Post Message**: `Slack Channel Name or ID`, `Message Payload Text`
- **Google Sheets Append Row**: `Spreadsheet ID`, `Worksheet Name`, `Row Values`
- **AI Processor Node**: `AI System Prompt / Instruction`, `Input Text Variable`
- **WhatsApp**: `Recipient Phone Number`, `Message Content`
- **Web Search**: `Search Query Keyword`
- **Notion**: `Database ID`, `Page Title & Content`
- **HTTP Request**: `HTTP Method`, `Endpoint URL`, `Request Headers`, `Body Payload`

### 3. Clickable Upstream Dynamic Variable Inserter
- Renders clickable pill buttons below input fields (`+ Sender Email`, `+ Subject`, `+ Body Text`, `+ AI Summary Result`, `+ Trigger Time`, `+ Run ID`).
- Appends template variables (`{{nodes.node_trigger.output.sender}}`, `{{nodes.node_ai.output.result}}`) into whichever field is active.

### 4. Real-time Live Node State Synchronization
- Node changes update `selectedNode.data.config`, `selectedNode.data.operationId`, and step labels live in React Flow via `handleUpdateNodeData`.

---

## 🧪 Verification Status

- **Frontend TypeScript check (`npx tsc --noEmit`)**: **0 errors**.
- **Backend TypeScript check (`npx tsc --noEmit`)**: **0 errors**.
- **Integration Test Suite**: **17 PASSED | 0 FAILED**.
