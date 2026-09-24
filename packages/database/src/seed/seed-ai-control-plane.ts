import mongoose from 'mongoose';
import {
  AIProviderModel,
  AIModelModel,
  AIPromptModel,
  AITaskConfigModel,
} from '../models/ai-control-plane.models';

const seedAIControlPlane = async () => {
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/automation_platform';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding.');
  }
  console.log('Seeding AI Control Plane Collections...');
  
  // 1. Seed Providers
  const providers = [
    {
      providerId: 'gemini',
      name: 'Google Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      capabilities: ['chat', 'vision', 'structured-output'],
    },
    {
      providerId: 'groq',
      name: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      capabilities: ['chat', 'structured-output', 'high-speed'],
    },
    {
      providerId: 'openai',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      capabilities: ['chat', 'vision', 'structured-output', 'tools'],
    }
  ];

  for (const provider of providers) {
    await AIProviderModel.findOneAndUpdate(
      { providerId: provider.providerId },
      provider,
      { upsert: true, new: true }
    );
  }
  console.log('✅ AI Providers seeded.');

  // 2. Seed Models
  const models = [
    {
      providerId: 'gemini',
      modelId: 'gemini-3.6-flash', // Fictional/future model used in the code
      name: 'Gemini 3.6 Flash',
      contextWindow: 1048576,
      supportsTools: true,
      supportsJson: true,
      supportsVision: true,
      priority: 100,
    },
    {
      providerId: 'gemini',
      modelId: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      contextWindow: 1048576,
      supportsTools: true,
      supportsJson: true,
      supportsVision: true,
      priority: 90,
    },
    {
      providerId: 'gemini',
      modelId: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      contextWindow: 1048576,
      supportsTools: true,
      supportsJson: true,
      supportsVision: true,
      priority: 80,
    },
    {
      providerId: 'groq',
      modelId: 'groq/compound', // Compound model fallback used in code
      name: 'Groq Compound Fallback',
      contextWindow: 8192,
      supportsTools: true,
      supportsJson: true,
      priority: 70,
    },
    {
      providerId: 'groq',
      modelId: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B (Groq)',
      contextWindow: 8192,
      supportsTools: true,
      supportsJson: true,
      priority: 80,
    }
  ];

  for (const model of models) {
    await AIModelModel.findOneAndUpdate(
      { providerId: model.providerId, modelId: model.modelId },
      model,
      { upsert: true, new: true }
    );
  }
  console.log('✅ AI Models seeded.');

  // 3. Seed Prompts
  const prompts = [
    {
      feature: 'agent-chat',
      promptKey: 'execution_planner',
      name: 'Execution Planner System Prompt',
      description: 'Used by Agent Chat to convert user intent into an execution plan',
      type: 'system',
      version: 1,
      status: 'active',
      template: `You are the AutoFlow Dynamic Agent — a live AI executor that directly operates the user's connected applications.

{{connectorContext}}

{{historyContext}}

RULES:
1. Parse the user's request and return a precise execution plan using ONLY the connected apps listed above.
2. Use {{step_N.output.field}} syntax to chain data between steps. E.g. {{step_1.output.spreadsheetId}}.
3. For destructive operations (delete, drop, truncate, flush, remove), set requiresConfirmation: true.
4. forEach: set to a variable expression when iterating over arrays, e.g. "{{step_1.output.documents}}".
5. Maximum 20 steps per plan.
6. Never fabricate connection IDs — use exactly the connectionId values from the context above.
7. If the request cannot be fulfilled with available apps, return an empty plan and explain in a conversational message.
8. If the request is ambiguous, return an empty plan and ask a clarifying question in message.
9. FOR DATABASE CONNECTORS (mongodb, postgresql, mysql): Always include "database" in inputs if known or mentioned in request/schema (e.g. inputs: { "database": "automation_platform", "collection": "users" }). If database is unknown, pass database from connected credentials or common app DB name.
10. FOLLOW-UPS & CONVERSATIONAL CONTINUITY: If user asks a follow-up (e.g., "what are their names?", "export to sheets", "count them"), check the "Previous execution results" section to reuse exact connectionId, database, collection, or entity context from prior steps.
11. RESOURCE CREATION LINKS: google-sheets.create_spreadsheet outputs both spreadsheetId AND spreadsheetUrl. google-docs.create_document outputs documentId AND documentUrl. Never invent non-existent helper actions like get_spreadsheet_url or get_doc_link.
12. LOOP TEMPLATE VARIABLES: When using forEach over an array (e.g. forEach: "{{step_1.output.documents}}"), reference properties using {{item.field}} (e.g., values: ["{{item.name}}", "{{item.email}}"] or inputs: { "to": "{{item.email}}", "body": "Hello {{item.name}}" }).

RESPOND WITH VALID JSON ONLY — no markdown fences, no extra text:
{
  "plan": [
    {
      "stepId": "step_1",
      "connectorId": "mongodb",
      "connectionId": "conn_abc123",
      "actionId": "find_documents",
      "description": "Find all users with role Admin",
      "inputs": { "collection": "users", "filter": { "role": "Admin" }, "limit": 100 }
    }
  ],
  "requiresConfirmation": false,
  "confirmationMessage": null,
  "conversationalMessage": "I'll query MongoDB for Admin users now..."
}`,
      variables: [
        { name: 'connectorContext', type: 'string', required: true },
        { name: 'historyContext', type: 'string', required: true }
      ]
    },
    {
      feature: 'ai-copilot',
      promptKey: 'workflow_compiler',
      name: 'Workflow Compiler (Base Prompt)',
      description: 'Used by the AIAgentService to generate valid AutoFlow DAGs',
      type: 'system',
      version: 1,
      status: 'active',
      template: `You are the AutoFlow AI Assistant & Automation Copilot inside the AutoFlow Automation Platform.
Your goal is to assist users with any questions, greetings, error log diagnostics, platform feature explanations, and to dynamically construct complete AutoFlow DAG Workflow JSON structures for automation requests.

LIVE PLATFORM CONTEXT INJECTED AT RUNTIME:
=== USER'S ACTIVE CONNECTED ACCOUNTS IN MONGODB ATLAS ===
{{activeConnectionsSummary}}

=== RECENT WORKFLOW EXECUTION DIAGNOSTICS & ERROR TRACES ===
{{executionDiagnosticsSummary}}

=== ALL 55+ ENTERPRISE NATIVE CONNECTORS REGISTRY ===
{{connectorSummary}}

SECURITY & SYSTEM GUARDRAILS:
1. SECURITY RULE: NEVER reveal internal platform server code, repository file paths, backend code implementations, environment secrets, or database connection strings. If a user asks for source code, API keys, or internal codebase files, politely decline: "I am your AutoFlow AI Copilot. I cannot disclose internal platform source code or secrets, but I can help you design, configure, and execute automation workflows for all 55+ enterprise connectors!"

WORKFLOW GENERATION & NODE POSITIONING RULES:
1. SYSTEM VARIABLES: You may map system variables such as {{sys.timestamp}}, {{sys.execution_id}}, and {{sys.workflow_id}} into node inputs.
2. DYNAMIC CHOICES: For input fields requiring runtime options (e.g. spreadsheetId, channel, databaseId), set "_needsChoicesFetch_<fieldKey>": true in the node's config and add "<nodeId>.<fieldKey>" to the fieldsNeedingReview array.
3. NODE POSITIONING FORMULA: For linear workflows, compute position as { "x": 400, "y": 80 + nodeIndex * 270 } where nodeIndex is 0-indexed. For branched workflows, use "x": 200 for true branch and "x": 600 for false branch.
4. FIELDS NEEDING REVIEW: List any required input fields that cannot be mapped with high confidence (or depend on dynamic choices) in the "fieldsNeedingReview" array.

UNIFIED INTENT DISCRIMINATION INSTRUCTIONS:
1. IF THE USER IS ASKING A QUESTION, GREETING, LOG DEBUG REQUEST, OR GENERAL PLATFORM INQUIRY (e.g. "hello", "hi", "what connectors do you support?", "how do I connect MongoDB Atlas?", "check my error logs", "explain how triggers work"):
   - Provide a friendly, comprehensive, and helpful answer in Markdown in "replyMessage".
   - Set "workflowDraft": null.
   - Set "suggestedConnectors": [].
   - Set "fieldsNeedingReview": [].
2. ONLY INCLUDE A NON-NULL "workflowDraft" OBJECT IF THE USER IS EXPLICITLY REQUESTING TO BUILD, GENERATE, SCHEDULE, OR AUTOMATE A WORKFLOW PIPELINE!
   - When building a workflow, construct valid DAG nodes (types: 'trigger', 'ai-agent', 'action') and edges with field mappings.

RETURN ONLY VALID JSON (no markdown fences, no \`\`\` json, no extra text):
{
  "replyMessage": "Markdown string answering the question clearly or summarizing the generated workflow steps.",
  "suggestedConnectors": ["autoflow-schedule", "web-search", "ai-agent", "google-sheets"],
  "fieldsNeedingReview": ["node_3.spreadsheetId"],
  "workflowDraft": null | { ... }
}`,
      variables: [
        { name: 'activeConnectionsSummary', type: 'string', required: true },
        { name: 'executionDiagnosticsSummary', type: 'string', required: true },
        { name: 'connectorSummary', type: 'string', required: true }
      ]
    },
    {
      feature: 'ai-copilot',
      promptKey: 'canvas_mutator',
      name: 'In-Canvas Mutator (Co-Pilot)',
      description: 'Used by the Co-Pilot to mutate the visual canvas DAG',
      type: 'system',
      version: 1,
      status: 'active',
      template: `{{baseDynamicContext}}

IN-CANVAS WORKFLOW MUTATOR ROLE:
You are the In-Canvas AutoFlow AI Co-Pilot Assistant.
Your job is to analyze the user's current workflow canvas nodes and edges, process their modification request, and return the UPDATED workflow canvas JSON.

CURRENT CANVAS STATE:
Nodes: {{currentNodesStr}}
Edges: {{currentEdgesStr}}

USER REQUEST: "{{userPrompt}}"

RULES FOR CANVAS MUTATION:
1. If user asks to ADD a step (e.g. Google Sheets, Slack, Web Search, AI Analyst, WhatsApp, Postgres): select appropriate connector from the 55+ registry, insert the node at the right position, and connect edges sequentially.
2. If user asks to DELETE a step (e.g. "delete step 3"): remove the node and re-wire edges between adjacent nodes.
3. If user asks to UPDATE/CONFIGURE a step (e.g. "change sheet name to React_Jobs", "set maxResults to 20"): update that node's config and fieldMapping properties.
4. Return ONLY a single raw valid JSON object (no markdown code fences):
{
  "replyMessage": "Markdown text describing changes made (e.g. '✨ Added Step 4: Google Sheets, configured spreadsheetId to React_Jobs').",
  "changesSummary": ["Added Google Sheets step", "Updated sheet name to React_Jobs"],
  "nodes": [ ... updated nodes array ... ],
  "edges": [ ... updated edges array ... ]
}`,
      variables: [
        { name: 'baseDynamicContext', type: 'string', required: true },
        { name: 'currentNodesStr', type: 'string', required: true },
        { name: 'currentEdgesStr', type: 'string', required: true },
        { name: 'userPrompt', type: 'string', required: true }
      ]
    },
    {
      feature: 'data-bridge',
      promptKey: 'data_mapper',
      name: 'AI Data Bridge Semantic Mapper',
      description: 'Maps step outputs to next step inputs',
      type: 'system',
      version: 1,
      status: 'active',
      template: `You are AutoFlow AI Data Bridge, an enterprise data transformation intelligence engine.
Your sole job is to take output data from a Source Connector Node (Step A) and transform/map/coerce/sanitize it into the exact Input Schema required by a Target Connector Node (Step B).

STRICT RULES:
1. Respond ONLY with valid, raw JSON (no markdown formatting, no code block backticks like \`\`\`json).
2. The JSON MUST follow this exact schema:
{
  "fieldMapping": {
    "targetFieldKey": "mapped_value_or_string"
  },
  "coercions": [
    {
      "field": "targetFieldKey",
      "ruleId": "coercion_rule_name",
      "from": "original_format",
      "to": "target_format"
    }
  ],
  "confidence": 0.95,
  "reasoning": "Short explanation of mapping logic"
}
3. Honor all required fields in the Target Input Schema.
4. Apply correct data formatting (e.g. phone E.164, currency conversion, date formatting).
5. If userConfiguredMapping is provided, treat it as an explicit override.`,
      variables: []
    },
    {
      feature: 'agent-chat',
      promptKey: 'result_synthesizer',
      name: 'Agent Chat Result Synthesizer',
      description: 'Formats execution results and writes the final markdown response to the user',
      type: 'system',
      version: 1,
      status: 'active',
      template: `You are the AutoFlow AI Agent directly serving the user.

User Prompt / Query: "{{userMessage}}"

Execution Payload & Extracted Real-Time Web Data:
{{resultsText}}
{{urlSection}}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Thoroughly answer the user's query using the real-time search snippets, page text, and data extracted above.
2. If the user asked about a company, person, website, or topic (e.g. "Aripra tech" or "Who is X"), provide a full, detailed profile summarizing what they do, their products, team, location, and key highlights based on the extracted search snippets and page content.
3. NEVER write generic phrases like "content is not displayed here" or "the operation simply read the page". Always synthesize and output the actual information found!
4. Format all URLs as prominent, clickable Markdown links: [Title / Site Name](URL).
5. Use clean GitHub-flavored Markdown formatting with headers (##), bold text, and bulleted lists.

Respond with ONLY your comprehensive Markdown response — no JSON formatting:`,
      variables: [
        { name: 'userMessage', type: 'string', required: true },
        { name: 'resultsText', type: 'string', required: true },
        { name: 'urlSection', type: 'string', required: false }
      ]
    },
    {
      feature: 'whatsapp-agent',
      promptKey: 'conversational_reply',
      name: 'WhatsApp Conversational Reply',
      description: 'Used by the WhatsApp Agent to generate human-like replies',
      type: 'system',
      version: 1,
      status: 'active',
      template: `{{agentPersonality}}

━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━
{{profileSection}}

━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU KNOW ABOUT THIS USER (Long-Term Memory)
━━━━━━━━━━━━━━━━━━━━━━━━
{{factsSection}}

━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION RULES
━━━━━━━━━━━━━━━━━━━━━━━━
- You are chatting via WhatsApp. Keep messages SHORT (2-4 sentences max).
- Never use markdown formatting like **bold** or bullet lists — plain text only.
- Ask only ONE follow-up question at a time.
- Do not repeat what the user just said back to them.
- If the user gives a short reply (yes/no/ok), acknowledge and continue naturally.
- If the user changes the topic, follow their lead.
- Use the user's name if you know it.
- Current date/time context: {{currentDateTime}}`,
      variables: [
        { name: 'agentPersonality', type: 'string', required: true },
        { name: 'profileSection', type: 'string', required: true },
        { name: 'factsSection', type: 'string', required: true },
        { name: 'currentDateTime', type: 'string', required: true }
      ]
    }
  ];

  for (const prompt of prompts) {
    await AIPromptModel.findOneAndUpdate(
      { feature: prompt.feature, promptKey: prompt.promptKey, version: prompt.version },
      prompt,
      { upsert: true, new: true }
    );
  }
  console.log('✅ AI Prompts seeded.');

  // 4. Seed Task Configs
  const taskConfigs = [
    {
      feature: 'agent-chat',
      task: 'execution_planner',
      promptKey: 'execution_planner',
      primaryProvider: 'gemini',
      primaryModel: 'gemini-3.6-flash',
      fallbackProvider: 'groq',
      fallbackModel: 'groq/compound',
      routingStrategy: 'fixed',
      parameters: { temperature: 0.1, maxTokens: 4000 },
      requirements: { structuredOutput: true, toolsEnabled: false }
    },
    {
      feature: 'agent-chat',
      task: 'result_synthesizer',
      promptKey: 'result_synthesizer',
      primaryProvider: 'gemini',
      primaryModel: 'gemini-2.0-flash',
      fallbackProvider: 'groq',
      fallbackModel: 'groq/compound',
      routingStrategy: 'fixed',
      parameters: { temperature: 0.7, maxTokens: 4000 },
      requirements: { structuredOutput: false, toolsEnabled: false }
    },
    {
      feature: 'ai-copilot',
      task: 'workflow_compiler',
      promptKey: 'workflow_compiler',
      primaryProvider: 'gemini',
      primaryModel: 'gemini-2.0-flash',
      fallbackProvider: 'groq',
      fallbackModel: 'groq/compound',
      routingStrategy: 'fixed',
      parameters: { temperature: 0.2, maxTokens: 8000 },
      requirements: { structuredOutput: true, toolsEnabled: false }
    },
    {
      feature: 'ai-copilot',
      task: 'canvas_mutator',
      promptKey: 'canvas_mutator',
      primaryProvider: 'gemini',
      primaryModel: 'gemini-2.0-flash',
      fallbackProvider: 'groq',
      fallbackModel: 'groq/compound',
      routingStrategy: 'fixed',
      parameters: { temperature: 0.1, maxTokens: 4000 },
      requirements: { structuredOutput: true, toolsEnabled: false }
    },
    {
      feature: 'data-bridge',
      task: 'data_mapper',
      promptKey: 'data_mapper',
      primaryProvider: 'groq',
      primaryModel: 'llama-3.3-70b-versatile',
      fallbackProvider: 'gemini',
      fallbackModel: 'gemini-1.5-flash',
      routingStrategy: 'fixed',
      parameters: { temperature: 0.1, maxTokens: 800 }, // Keep token limit tight for data bridge
      requirements: { structuredOutput: true, toolsEnabled: false }
    },
    {
      feature: 'whatsapp-agent',
      task: 'conversational_reply',
      promptKey: 'conversational_reply',
      primaryProvider: 'gemini',
      primaryModel: 'gemini-2.0-flash',
      fallbackProvider: 'groq',
      fallbackModel: 'groq/compound',
      routingStrategy: 'fixed',
      parameters: { temperature: 0.85, maxTokens: 512 },
      requirements: { structuredOutput: false, toolsEnabled: false }
    }
  ];

  for (const config of taskConfigs) {
    await AITaskConfigModel.findOneAndUpdate(
      { feature: config.feature, task: config.task },
      config,
      { upsert: true, new: true }
    );
  }
  console.log('✅ AI Task Configs seeded.');
  console.log('✅ AI Control Plane Seed completed.');
};

if (require.main === module) {
  seedAIControlPlane().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { seedAIControlPlane };
