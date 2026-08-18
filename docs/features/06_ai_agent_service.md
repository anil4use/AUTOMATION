# Feature 06: AI Prompt-to-Workflow Agent Service

**Status**: `DONE`  
**Related Master Plan Section**: Phase 3 — AI Prompt-to-Automation Agent  
**Related Task ID**: TSK-006  

---

## Overview

The AI Agent Service (`apps/backend/src/modules/ai-agent/`) receives plain English user prompts (e.g., *"When a new email arrives, summarize it with AI and send to Slack"*), parses intent, and outputs a validated draft DAG workflow containing nodes, edges, field mapping templates, and mid-workflow AI Processing nodes.

---

## Output Schema Example

```json
{
  "draftWorkflow": {
    "name": "AI Draft: When a new email arrives...",
    "nodes": [
      { "id": "trigger_1", "connectorId": "gmail", "operationId": "new_email" },
      { "id": "ai_node_1", "connectorId": "ai-agent", "operationId": "process_text" },
      { "id": "action_1", "connectorId": "slack", "operationId": "send_message" }
    ],
    "edges": [
      { "source": "trigger_1", "target": "ai_node_1" },
      { "source": "ai_node_1", "target": "action_1" }
    ]
  }
}
```

---

## Verification & Testing Instructions
1. Call `POST /api/v1/ai/generate` with `{ "prompt": "When a new lead arrives, notify Slack" }`.
2. Verify draft DAG nodes and edges are returned.
