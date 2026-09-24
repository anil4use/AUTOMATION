/**
 * AI Control Plane Seeder
 * ─────────────────────────────────────────────────────────────────────────────
 * Auto-seeds AI providers, task configs, and prompt templates into MongoDB on
 * first boot. All credentials and model IDs are read from environment variables
 * — nothing is hardcoded. The seeder is idempotent (safe to run multiple times).
 *
 * Triggered from server.ts on startup if no providers exist in the database.
 */

import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  AIProviderModel,
  AIModelModel,
  AITaskConfigModel,
  AIPromptModel,
} from '@automation/database';

// ─── Provider Definitions (read entirely from env) ─────────────────────────
interface ProviderSeedDef {
  providerId: string;
  name: string;
  description: string;
  apiKeyEnvVar: string;            // env var name (for logging only)
  apiKeyValue: string;             // actual value from env
  baseUrl?: string;
  isOpenAICompatible?: boolean;
  credentials: Record<string, any>;
  defaultModel: string;
  models: Array<{
    id: string;
    label: string;
    contextWindow: number;
    isFree: boolean;
    recommended?: boolean;
  }>;
}

function buildProviderDefs(): ProviderSeedDef[] {
  const defs: ProviderSeedDef[] = [];

  // ── OpenRouter ──────────────────────────────────────────────────────────
  if (env.openrouterApiKey) {
    defs.push({
      providerId: 'openrouter',
      name: 'OpenRouter',
      description: 'Access 500+ models (GPT-4o, Claude, Llama, Gemma, Qwen, Nemotron) via a single OpenAI-compatible API. Free tiers available.',
      apiKeyEnvVar: 'OPENROUTER_API_KEY',
      apiKeyValue: env.openrouterApiKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      isOpenAICompatible: true,
      credentials: {
        apiKey: env.openrouterApiKey,
        siteUrl: env.openrouterSiteUrl,
        siteName: env.openrouterSiteName,
      },
      // Verified Working Free Models (Live Benchmark 2026-09-25)
      defaultModel: 'nvidia/nemotron-3-super-120b-a12b:free',
      models: [
        {
          id: 'nvidia/nemotron-3-super-120b-a12b:free',
          label: 'NVIDIA Nemotron 3 Super 120B (FREE)',
          contextWindow: 262144,
          isFree: true,
          recommended: true,
        },
        {
          id: 'nvidia/nemotron-3.5-lightning:free',
          label: 'NVIDIA Nemotron 3.5 Lightning 1M (FREE)',
          contextWindow: 1000000,
          isFree: true,
          recommended: true,
        },
        {
          id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
          label: 'NVIDIA Nemotron 3 Nano Omni (FREE)',
          contextWindow: 256000,
          isFree: true,
          recommended: true,
        },
        {
          id: 'nex-agi/nex-n2.5-mini:free',
          label: 'Nex AGI N2.5 Mini (FREE)',
          contextWindow: 262144,
          isFree: true,
        },
        {
          id: 'cohere/north-mini-code:free',
          label: 'Cohere North Mini Code (FREE)',
          contextWindow: 256000,
          isFree: true,
        },
        {
          id: 'dots-studio/dots-3-note-preview:free',
          label: 'Dots Studio Dots3-Note (FREE)',
          contextWindow: 512000,
          isFree: true,
        },
        {
          id: 'liquid/lfm-2.5-2.6b:free',
          label: 'LiquidAI LFM2.5 2.6B (FREE)',
          contextWindow: 65536,
          isFree: true,
        },
        {
          id: 'inclusionai/ling-3.0-flash-sante:free',
          label: 'inclusionAI Ling 3.0 Flash Sante (FREE)',
          contextWindow: 262144,
          isFree: true,
        },
        {
          id: 'inclusionai/ling-3.0-flash-fin:free',
          label: 'inclusionAI Ling 3.0 Flash Fin (FREE)',
          contextWindow: 262144,
          isFree: true,
        },
        {
          id: 'nvidia/nemotron-3.5-content-safety:free',
          label: 'NVIDIA Nemotron 3.5 Safety (FREE)',
          contextWindow: 128000,
          isFree: true,
        },
      ],
    });
  }

  // ── Groq ────────────────────────────────────────────────────────────────
  if (env.groqApiKey) {
    defs.push({
      providerId: 'groq',
      name: 'Groq',
      description: 'Ultra-fast LLM inference via Groq Cloud. Free tier available with rate limits.',
      apiKeyEnvVar: 'GROQ_API_KEY',
      apiKeyValue: env.groqApiKey,
      isOpenAICompatible: false,
      credentials: { apiKey: env.groqApiKey },
      defaultModel: 'llama-3.1-70b-versatile',
      models: [
        { id: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile', contextWindow: 128000, isFree: true, recommended: true },
        { id: 'llama3-70b-8192', label: 'Llama 3 70B', contextWindow: 8192, isFree: true },
        { id: 'llama3-8b-8192', label: 'Llama 3 8B', contextWindow: 8192, isFree: true },
        { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', contextWindow: 32768, isFree: true },
        { id: 'gemma2-9b-it', label: 'Gemma 2 9B', contextWindow: 8192, isFree: true },
      ],
    });
  }

  // ── Google Gemini ────────────────────────────────────────────────────────
  if (env.geminiApiKey) {
    defs.push({
      providerId: 'gemini',
      name: 'Google Gemini',
      description: 'Google Gemini AI models via Google AI Studio. Free tier with generous limits.',
      apiKeyEnvVar: 'GEMINI_API_KEY',
      apiKeyValue: env.geminiApiKey,
      isOpenAICompatible: false,
      credentials: { apiKey: env.geminiApiKey },
      defaultModel: 'gemini-2.0-flash',
      models: [
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', contextWindow: 1048576, isFree: true, recommended: true },
        { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', contextWindow: 1048576, isFree: true },
        { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', contextWindow: 2097152, isFree: false },
      ],
    });
  }

  // ── OpenAI ──────────────────────────────────────────────────────────────
  if (env.openaiApiKey) {
    defs.push({
      providerId: 'openai',
      name: 'OpenAI',
      description: 'OpenAI GPT-4o and GPT-4o Mini models. Requires a paid API key.',
      apiKeyEnvVar: 'OPENAI_API_KEY',
      apiKeyValue: env.openaiApiKey,
      isOpenAICompatible: false,
      credentials: { apiKey: env.openaiApiKey },
      defaultModel: 'gpt-4o-mini',
      models: [
        { id: 'gpt-4o', label: 'GPT-4o', contextWindow: 128000, isFree: false, recommended: true },
        { id: 'gpt-4o-mini', label: 'GPT-4o Mini', contextWindow: 128000, isFree: false },
      ],
    });
  }

  return defs;
}

// ─── Task Config Definitions (feature/task → provider/model routing) ────────
// These define which model handles which AI task in the app.
// The primary provider is set to DEFAULT_LLM_PROVIDER from env.
function buildTaskConfigs(defaultProviderId: string, defaultModel: string) {
  const tasks = [
    {
      feature: 'agent-chat',
      task: 'execution_planner',
      promptKey: 'agent-chat:execution_planner',
      description: 'Parse user intent and generate a JSON execution plan for the agent chat pipeline.',
      parameters: { temperature: 0.1, maxTokens: 4096 },
      requirements: { structuredOutput: true },
    },
    {
      feature: 'agent-chat',
      task: 'result_synthesizer',
      promptKey: 'agent-chat:result_synthesizer',
      description: 'Synthesize executed step results into a conversational natural language response.',
      parameters: { temperature: 0.7, maxTokens: 2048 },
      requirements: { structuredOutput: false },
    },
    {
      feature: 'ai-copilot',
      task: 'workflow_compiler',
      promptKey: 'ai-copilot:workflow_compiler',
      description: 'Compile user intent into a complete AutoFlow DAG workflow JSON structure.',
      parameters: { temperature: 0.1, maxTokens: 8192 },
      requirements: { structuredOutput: true },
    },
    {
      feature: 'ai-copilot',
      task: 'canvas_mutator',
      promptKey: 'ai-copilot:canvas_mutator',
      description: 'Mutate an existing workflow canvas based on a natural language copilot instruction.',
      parameters: { temperature: 0.2, maxTokens: 8192 },
      requirements: { structuredOutput: true },
    },
    {
      feature: 'whatsapp-agent',
      task: 'conversational_reply',
      promptKey: 'whatsapp-agent:conversational_reply',
      description: 'Generate a human-like WhatsApp reply from the agent persona with long-term memory context.',
      parameters: { temperature: 0.8, maxTokens: 1024 },
      requirements: { structuredOutput: false },
    },
    {
      feature: 'data-bridge',
      task: 'field_mapper',
      promptKey: 'data-bridge:field_mapper',
      description: 'Coerce and map data fields between source and target schema using AI type inference.',
      parameters: { temperature: 0.0, maxTokens: 2048 },
      requirements: { structuredOutput: true },
    },
  ];

  return tasks.map((t) => ({
    ...t,
    primaryProvider: defaultProviderId,
    primaryModel: defaultModel,
    fallbackProvider: null,
    fallbackModel: null,
    enabled: true,
  }));
}

// ─── Prompt Templates ───────────────────────────────────────────────────────
// Minimal placeholder prompts — these should be edited via the AI Control Plane UI.
// Variables injected via Handlebars: {{connectorContext}}, {{historyContext}}, etc.
function buildPromptTemplates() {
  return [
    {
      feature: 'agent-chat',
      promptKey: 'agent-chat:execution_planner',
      name: 'Agent Chat — Execution Planner',
      template: `You are the AutoFlow Agent. Your job is to parse the user's intent and produce a JSON execution plan.

CONNECTED APPS & AVAILABLE ACTIONS:
{{connectorContext}}

PREVIOUS EXECUTION HISTORY:
{{historyContext}}

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{"plan":[{"stepId":"step_1","connectorId":"<id>","connectionId":"<connectionId>","actionId":"<action>","description":"<what it does>","inputs":{}}],"requiresConfirmation":false}

If the request is conversational (not an action), return: {"plan":[],"conversationalMessage":"<your reply>","requiresConfirmation":false}`,
      version: 1,
      status: 'active',
    },
    {
      feature: 'agent-chat',
      promptKey: 'agent-chat:result_synthesizer',
      name: 'Agent Chat — Result Synthesizer',
      template: `You are AutoFlow Agent. The user sent: "{{userMessage}}"

The following steps were executed:
{{resultsText}}
{{urlSection}}

Write a clear, friendly response summarizing what was accomplished. Include any links if present. Use markdown formatting.`,
      version: 1,
      status: 'active',
    },
    {
      feature: 'ai-copilot',
      promptKey: 'ai-copilot:workflow_compiler',
      name: 'AI Copilot — Workflow Compiler',
      template: `You are the AutoFlow AI Copilot. Build a complete DAG workflow JSON for the user's automation request.

USER CONNECTED ACCOUNTS:
{{activeConnectionsSummary}}

AVAILABLE CONNECTORS:
{{connectorSummary}}

RECENT EXECUTION DIAGNOSTICS:
{{executionDiagnosticsSummary}}

Rules:
- Node positions: {"x": 400, "y": 80 + nodeIndex * 270}
- Return ONLY valid JSON, no markdown fences.

Schema:
{"replyMessage":"string","suggestedConnectors":[],"fieldsNeedingReview":[],"workflowDraft":null}`,
      version: 1,
      status: 'active',
    },
    {
      feature: 'ai-copilot',
      promptKey: 'ai-copilot:canvas_mutator',
      name: 'AI Copilot — Canvas Mutator',
      template: `You are the AutoFlow AI Copilot. Mutate the existing workflow canvas based on the user's instruction.

PLATFORM CONTEXT:
{{baseDynamicContext}}

CURRENT CANVAS NODES:
{{currentNodesStr}}

CURRENT CANVAS EDGES:
{{currentEdgesStr}}

USER INSTRUCTION: {{userPrompt}}

Return ONLY valid JSON: {"replyMessage":"string","changesSummary":[],"nodes":[],"edges":[]}`,
      version: 1,
      status: 'active',
    },
    {
      feature: 'whatsapp-agent',
      promptKey: 'whatsapp-agent:conversational_reply',
      name: 'WhatsApp Agent — Conversational Reply',
      template: `You are a friendly WhatsApp AI assistant with the following personality:
{{agentPersonality}}

{{profileSection}}
{{factsSection}}

Current date/time: {{currentDateTime}}

Respond naturally and conversationally, as if texting a friend. Keep replies concise (1-3 sentences). Do NOT use markdown. Be warm and personal.`,
      version: 1,
      status: 'active',
    },
    {
      feature: 'data-bridge',
      promptKey: 'data-bridge:field_mapper',
      name: 'Data Bridge — Field Mapper',
      template: `You are a data type coercion engine. Map the source data fields to the target schema.

Source data: {{sourceData}}
Target schema: {{targetSchema}}

Return ONLY valid JSON matching the target schema. Infer and convert types as needed.`,
      version: 1,
      status: 'active',
    },
  ];
}

// ─── Main Seeder ─────────────────────────────────────────────────────────────
export class AIControlPlaneSeeder {
  /**
   * Run on server bootstrap. Idempotent — upserts providers & models without overriding user customized settings.
   * All data sourced from environment variables, never hardcoded.
   */
  static async seed(): Promise<void> {
    const providerDefs = buildProviderDefs();

    if (providerDefs.length === 0) {
      logger.warn(
        '[AIControlPlaneSeeder] No AI provider keys found in environment. ' +
        'Set at least one of: OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY'
      );
      return;
    }

    logger.info(`[AIControlPlaneSeeder] Syncing ${providerDefs.length} AI providers and models from environment...`);

    // Determine the default provider (respects DEFAULT_LLM_PROVIDER env var)
    const defaultProviderDef =
      providerDefs.find((p) => p.providerId === env.defaultLlmProvider) ||
      providerDefs[0];

    // Seed/upsert providers
    for (const def of providerDefs) {
      const isDefault = def.providerId === defaultProviderDef.providerId;
      const existing = await AIProviderModel.findOne({ providerId: def.providerId });

      if (!existing) {
        await AIProviderModel.create({
          providerId: def.providerId,
          name: def.name,
          description: def.description,
          baseUrl: def.baseUrl || null,
          isOpenAICompatible: def.isOpenAICompatible || false,
          credentials: def.credentials,
          availableModels: def.models,
          defaultModel: def.defaultModel,
          enabled: isDefault,
          setupComplete: true,
        });
        logger.info(`[AIControlPlaneSeeder] ✅ New Provider created: ${def.name} (${def.providerId})`);
      } else {
        // Always sync availableModels and defaultModel, plus credentials if provided
        const updateData: any = {
          availableModels: def.models,
          defaultModel: def.defaultModel,
        };
        if (def.credentials?.apiKey) {
          updateData.credentials = def.credentials;
          updateData.setupComplete = true;
        }
        await AIProviderModel.updateOne(
          { providerId: def.providerId },
          { $set: updateData }
        );
        logger.info(`[AIControlPlaneSeeder] 🔄 Synced available models & credentials for ${def.name}`);
      }

      // Prune any stale models for this provider from AIModelModel
      const validModelIds = def.models.map((m) => m.id);
      const pruneResult = await AIModelModel.deleteMany({
        providerId: def.providerId,
        modelId: { $nin: validModelIds },
      });
      if (pruneResult.deletedCount > 0) {
        logger.info(`[AIControlPlaneSeeder] 🧹 Pruned ${pruneResult.deletedCount} non-working models for ${def.name}`);
      }

      // Seed/upsert AIModelModel entries for available models
      for (const m of def.models) {
        await AIModelModel.findOneAndUpdate(
          { providerId: def.providerId, modelId: m.id },
          {
            $setOnInsert: {
              providerId: def.providerId,
              modelId: m.id,
              name: m.label,
              contextWindow: m.contextWindow,
              supportsTools: true,
              supportsJson: true,
              supportsVision: m.id.includes('vision') || m.id.includes('gemini') || m.id.includes('gpt-4o'),
              supportsReasoning: m.id.includes('qwen') || m.id.includes('r1') || m.id.includes('reasoning'),
              inputCostPer1k: m.isFree ? 0 : 0.0015,
              outputCostPer1k: m.isFree ? 0 : 0.002,
              priority: m.recommended ? 100 : 70,
            },
          },
          { upsert: true, new: true }
        );
      }
    }

    // Seed task configs using the default provider
    const taskConfigs = buildTaskConfigs(
      defaultProviderDef.providerId,
      defaultProviderDef.defaultModel
    );

    for (const config of taskConfigs) {
      await AITaskConfigModel.findOneAndUpdate(
        { feature: config.feature, task: config.task },
        { $setOnInsert: config },
        { upsert: true, new: true }
      );
    }
    logger.info(`[AIControlPlaneSeeder] ✅ AI task configs verified.`);

    // Seed prompt templates
    const prompts = buildPromptTemplates();
    for (const prompt of prompts) {
      await AIPromptModel.findOneAndUpdate(
        { feature: prompt.feature, promptKey: prompt.promptKey, version: prompt.version },
        { $setOnInsert: prompt },
        { upsert: true, new: true }
      );
    }
    logger.info(`[AIControlPlaneSeeder] ✅ AI prompt templates verified.`);

    logger.info(
      `🎉 [AIControlPlaneSeeder] AI Control Plane sync complete! ` +
      `Default provider: ${defaultProviderDef.name} (${defaultProviderDef.providerId})`
    );
  }
}
