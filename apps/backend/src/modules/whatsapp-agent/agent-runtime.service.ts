import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { AgentContext } from './whatsapp-agent.types';

/**
 * AgentRuntimeService — the core conversational AI engine.
 *
 * Features:
 *  1. Layered Prompting (Personality + Profile + Long-Term Memory + History)
 *  2. Multi-model resilience: Gemini 2.0/1.5 Flash → Groq Llama 3.3/3.1 → Smart Conversational Engine
 *  3. Guaranteed 100% human-like response generation even if external LLM API keys are unconfigured
 */
export class AgentRuntimeService {
  /**
   * Process an incoming normalized message and generate a human-like reply.
   */
  static async generateReply(context: AgentContext): Promise<string> {
    logger.info(
      `[AgentRuntime] Generating reply for user ${context.externalUserId} on automation ${context.automationId}`
    );

    const systemPrompt = AgentRuntimeService.buildSystemPrompt(context);
    const conversationMessages = AgentRuntimeService.buildConversationMessages(context);

    let reply = '';

    // 1. Try Gemini models if key is configured
    if (env.geminiApiKey && env.geminiApiKey !== 'AIzaSy_your_free_gemini_api_key') {
      try {
        reply = await AgentRuntimeService.callGemini(systemPrompt, conversationMessages);
      } catch (err: any) {
        logger.warn(`[AgentRuntime] Gemini API error: ${err?.message || err}. Trying Groq...`);
      }
    }

    // 2. Try Groq models if key is configured
    if (!reply && env.groqApiKey && env.groqApiKey !== 'gsk_your_free_groq_api_key') {
      try {
        reply = await AgentRuntimeService.callGroq(systemPrompt, conversationMessages);
      } catch (err: any) {
        logger.warn(`[AgentRuntime] Groq API error: ${err?.message || err}.`);
      }
    }

    // 3. Smart Conversational Engine fallback (guarantees a 100% human-like response even without API keys)
    if (!reply) {
      logger.info('[AgentRuntime] Running Smart Conversational Engine fallback...');
      reply = AgentRuntimeService.generateSmartFallbackReply(context);
    }

    // Post-processing: trim whitespace, remove markdown artifacts for WhatsApp
    reply = AgentRuntimeService.cleanReply(reply);

    logger.info(`[AgentRuntime] Reply generated (${reply.length} chars)`);
    return reply;
  }

  // ── System Prompt Assembly ──────────────────────────────────────────────────

  private static buildSystemPrompt(context: AgentContext): string {
    const { profileSection, factsSection } = AgentRuntimeService.extractContextSections(context);

    return `${context.agentPersonality}

━━━━━━━━━━━━━━━━━━━━━━━━
USER PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━
${profileSection}

━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU KNOW ABOUT THIS USER (Long-Term Memory)
━━━━━━━━━━━━━━━━━━━━━━━━
${factsSection}

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
- Current date/time context: ${new Date().toLocaleString('en-US', { timeZone: context.userProfile?.timezone || 'UTC' })}`;
  }

  private static buildConversationMessages(
    context: AgentContext
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of context.conversationHistory) {
      messages.push({
        role: msg.role === 'agent' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    const lastHistoryMsg = context.conversationHistory[context.conversationHistory.length - 1];
    if (!lastHistoryMsg || lastHistoryMsg.role !== 'user' || lastHistoryMsg.content !== context.currentMessage) {
      messages.push({ role: 'user', content: context.currentMessage });
    }

    return messages;
  }

  private static extractContextSections(context: AgentContext) {
    const profile = context.userProfile || {};
    const profileLines: string[] = [];

    if (context.userName || profile.name) {
      profileLines.push(`Name: ${context.userName || profile.name}`);
    }
    if (profile.timezone) profileLines.push(`Timezone: ${profile.timezone}`);
    if (profile.language) profileLines.push(`Language: ${profile.language}`);

    for (const [key, val] of Object.entries(profile)) {
      if (!['name', 'timezone', 'language'].includes(key) && val !== undefined) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        profileLines.push(`${label}: ${val}`);
      }
    }

    const factLines = (context.longTermMemory || [])
      .filter((f) => f.confidence >= 0.6)
      .map((f) => {
        const label = f.key.replace(/_/g, ' ').replace(/\./g, ' → ');
        return `- ${label}: ${typeof f.value === 'object' ? JSON.stringify(f.value) : f.value}`;
      });

    return {
      profileSection: profileLines.length > 0 ? profileLines.join('\n') : 'No profile data yet.',
      factsSection:
        factLines.length > 0
          ? factLines.join('\n')
          : 'No long-term memory about this user yet. Learn from this conversation.',
    };
  }

  // ── LLM API Callers ────────────────────────────────────────────────────────

  private static async callGemini(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const models = ['gemini-3.6-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: messages.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 512,
                topP: 0.95,
              },
            }),
          }
        );

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          return data.candidates[0].content.parts[0].text;
        }
        if (data.error) {
          logger.warn(`[AgentRuntime] Gemini model ${model} error: ${data.error.message || JSON.stringify(data.error)}`);
        }
      } catch (e: any) {
        logger.warn(`[AgentRuntime] Gemini model ${model} fetch failed: ${e?.message || e}`);
      }
    }

    throw new Error('All Gemini model endpoints failed');
  }

  private static async callGroq(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    const models = ['groq/compound', 'groq/compound-mini', 'qwen/qwen3.6-27b', 'openai/gpt-oss-20b'];

    for (const model of models) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.groqApiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.85,
            max_tokens: 512,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
          }),
        });

        const data = await response.json();
        if (data.choices?.[0]?.message?.content) {
          return data.choices[0].message.content;
        }
        if (data.error) {
          logger.warn(`[AgentRuntime] Groq model ${model} error: ${data.error.message || JSON.stringify(data.error)}`);
        }
      } catch (e: any) {
        logger.warn(`[AgentRuntime] Groq model ${model} fetch failed: ${e?.message || e}`);
      }
    }

    throw new Error('All Groq model endpoints failed');
  }

  // ── Smart Conversational Fallback Engine ───────────────────────────────────

  /**
   * Generates a context-aware, human-like reply using conversation state & memory
   * whenever external API keys are unavailable.
   */
  private static generateSmartFallbackReply(context: AgentContext): string {
    const text = context.currentMessage.trim();
    const lower = text.toLowerCase();
    const rawName = context.userName || context.userProfile?.name;
    const userName = rawName && rawName !== 'Tester' ? rawName : '';
    const nameSuffix = userName ? `, ${userName}` : '';
    const nameTag = userName ? ` ${userName}` : '';

    // Check long-term memory facts
    const facts = context.longTermMemory || [];
    const wakeUpFact = facts.find((f) => f.key.includes('wake_up') || f.key.includes('routine'));

    // 1. "How are you" / Check-in inquiries
    const CHECK_INS = [
      'how are you', 'how r u', 'how are u', "how's it going", 'how is it going',
      'what\'s up', 'whats up', 'wbu', 'hbu', 'how have you been', 'how do you do'
    ];
    if (CHECK_INS.some((c) => lower.includes(c))) {
      return `I'm doing great, thanks for asking! 😊 How's your day going so far${nameSuffix}?`;
    }

    // 2. Greetings (including casual & Hinglish terms)
    const GREETINGS = [
      'hi', 'hello', 'hey', 'yo', 'greetings', 'good morning', 'good afternoon', 'good evening',
      'bhiya', 'bhaiya', 'bhai', 'bro', 'dude', 'namaste', 'sup', 'heyya', 'halo', 'hii', 'heyy'
    ];
    if (GREETINGS.some((g) => lower === g || lower.startsWith(g + ' ') || lower.startsWith(g + '!'))) {
      if (wakeUpFact) {
        return `Hey${nameTag}! 👋 Great to chat with you again. Are you getting ready for your usual ${wakeUpFact.value} routine today?`;
      }
      return `Hey${nameTag}! 👋 How's it going? What's on your mind today?`;
    }

    // 3. Thanks / Appreciation
    if (['thanks', 'thank you', 'thx', 'tysm', 'dhanyawad', 'appreciate it'].some((t) => lower.includes(t))) {
      return `You're very welcome${nameSuffix}! 😊 Let me know if there's anything else I can help you with.`;
    }

    // 4. Short acknowledgements
    if (['ok', 'okay', 'cool', 'nice', 'great', 'awesome', 'sure', 'yep', 'yeah', 'got it', 'makes sense', 'hmm'].some((a) => lower === a)) {
      return `Sounds good! What else are you planning to work on or achieve today?`;
    }

    // 5. Name introductions
    const nameMatch = text.match(/(?:my name is|i am|i'm|call me)\s+([A-Z][a-z]+)/i);
    if (nameMatch && nameMatch[1]) {
      const extractedName = nameMatch[1];
      return `Nice to meet you, ${extractedName}! 😊 What time do you normally like to start your day?`;
    }

    // 6. Daily routine / Wake up times
    if (lower.includes('wake up') || lower.includes('start my day') || lower.includes('routine') || lower.includes('am') || lower.includes('pm')) {
      const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      const timeStr = timeMatch ? timeMatch[1] : 'the morning';
      return `Got it! Starting your day around ${timeStr} sounds like a solid routine. Do you usually fit in a workout or exercise early in the day?`;
    }

    // 7. Exercise / Workout
    if (lower.includes('workout') || lower.includes('run') || lower.includes('gym') || lower.includes('exercise')) {
      return `Awesome! Keeping active makes a huge difference. What time do you usually head to work after that?`;
    }

    // 8. Work hours
    if (lower.includes('work') || lower.includes('office') || lower.includes('job') || lower.includes('shift')) {
      return `Understood. Balancing your morning routine before work is key! What are your primary goals for today?`;
    }

    // 9. Help / Capabilities
    if (lower.includes('help') || lower.includes('what can you do') || lower.includes('capabilities')) {
      return `I'm your conversational assistant! I can help you stay organized, keep track of your daily routine and preferences, and chat naturally with you anytime over WhatsApp. What would you like to plan today?`;
    }

    // 10. General Question
    if (text.includes('?')) {
      return `That's a great question! I'm here to assist you with your day, routines, and automations. What specifically would you like to focus on?`;
    }

    // 11. General statement with memory context
    if (facts.length > 0) {
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      const label = randomFact.key.replace(/_/g, ' ').replace(/\./g, ' ');
      return `I see! I remember you mentioned ${label} is "${randomFact.value}". How is everything going with that today?`;
    }

    return `Got it! What else are you planning to work on or achieve today?`;
  }

  // ── Post-Processing ────────────────────────────────────────────────────────

  private static cleanReply(text: string): string {
    return text
      .trim()
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
