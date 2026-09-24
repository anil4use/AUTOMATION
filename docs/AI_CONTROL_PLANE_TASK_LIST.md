# AI Control Plane - Implementation Task List

This document tracks the progress of the AI Control Plane implementation, migrating hardcoded prompts and model configurations to a centralized, dynamic orchestration layer.

## Phase 1: Database & Seed Script
- [x] 1.1 Create Mongoose schemas for `AIProvider`, `AIModel`, `AIPrompt`, `AITaskConfig`, and `AIExecutionLog` in `@automation/database`.
- [x] 1.2 Export schemas from the `@automation/database` index.
- [x] 1.3 Create a database seeder script to populate default providers (Gemini, Groq), models (`gemini-2.0-flash`, etc.), initial task configurations, and the existing hardcoded prompts into the `AIPrompt` collection.

## Phase 2: Core Backend Engine (`AIRuntime`)
- [x] 2.1 Create `AIRuntimeService` class in the backend.
- [x] 2.2 Implement dynamic prompt resolution (fetching prompt by feature & task, rendering Handlebars variables).
- [x] 2.3 Implement the Provider Adapters (Gemini Adapter, Groq Adapter, OpenAI Adapter).
- [x] 2.4 Implement dynamic routing (fallback mechanisms, capability matching).
- [x] 2.5 Implement execution logging (storing `AIExecutionLog` records).

## Phase 3: Backend API Controllers
- [x] 3.1 Create REST API routes and controllers for managing AI Providers and Models.
- [x] 3.2 Create REST API routes and controllers for managing AI Prompts and Versions.
- [x] 3.3 Create REST API routes and controllers for managing AI Task Configs.

## Phase 4: Refactoring Existing AI Agents
- [x] 4.1 Refactor `AgentChatService` (Execution Planner, Result Synthesizer) to use `AIRuntimeService`.
- [x] 4.2 Refactor `AIAgentService` (AI Co-Pilot Workflow Compiler, Canvas Mutator) to use `AIRuntimeService`.
- [x] 4.3 Refactor `AI Data Bridge` prompt builders to use `AIRuntimeService`.
- [x] 4.4 Refactor `whatsapp-agent` (Conversational Engine) to use `AIRuntimeService`.

## Phase 5: Frontend AI Control Center
- [x] 5.1 Create AI Control Center layout and sidebar navigation.
- [x] 5.2 Build Providers & Models management UI.
- [x] 5.3 Build Prompts & Versions editor UI (with Handlebars variable testing).
- [x] 5.4 Build AI Tasks & Routing configuration UI.
- [x] 5.5 Build Execution Logs / Observability viewer.

---
*Last Updated: Initializing Task List*
