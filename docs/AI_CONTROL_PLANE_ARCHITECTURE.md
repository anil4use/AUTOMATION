# AI Control Plane Architecture (Universal Orchestration Layer)

This document outlines the architecture for the **AI Control Plane**, a centralized routing and configuration system that decouples AI features from specific models or providers. This design ensures that any feature, task, and prompt can be dynamically mapped to any AI provider or model without modifying application code.

## The Core Philosophy: Separation of Concerns
Instead of hardcoding `Prompt → Gemini` in application services, the architecture enforces a strict abstraction hierarchy:
`Feature → AI Task → Prompt + Config → Routing → Model → Provider`

This ensures full operational freedom to switch from Gemini to Claude or Groq for any specific background agent on the fly, keeping the task contract separate from the model selection.

---

## 5-Layer Architectural Stack

### Layer 1: AI Providers (`ai_providers` collection)
Defines the connection parameters for various LLM platforms.
* **Fields:** Provider Name, Base URL, Credentials (encrypted API Keys), Enabled Status, Connection Status.
* **Examples:** `Gemini`, `Groq`, `OpenAI`, `Anthropic`, `Mistral`, `Ollama`, `Azure OpenAI`.

### Layer 2: Model Registry (`ai_models` collection)
Defines specific models belonging to providers and their unique capabilities.
* **Fields:** Provider ID, Model ID (e.g., `gemini-3.6-flash`, `llama-3.3-70b-versatile`), Context Window Size.
* **Capabilities (Booleans):** `supportsTools`, `supportsJson`, `supportsVision`, `supportsStreaming`, `supportsReasoning`.
* **Config:** Input/Output Cost, Enabled Status, Priority/Speed Tier.

### Layer 3: Prompt Library (`ai_prompts` collection)
A provider-agnostic registry of prompt templates and instructions.
* **Fields:** Prompt Key, Feature (e.g., `agent-chat`), Type (`system`, `user`), Template (Handlebars/Mustache format), Variables, Rules, Output Schema.
* **Version Control:** Supports `v1`, `v2`, `draft`, `active`.
* **Note:** The prompt is completely model-independent. It defines the task contract, not the executor.

### Layer 4: AI Task Assignment (`ai_task_configs` collection)
The most critical layer. This maps a specific application task to its execution strategy.
* **Feature:** e.g., `agent-chat`
* **Task:** e.g., `execution_planner`
* **Prompt Version:** e.g., `execution_planner_v4`
* **Primary AI:** Provider: `Gemini`, Model: `gemini-3.6-flash`
* **Fallback AI:** Provider: `Groq`, Model: `groq/compound`
* **Parameters:** `temperature` (e.g., 0.1), `maxTokens` (e.g., 4000).
* **Requirements:** `structuredOutput: true`, `toolsEnabled: true`.

### Layer 5: Universal Runtime Router
A centralized backend class (`AIRuntime`) that replaces direct API `fetch()` or SDK calls across the platform.

```typescript
const response = await AIRuntime.execute({
  feature: "agent-chat",
  task: "execution_planner",
  variables: {
    userMessage,
    connectorContext,
    historyContext
  }
});
```
The router resolves the task config, injects the variables into the prompt, evaluates eligible models based on requirements, handles routing strategies, processes fallbacks, and logs execution traces.

---

## Routing Policies & Strategies
The runtime supports dynamic routing beyond manual assignment:
1. **Fixed / Manual:** Always use Primary Model X, fallback to Model Y.
2. **Cheapest:** Automatically evaluate eligible models and route to the lowest cost per token.
3. **Fastest:** Route to the model with the historically lowest TTFT (Time To First Token).
4. **Capability-Based:** The router automatically disqualifies models from the registry that don't support `JSON output` or `Tool Calling` if the task config requires it.

---

## AI Control Center (Frontend UI)
The `Prompt Management` interface is elevated to a full **AI Control Center**.

* **Providers & Models:** Toggle endpoints, add new open-source models, map capabilities.
* **Tasks & Configurations:** The core dashboard to edit how tasks behave. 
  *(e.g., Change the `Agent Chat -> Execution Planner` from `Gemini 3.6` to `Claude 3.5 Sonnet` instantly).*
* **Prompt Editor:** Edit templates, define runtime variables, and version them safely.
* **Test Playground:** A sandbox to test any `Prompt + Variables + Model + Provider` combination before setting it to Active status.
* **Execution Logs / Observability:** A comprehensive database trace of exactly which model answered a request, the exact prompt sent, token usage, latency, success/failure status, and fallback events.

---

## Refactoring Impact & Current State Map

When this is implemented, the existing hardcoded implementations identified in our audit will map to the new framework as follows:

| Feature | Task | Original Hardcode | New Dynamic Task ID |
| :--- | :--- | :--- | :--- |
| **Agent Chat** | Intent Parsing / Plan | `gemini-3.6-flash` | `agent-chat.execution_planner` |
| **Agent Chat** | Human Response | `gemini-2.0-flash` | `agent-chat.result_synthesizer` |
| **AI Co-Pilot** | Generate JSON DAG | `gemini-2.0-flash` | `ai-copilot.workflow_compiler` |
| **AI Co-Pilot** | Edit Canvas State | `gemini-2.0-flash` | `ai-copilot.canvas_mutator` |
| **AI Data Bridge** | Coerce/Map Schema | `llama-3.3-70b-versatile` | `data-bridge.data_mapper` |
| **WhatsApp** | Reply & Extract Memory| `gemini-2.0-flash` | `whatsapp.conversational_engine` |

## Next Implementation Steps
1. **Schema Generation:** Create the Mongoose Schemas (`ai_providers`, `ai_models`, `ai_prompts`, `ai_task_configs`, `ai_execution_logs`).
2. **Backend Engine:** Build the `AIRuntime.execute()` backend service and Provider Adapters to act as the universal interface.
3. **Refactoring:** Migrate the 6 tasks identified above to utilize `AIRuntime.execute()` instead of native `fetch()` calls.
4. **Frontend Control Plane:** Build the AI Control Center React Frontend for end-to-end management.
