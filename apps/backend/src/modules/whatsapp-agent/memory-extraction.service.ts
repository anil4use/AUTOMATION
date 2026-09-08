import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { UserMemoryService } from './user-memory.service';
import { ExtractedMemoryFact } from './whatsapp-agent.types';

/**
 * MemoryExtractionService — async post-processing after a conversation turn.
 *
 * Analyzes recent conversation messages and extracts structured facts
 * worth remembering long-term about the user.
 *
 * Design principles:
 * - Only extract high-confidence, reusable facts (not conversational filler)
 * - Deduplication is handled by UserMemoryService.upsertMemoryFact
 * - Facts below 0.7 confidence are discarded before storage
 * - The extraction is non-blocking (runs as a BullMQ job)
 */
export class MemoryExtractionService {
  /**
   * Extract facts from a conversation and persist them to user memory.
   */
  static async extractAndPersist(
    orgId: string,
    automationId: string,
    externalUserId: string,
    channel: string,
    conversationHistory: Array<{ role: 'user' | 'agent'; content: string }>,
    agentModel: 'gemini' | 'groq' | 'openai' = 'gemini'
  ): Promise<ExtractedMemoryFact[]> {
    if (conversationHistory.length === 0) return [];

    logger.info(
      `[MemoryExtraction] Running extraction for user ${externalUserId} (${conversationHistory.length} messages)`
    );

    let rawFacts: ExtractedMemoryFact[] = [];

    try {
      rawFacts = await MemoryExtractionService.callLLMExtraction(
        conversationHistory,
        agentModel
      );
    } catch (err) {
      logger.error('[MemoryExtraction] LLM extraction failed:', err);
      return [];
    }

    // Filter: only keep high-confidence facts
    const validFacts = rawFacts.filter((f) => {
      if (f.confidence < 0.7) return false;
      if (!f.key || !f.value) return false;
      // Sanitize key: only allow dot-notation alphanumeric keys
      f.key = f.key.toLowerCase().replace(/[^a-z0-9_.]/g, '_').replace(/__+/g, '_');
      return true;
    });

    logger.info(
      `[MemoryExtraction] ${rawFacts.length} raw facts → ${validFacts.length} after validation`
    );

    // Persist to user memory
    if (validFacts.length > 0) {
      await UserMemoryService.bulkUpsertFacts(
        orgId,
        automationId,
        externalUserId,
        channel,
        validFacts
      );
    }

    return validFacts;
  }

  // ── LLM Extraction ─────────────────────────────────────────────────────────

  private static async callLLMExtraction(
    history: Array<{ role: 'user' | 'agent'; content: string }>,
    model: 'gemini' | 'groq' | 'openai'
  ): Promise<ExtractedMemoryFact[]> {
    const prompt = MemoryExtractionService.buildExtractionPrompt(history);

    let rawJson = '';

    if (model !== 'groq' && env.geminiApiKey) {
      rawJson = await MemoryExtractionService.callGeminiExtraction(prompt);
    }

    if (!rawJson && env.groqApiKey) {
      rawJson = await MemoryExtractionService.callGroqExtraction(prompt);
    }

    if (!rawJson) {
      // Fallback local pattern extraction when API keys are unconfigured
      return MemoryExtractionService.extractFactsLocally(history);
    }

    try {
      const cleaned = rawJson
        .replace(/```json[\s\S]*?```/gi, (m) => m.slice(7, -3))
        .replace(/```[\s\S]*?```/gi, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed as ExtractedMemoryFact[];
      if (parsed.facts && Array.isArray(parsed.facts)) return parsed.facts;
      return [];
    } catch {
      logger.warn('[MemoryExtraction] Failed to parse LLM JSON output, using local extractor');
      return MemoryExtractionService.extractFactsLocally(history);
    }
  }

  /**
   * Fallback pattern extraction for routine facts when external LLM API is unavailable.
   */
  private static extractFactsLocally(
    history: Array<{ role: 'user' | 'agent'; content: string }>
  ): ExtractedMemoryFact[] {
    const facts: ExtractedMemoryFact[] = [];
    const userMessages = history.filter((m) => m.role === 'user').map((m) => m.content);

    for (const text of userMessages) {
      // Name
      const nameMatch = text.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+)/i);
      if (nameMatch && nameMatch[1]) {
        facts.push({ key: 'profile.name', value: nameMatch[1], confidence: 0.95 });
      }

      // Wake up time
      const wakeMatch = text.match(/(?:wake up|start (?:my|the) day|up at)\s*(?:around|at)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (wakeMatch && wakeMatch[1]) {
        facts.push({ key: 'daily_routine.wake_up_time', value: wakeMatch[1], confidence: 0.85 });
      }

      // Exercise
      if (/workout|run|running|gym|exercise/i.test(text)) {
        const timeMatch = text.match(/in the (morning|evening|afternoon)|at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        facts.push({ key: 'exercise.preferred_time', value: timeMatch ? timeMatch[0] : 'regularly', confidence: 0.8 });
      }

      // Work start time
      const workMatch = text.match(/(?:work at|job at|start work at)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (workMatch && workMatch[1]) {
        facts.push({ key: 'work.start_time', value: workMatch[1], confidence: 0.85 });
      }
    }

    return facts;
  }

  private static buildExtractionPrompt(
    history: Array<{ role: 'user' | 'agent'; content: string }>
  ): string {
    const conversationText = history
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    return `You are a memory extraction engine. Analyze the conversation below and extract any factual, 
long-term information worth remembering about the USER (not the assistant).

Focus on: habits, preferences, schedule, goals, personal details, recurring activities, 
relationships, work, location, health, food preferences, and anything that would help 
personalize future conversations.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  { "key": "daily_routine.wake_up_time", "value": "07:00", "confidence": 0.9 },
  { "key": "exercise.preferred_time", "value": "morning", "confidence": 0.85 },
  { "key": "work.start_time", "value": "10:00", "confidence": 0.8 }
]

Rules:
- Use dot-notation keys (e.g. "daily_routine.wake_up_time", "food.preference", "location.city")
- Only extract facts explicitly stated or strongly implied by the user
- Confidence: 0.7 = implied, 0.85 = clearly stated, 0.95 = explicitly confirmed
- Do NOT extract agent messages, questions, or temporary conversational context
- If nothing worth remembering, return exactly: []

CONVERSATION:
${conversationText}`;
  }

  private static async callGeminiExtraction(prompt: string): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1, // Low temperature for deterministic extraction
          },
        }),
      }
    );

    const data = await response.json();
    if (data.error) throw new Error(`Gemini extraction error: ${data.error.message}`);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private static async callGroqExtraction(prompt: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'groq/compound',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`Groq extraction error: ${data.error.message}`);
    return data.choices?.[0]?.message?.content || '';
  }
}
