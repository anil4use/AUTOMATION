# Human-Like WhatsApp Agent Automation — Implementation Plan

## Overview

Build a provider-agnostic, human-like conversational AI agent system that integrates with WhatsApp (Phase 1) and can be extended to Telegram, Slack, Email, and more. The agent maintains long-term memory, conversation context, user profiles, and a configurable personality, making it feel like a real human rather than a chatbot.

The implementation fits **within the existing Turbo monorepo** structure without breaking anything that's already built.

---

## Current Codebase Summary

| Location | What Exists |
|---|---|
| `packages/connector-sdk` | `WhatsAppConnector` — basic send/receive stub, manifest only |
| `packages/database` | MongoDB models: User, Org, Workflow, Connection, AIChat, ExecutionLog |
| `apps/backend/src/modules/ai-agent` | AutoFlow AI Copilot (workflow builder assistant — NOT a conversational agent) |
| `apps/backend/src/modules/connectors` | Connector CRUD, OAuth, API key management |
| `apps/backend/src/infrastructure/queue` | BullMQ + Redis queue (workflow execution) |
| `apps/backend/src/app.ts` | Express app, routes |

> [!IMPORTANT]
> The existing `AIAgentService` is a **workflow-building copilot**, not a conversational agent. We will NOT touch it. The new conversational agent is a completely separate system.

---

## Open Questions

> [!IMPORTANT]
> **WhatsApp API**: The existing `WhatsAppConnector` is a stub. Do you already have a **Meta WhatsApp Business API** token + Phone Number ID, or should the plan use a **simulated/mock webhook** for Phase 1 that can be swapped with real credentials later?

> [!IMPORTANT]
> **LLM for the Agent**: Should the conversational agent use the same Gemini/Groq keys already in `env.ts`, or do you want a specific model (e.g., Claude, GPT-4, Gemini 2.0)?

> [!IMPORTANT]
> **Webhook endpoint**: WhatsApp webhooks need a public HTTPS URL. For development, should we include a `ngrok`/`localtunnel` note, or do you already have a public endpoint?

> [!NOTE]
> **Phase scope for this plan**: We will design **all 6 phases** architecturally so nothing needs to be re-architected later, but only **Phase 1 + Phase 2** will be fully coded (incoming messages → agent response → WhatsApp reply + conversation history + user profile + long-term memory).

---

## Architecture: The Full Picture

```
                    USER (WhatsApp)
                         │
                         ▼
              WhatsApp Webhook (POST /api/v1/wa/webhook)
                         │
                         ▼
            ConnectorAdapter (WhatsApp → NormalizedMessage)
                         │
                         ▼
              AutomationRouter (which automation applies?)
                         │
                         ▼
             ConversationManager (session + history)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         RecentCtx   UserMemory  JourneyState
              │          │          │
              └──────────┼──────────┘
                         ▼
              AgentRuntime (ContextBuilder → LLM → Response)
                         │
                         ▼
            ResponseDelivery → WhatsApp API → USER
                         │
                         ▼
               MemoryExtraction (async, BullMQ job)
```

---

## Proposed Changes

### Package: `packages/database`

New MongoDB models to support agent conversations, memory, profiles, and automations.

#### [NEW] `src/models/wa-conversation.model.ts`
Stores conversation sessions per (automationId + whatsappUserId). Tracks session open/close, last activity, and links to message history.

```ts
{
  automationId: ObjectId,
  channel: 'whatsapp' | 'telegram' | 'slack' | 'email',
  externalUserId: string,        // phone number or platform user ID
  organizationId: ObjectId,
  status: 'active' | 'closed',
  lastMessageAt: Date,
  metadata: Record<string, any>, // platform-specific
}
```

#### [NEW] `src/models/wa-message.model.ts`
Stores individual messages (normalized format) for conversation history retrieval.

```ts
{
  conversationId: ObjectId,
  organizationId: ObjectId,
  role: 'user' | 'agent',
  content: string,
  normalizedMessage: NormalizedMessage, // full platform-agnostic object
  timestamp: Date,
}
```

#### [NEW] `src/models/user-memory.model.ts`
Long-term memory per external user + organization. Stores extracted facts, user profile, preferences.

```ts
{
  organizationId: ObjectId,
  externalUserId: string,           // phone / platform ID
  channel: string,
  profile: {
    name?: string,
    timezone?: string,
    language?: string,
    [key: string]: any,
  },
  longTermMemory: [
    {
      key: string,                  // e.g. "daily_routine.wake_up"
      value: any,
      confidence: number,           // 0–1
      source: 'extracted' | 'explicit',
      createdAt: Date,
      expiresAt?: Date,
    }
  ],
  shortTermSummary?: string,
  updatedAt: Date,
}
```

#### [NEW] `src/models/whatsapp-automation.model.ts`
Stores a user-configured WhatsApp agent automation (one per org or per phone number).

```ts
{
  organizationId: ObjectId,
  name: string,
  enabled: boolean,
  // WhatsApp-specific config
  whatsappPhoneNumberId: string,
  whatsappAccessToken: string,      // encrypted
  verifyToken: string,              // for webhook verification
  // Agent settings
  agentPersonality: string,         // system prompt / personality
  agentModel: 'gemini' | 'groq' | 'openai',
  // Access control (all optional)
  allowedUsers?: string[],          // phone numbers whitelist
  blockedUsers?: string[],
  allowGroupConversations?: boolean,
  // Conversation settings
  conversationTimeoutMinutes?: number,
  maxHistoryMessages?: number,
  // Memory settings
  enableLongTermMemory?: boolean,
  memoryExtractionEnabled?: boolean,
  // Journey (Phase 4)
  journeyId?: ObjectId,
}
```

#### [MODIFY] `src/index.ts`
Export all new models.

---

### Package: `packages/connector-sdk`

Extend the WhatsApp connector with real webhook handling and sending capabilities.

#### [MODIFY] `src/connectors/whatsapp.connector.ts`
- Add `handleWebhook()` method for verifying Meta webhook challenges
- Add real `sendMessage()` using Meta WhatsApp Business API
- Add additional manifest inputs: `verifyToken`, `accessToken`, `phoneNumberId`
- Keep existing `executeAction('send_message')` for workflow use

#### [NEW] `src/messaging/normalized-message.ts`
Platform-agnostic message format — the common interface all connectors normalize to.

```ts
export interface NormalizedMessage {
  channel: 'whatsapp' | 'telegram' | 'slack' | 'email' | 'sms';
  userId: string;           // platform-specific user ID (phone, telegram ID, etc.)
  conversationId: string;   // derived from userId + automationId
  messageId: string;        // platform message ID
  type: 'text' | 'image' | 'audio' | 'document' | 'location';
  content: string;
  timestamp: Date;
  raw: Record<string, any>; // original platform payload
  metadata: Record<string, any>;
}
```

#### [NEW] `src/messaging/base-adapter.ts`
Abstract base class that every connector adapter must implement.

```ts
export abstract class BaseMessagingAdapter {
  abstract channel: string;
  abstract normalize(rawPayload: any): NormalizedMessage;
  abstract send(userId: string, message: string, credentials: any): Promise<void>;
  abstract verifyWebhook(query: any, body: any, credentials: any): boolean | string;
}
```

#### [NEW] `src/messaging/whatsapp-adapter.ts`
WhatsApp-specific implementation of `BaseMessagingAdapter`.

---

### Package: `packages/shared-types`

#### [MODIFY] `src/connector.ts`
Add `NormalizedMessage` and `BaseMessagingAdapter` types/re-exports.

---

### App: `apps/backend`

The bulk of new code lives in the backend, organized into focused new modules.

#### [NEW] `src/modules/whatsapp-agent/` — New module directory

**Files:**

##### `whatsapp-agent.routes.ts`
```
POST /api/v1/wa/webhook/:automationId     → receive messages from WhatsApp
GET  /api/v1/wa/webhook/:automationId     → webhook challenge verification (Meta)
POST /api/v1/wa/automations               → create a new WA automation config
GET  /api/v1/wa/automations               → list automations for org
PUT  /api/v1/wa/automations/:id           → update automation config
DELETE /api/v1/wa/automations/:id         → delete automation
GET  /api/v1/wa/conversations             → list conversations
GET  /api/v1/wa/conversations/:id/messages → get conversation messages
GET  /api/v1/wa/users/:externalUserId/memory → get user memory
```

##### `whatsapp-agent.controller.ts`
Handles HTTP requests, delegates to services.

##### `whatsapp-automation.service.ts`
CRUD for `WhatsAppAutomationModel`. Handles access control checks (allowed/blocked users).

##### `conversation.service.ts`
- `getOrCreateSession(automationId, userId, channel)` — find or open a conversation
- `addMessage(conversationId, role, content, normalizedMessage)` — persist message
- `getHistory(conversationId, limit)` — retrieve recent messages for context

##### `user-memory.service.ts`
- `getUserMemory(orgId, externalUserId, channel)` — get full memory record
- `updateProfile(orgId, externalUserId, channel, updates)` — update structured profile
- `upsertMemoryFact(orgId, externalUserId, channel, key, value)` — add/update a fact
- `buildMemoryContext(memory)` — format memory into LLM-friendly text block

##### `agent-runtime.service.ts`
Core agent logic — assembles the full prompt context and calls the LLM.

```ts
async processIncomingMessage(
  normalizedMessage: NormalizedMessage,
  automation: IWhatsAppAutomation,
  conversation: IWAConversation,
  history: IWAMessage[],
  memory: IUserMemory
): Promise<string>
```

Builds prompt blocks:
- `SYSTEM` — personality from `automation.agentPersonality`
- `USER PROFILE` — from `memory.profile`
- `LONG-TERM MEMORY` — from `memory.longTermMemory`
- `RECENT CONVERSATION` — last N messages from `history`
- `CURRENT MESSAGE` — `normalizedMessage.content`

Calls Gemini or Groq (same pattern as existing `AIAgentService`).

Returns natural language reply string.

##### `memory-extraction.service.ts`
Async service (triggered via BullMQ job after each conversation turn) that:
1. Sends recent conversation to LLM with a memory extraction prompt
2. Parses candidate facts (key/value/confidence)
3. Deduplicates against existing memory
4. Upserts validated facts into `UserMemoryModel`

##### `webhook.handler.ts`
Entry point called by the route:
1. Verify request authenticity (Meta signature)
2. Normalize payload → `NormalizedMessage` via `WhatsAppAdapter`
3. Load automation config, check access control
4. Delegate to `ConversationService` + `AgentRuntimeService`
5. Send reply via `WhatsAppAdapter.send()`
6. Queue memory extraction job

---

#### [NEW] `src/jobs/memory-extraction.job.ts`
BullMQ worker that processes `memory-extraction` queue jobs.

#### [MODIFY] `src/infrastructure/queue/index.ts`
Add `memory-extraction` queue alongside existing `workflow-execution` queue.

#### [MODIFY] `src/app.ts`
Register `whatsapp-agent` routes:
```ts
app.use('/api/v1/wa', whatsappAgentRoutes);
```

#### [MODIFY] `src/config/env.ts`
Add new optional env vars:
```ts
whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v19.0',
```

---

### Frontend: `apps/frontend`

> [!NOTE]
> Phase 1 frontend work is a **management UI** for creating/editing WhatsApp Automations. This is a new page in the existing frontend app.

#### [NEW] WhatsApp Agent page
- List of WhatsApp Automations
- Create/Edit form (phone number ID, access token, personality prompt, allowed users, memory settings)
- Conversation viewer (read-only list of conversations + messages)
- User Memory viewer (see what the agent knows about each user)

---

## Complete Folder Structure (New Files Only)

```
apps/backend/src/
├── modules/
│   └── whatsapp-agent/
│       ├── whatsapp-agent.routes.ts         [NEW]
│       ├── whatsapp-agent.controller.ts     [NEW]
│       ├── whatsapp-automation.service.ts   [NEW]
│       ├── conversation.service.ts          [NEW]
│       ├── user-memory.service.ts           [NEW]
│       ├── agent-runtime.service.ts         [NEW]
│       ├── memory-extraction.service.ts     [NEW]
│       ├── webhook.handler.ts               [NEW]
│       └── whatsapp-agent.types.ts          [NEW]
├── jobs/
│   └── memory-extraction.job.ts            [NEW]
├── config/
│   └── env.ts                              [MODIFY — add 2 vars]
├── infrastructure/
│   └── queue/index.ts                      [MODIFY — add queue]
└── app.ts                                  [MODIFY — add route]

packages/database/src/models/
├── wa-conversation.model.ts                [NEW]
├── wa-message.model.ts                     [NEW]
├── user-memory.model.ts                    [NEW]
└── whatsapp-automation.model.ts            [NEW]

packages/database/src/
└── index.ts                               [MODIFY — export new models]

packages/connector-sdk/src/
├── connectors/
│   └── whatsapp.connector.ts              [MODIFY — add real send/webhook]
├── messaging/
│   ├── normalized-message.ts              [NEW]
│   ├── base-adapter.ts                    [NEW]
│   └── whatsapp-adapter.ts               [NEW]
└── index.ts                               [MODIFY — export messaging layer]
```

---

## Runtime Flow (Phase 1 + 2 Implementation)

```
1. WhatsApp sends POST to /api/v1/wa/webhook/:automationId
2. webhook.handler.ts:
   a. Verify Meta signature
   b. WhatsAppAdapter.normalize(body) → NormalizedMessage
   c. Load automation from DB (WhatsAppAutomationModel)
   d. Check allowed/blocked users → if blocked, return 200 silently
   e. ConversationService.getOrCreateSession()
   f. ConversationService.addMessage(role='user', ...)
   g. ConversationService.getHistory(limit=20)
   h. UserMemoryService.getUserMemory()
   i. AgentRuntimeService.processIncomingMessage()
      → builds full prompt (personality + profile + memory + history + current)
      → calls Gemini / Groq
      → returns reply string
   j. ConversationService.addMessage(role='agent', ...)
   k. WhatsAppAdapter.send(userId, reply)
   l. Queue memory-extraction job (async)
3. BullMQ worker: memory-extraction.job.ts
   a. Sends last 10 messages to LLM with extraction prompt
   b. Validates candidate facts
   c. UserMemoryService.upsertMemoryFact(...)
```

---

## Personality System

The `agentPersonality` field in the automation config is a **free-form system prompt** that the user writes. The `AgentRuntimeService` uses it as the system instruction.

A default personality will be provided as a template:

```
You are a friendly, natural conversational assistant communicating via WhatsApp.
- Keep messages short and conversational (2-4 sentences max).
- Ask one follow-up question at a time.
- Remember what the user told you in previous conversations.
- Never mention that you are an AI unless directly asked.
- Match the user's communication style (casual/formal).
- Use the user's name if you know it.
```

---

## Access Control Logic

All implemented inside `WebhookHandler`, checked before anything else:

| Config field | Behavior |
|---|---|
| `allowedUsers: []` (empty) | All users can interact |
| `allowedUsers: ['+91...', ...]` | Only these numbers can trigger the agent |
| `blockedUsers: ['+91...', ...]` | These numbers are silently ignored |
| `enabled: false` | All messages silently ignored, return 200 |

---

## Memory Extraction Prompt Design

```
You are a memory extraction engine. Read the following WhatsApp conversation and extract any factual, 
useful, long-term information about the user (habits, preferences, schedule, goals, personal details).

Return a JSON array of memory facts:
[
  { "key": "daily_routine.wake_up", "value": "07:00", "confidence": 0.9 },
  { "key": "exercise.preference", "value": "morning", "confidence": 0.8 }
]

Only extract high-confidence, reusable facts. Do NOT extract temporary or context-specific info.
If nothing worth remembering, return: []

CONVERSATION:
[messages here]
```

---

## Phase Roadmap

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | WhatsApp webhook, normalization, conversation history, basic agent response | 🟡 Plan Ready |
| **Phase 2** | User profile, long-term memory, memory extraction job | 🟡 Plan Ready |
| **Phase 3** | Natural follow-up questions, conversation state, topic tracking, personality tuning | 🔵 Designed |
| **Phase 4** | User journeys, information collection flows, structured data extraction | 🔵 Designed |
| **Phase 5** | Personalized responses, behavioral preferences, user-specific rules | 🔵 Designed |
| **Phase 6** | Second connector (Telegram/Slack) using the same core, proving provider-independence | 🔵 Designed |

---

## Verification Plan

### Automated
- TypeScript compilation: `npm run build` across all packages
- No breaking changes to existing modules (existing routes and services untouched)

### Manual Testing (Phase 1)
1. Create a WhatsApp Automation via the new API
2. Send a test POST to `/api/v1/wa/webhook/:automationId` with a mock WhatsApp payload
3. Verify: conversation created in DB, message stored, agent reply generated
4. Send a second message, verify history is included in the agent prompt
5. Test access control: blocked user gets no response

### Manual Testing (Phase 2)
1. After a conversation where user mentions their name and schedule, verify memory extraction job fires
2. Check `UserMemoryModel` contains extracted facts
3. Start a new conversation, verify the agent greets user by name and references their schedule
