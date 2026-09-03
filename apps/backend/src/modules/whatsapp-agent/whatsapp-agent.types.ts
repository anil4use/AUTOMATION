/**
 * whatsapp-agent.types.ts
 *
 * Shared DTOs and interfaces for the WhatsApp Agent module.
 * These are the API-layer types used between controller and services.
 */

// ── Automation CRUD DTOs ─────────────────────────────────────────────────────

export interface CreateWhatsAppAutomationDTO {
  name: string;
  description?: string;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId?: string;
  accessToken: string;           // plain text — will be encrypted before storage
  verifyToken: string;
  agentModel?: 'gemini' | 'groq' | 'openai';
  agentPersonality?: string;

  // Access control (optional)
  allowedUsers?: string[];
  blockedUsers?: string[];
  allowGroupConversations?: boolean;

  // Conversation (optional)
  conversationTimeoutMinutes?: number;
  maxHistoryMessages?: number;

  // Memory (optional)
  enableLongTermMemory?: boolean;
  memoryExtractionEnabled?: boolean;
  memoryExtractionAfterEveryN?: number;
}

export interface UpdateWhatsAppAutomationDTO extends Partial<CreateWhatsAppAutomationDTO> {
  enabled?: boolean;
}

// ── Webhook Handler ───────────────────────────────────────────────────────────

export interface WebhookHandleResult {
  processed: boolean;
  conversationId?: string;
  agentReply?: string;
  reason?: string;   // why it was skipped if processed = false
}

// ── Agent Context ─────────────────────────────────────────────────────────────

export interface AgentContext {
  automationId: string;
  organizationId: string;
  externalUserId: string;
  userName?: string;
  channel: string;
  currentMessage: string;
  conversationHistory: Array<{ role: 'user' | 'agent'; content: string; timestamp: Date }>;
  userProfile: Record<string, any>;
  longTermMemory: Array<{ key: string; value: any; confidence: number }>;
  agentPersonality: string;
}

// ── Memory Extraction Job ─────────────────────────────────────────────────────

export interface MemoryExtractionJobPayload {
  automationId: string;
  organizationId: string;
  externalUserId: string;
  channel: string;
  conversationId: string;
  agentModel: 'gemini' | 'groq' | 'openai';
}

export interface ExtractedMemoryFact {
  key: string;
  value: any;
  confidence: number;
}
