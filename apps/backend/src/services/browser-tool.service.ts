import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface BrowserSessionEntry {
  client: Client;
  transport: StdioClientTransport;
  lastUsed: number;
}

export class BrowserToolService {
  private sessions = new Map<string, BrowserSessionEntry>();
  private sessionQueue: Array<{
    resolve: (entry: BrowserSessionEntry) => void;
    reject: (err: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  private isWarmingUp = false;
  private isWarmedUp = false;

  private get maxSessions(): number {
    return Number(process.env.MAX_BROWSER_SESSIONS || 5);
  }

  /**
   * Non-blocking warmup called on backend startup
   */
  async warmup(): Promise<void> {
    if (this.isWarmingUp || this.isWarmedUp) return;
    this.isWarmingUp = true;
    try {
      logger.info('[BrowserToolService] Warming up Playwright MCP headless browser service...');
      const warmupSession = await this.getSession('warmup_system_session');
      this.isWarmedUp = true;
      logger.info('[BrowserToolService] Playwright MCP service ready.');
      await this.closeSession('warmup_system_session');
    } catch (err: any) {
      logger.warn('[BrowserToolService] Warmup notice:', err?.message || err);
    } finally {
      this.isWarmingUp = false;
    }
  }

  private async createMcpClient(): Promise<BrowserSessionEntry> {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['@playwright/mcp@latest', '--headless', '--isolated'],
    });

    const client = new Client(
      { name: 'autoflow-browser', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    return { client, transport, lastUsed: Date.now() };
  }

  /**
   * Obtains or creates an isolated MCP browser session for the given sessionId
   */
  async getSession(sessionId: string): Promise<BrowserSessionEntry> {
    const sId = sessionId || 'default_session';
    const existing = this.sessions.get(sId);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing;
    }

    if (this.sessions.size >= this.maxSessions) {
      return new Promise<BrowserSessionEntry>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const idx = this.sessionQueue.findIndex((item) => item.timeout === timeout);
          if (idx !== -1) this.sessionQueue.splice(idx, 1);
          reject(new Error('Browser service busy. Please try again in a moment.'));
        }, 30000);
        this.sessionQueue.push({ resolve, reject, timeout });
      });
    }

    try {
      const entry = await this.createMcpClient();
      this.sessions.set(sId, entry);
      return entry;
    } catch (err: any) {
      logger.error(`[BrowserToolService] Failed to launch Playwright MCP session '${sId}':`, err);
      throw new Error(`Browser service unavailable. Ensure Chromium is installed: npx playwright install chromium (${err?.message || 'launch failed'})`);
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const sId = sessionId || 'default_session';
    const entry = this.sessions.get(sId);
    if (entry) {
      try {
        await entry.client.close();
      } catch (e) {}
      this.sessions.delete(sId);
    }

    // Process next queued request if any
    if (this.sessionQueue.length > 0) {
      const next = this.sessionQueue.shift()!;
      clearTimeout(next.timeout);
      const newSessionId = `queued_session_${Date.now()}`;
      this.getSession(newSessionId).then(next.resolve).catch(next.reject);
    }
  }

  async closeAllSessions(): Promise<void> {
    logger.info(`[BrowserToolService] Shutting down ${this.sessions.size} active Playwright MCP session(s)...`);
    for (const [sId, entry] of this.sessions.entries()) {
      try {
        await entry.client.close();
      } catch (e) {}
    }
    this.sessions.clear();
    for (const q of this.sessionQueue) {
      clearTimeout(q.timeout);
      q.reject(new Error('Browser service shutting down.'));
    }
    this.sessionQueue = [];
  }

  /**
   * Executes a tool with a strict per-action timeout
   */
  async callTool(
    sessionId: string,
    toolName: string,
    args: Record<string, any> = {},
    timeoutMs: number = 30000
  ): Promise<any> {
    const entry = await this.getSession(sessionId);
    const hardLimitMs = Math.min(timeoutMs, 60000); // 60s hard cap

    const actionPromise = entry.client.callTool({ name: toolName, arguments: args });
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`BROWSER_TIMEOUT: Action '${toolName}' timed out after ${hardLimitMs / 1000}s`));
      }, hardLimitMs);
    });

    try {
      const result = (await Promise.race([actionPromise, timeoutPromise])) as any;
      return result;
    } catch (err: any) {
      if (err?.message?.includes('BROWSER_TIMEOUT')) {
        // Recycle session on timeout to clear frozen state
        await this.closeSession(sessionId);
      }
      throw err;
    }
  }

  // ─── MCP Result Text Extraction Parsing ────────────────────────────────────

  private extractText(res: any): string {
    if (!res) return '';
    if (typeof res === 'string') return res;
    if (res.content && Array.isArray(res.content)) {
      const textItem = res.content.find((c: any) => c.type === 'text' || typeof c.text === 'string');
      if (textItem?.text) return textItem.text;
    }
    return '';
  }

  private extractResultValue(res: any): string {
    const text = this.extractText(res);
    if (!text) return '';
    const jsonMatch = text.match(/### Result\s*\n\s*"([^"]+)"/);
    if (jsonMatch) return jsonMatch[1];
    const plainMatch = text.match(/### Result\s*\n\s*([^\n]+)/);
    if (plainMatch) return plainMatch[1].replace(/^"|"$/g, '').trim();
    return text.trim();
  }

  // ─── High-Level Helpers ──────────────────────────────────────────────────

  async navigate(sessionId: string, url: string, timeoutMs: number = 10000): Promise<{ finalUrl: string; pageTitle?: string }> {
    await this.callTool(sessionId, 'browser_navigate', { url }, timeoutMs);
    let title = '';
    try {
      const titleRes = await this.callTool(sessionId, 'browser_evaluate', { function: '() => document.title' }, 5000);
      title = this.extractResultValue(titleRes);
    } catch {}
    return { finalUrl: url, pageTitle: title };
  }

  async readPage(sessionId: string, url?: string, timeoutMs: number = 10000): Promise<{ title: string; content: string; links: Array<{ text: string; href: string }> }> {
    if (url) {
      await this.navigate(sessionId, url, 10000);
    }

    const snapshotRes = await this.callTool(sessionId, 'browser_snapshot', {}, timeoutMs);
    const textContent = this.extractText(snapshotRes);

    let title = '';
    try {
      const tRes = await this.callTool(sessionId, 'browser_evaluate', { function: '() => document.title' }, 3000);
      title = this.extractResultValue(tRes);
    } catch {}

    // Extract links from accessibility tree / text
    const links: Array<{ text: string; href: string }> = [];
    const linkMatches = [...textContent.matchAll(/link\s+"([^"]+)"\s+(https?:\/\/[^\s]+)/gi)];
    linkMatches.slice(0, 50).forEach((m) => {
      links.push({ text: m[1], href: m[2] });
    });

    return { title, content: textContent, links };
  }

  async takeScreenshot(
    sessionId: string,
    url?: string,
    options: { fullPage?: boolean; selector?: string; returnAs?: 'base64' | 'description' } = {},
    timeoutMs: number = 10000
  ): Promise<{ imageBase64?: string; description?: string; width: number; height: number }> {
    if (url) {
      await this.navigate(sessionId, url, 10000);
    }

    // Capture screenshot using Playwright MCP
    const shotRes = await this.callTool(sessionId, 'browser_take_screenshot', {
      scale: 'css',
      type: 'jpeg',
      fullPage: options.fullPage !== false,
    }, timeoutMs);

    let base64Data = shotRes?.content?.[0]?.data || '';
    if (!base64Data && typeof shotRes?.content?.[0]?.text === 'string') {
      base64Data = shotRes.content[0].text;
    }

    // Check size cap (2MB) — if larger, retry with viewport only
    if (base64Data && base64Data.length > 2 * 1024 * 1024) {
      logger.warn('[BrowserToolService] Screenshot base64 exceeds 2MB, retrying with viewport crop...');
      const cropRes = await this.callTool(sessionId, 'browser_take_screenshot', {
        scale: 'css',
        type: 'jpeg',
        fullPage: false,
      }, 5000);
      base64Data = cropRes?.content?.[0]?.data || base64Data;
    }

    if (options.returnAs === 'description' && base64Data) {
      try {
        const description = await this.describeScreenshotWithLLM(base64Data);
        return { description, width: 1920, height: 1080 };
      } catch (err: any) {
        logger.warn('[BrowserToolService] Vision LLM description failed, returning base64 string:', err?.message);
      }
    }

    return { imageBase64: base64Data, width: 1920, height: 1080 };
  }

  /**
   * Describes a screenshot using active LLM (Gemini 2.0 Flash or Groq/Anthropic vision)
   */
  private async describeScreenshotWithLLM(base64Data: string): Promise<string> {
    const prompt = 'Describe what you see on this webpage screenshot. Focus on the main content, key text, navigation, and any important data visible.';

    if (env.geminiApiKey) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
              ],
            },
          ],
        }),
      });
      const data: any = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    }

    return 'Screenshot captured successfully.';
  }

  async click(sessionId: string, element: string, timeoutMs: number = 5000): Promise<void> {
    await this.callTool(sessionId, 'browser_click', { target: element }, timeoutMs);
  }

  async type(sessionId: string, element: string, text: string, timeoutMs: number = 5000): Promise<void> {
    await this.callTool(sessionId, 'browser_type', { target: element, text }, timeoutMs);
  }

  async fillForm(
    sessionId: string,
    fields: Array<{ selector?: string; target?: string; name?: string; type?: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'slider'; value: string }>,
    submitElement?: string,
    timeoutMs: number = 15000
  ): Promise<{ success: boolean; resultUrl?: string }> {
    const formattedFields = fields.map((f) => {
      const target = f.target || f.selector || '';
      return {
        target,
        name: f.name || target || 'field',
        type: f.type || 'textbox',
        value: f.value,
      };
    });

    await this.callTool(sessionId, 'browser_fill_form', { fields: formattedFields }, timeoutMs);

    if (submitElement) {
      await this.callTool(sessionId, 'browser_click', { target: submitElement }, 5000);
    }

    return { success: true };
  }

  async searchWeb(
    sessionId: string,
    query: string,
    maxResults: number = 5,
    timeoutMs: number = 15000
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const cleanQuery = query.replace(/^[-_\s]+/, '').trim() || query;
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // Try Instant Answer API first for accurate entity abstracts
    try {
      const instantRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json`);
      const instantData: any = await instantRes.json();
      if (instantData?.AbstractText && instantData.AbstractText.length > 10) {
        results.push({
          title: instantData.Heading || `${cleanQuery} Overview`,
          url: instantData.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
          snippet: instantData.AbstractText,
        });
      }
    } catch {}

    try {
      const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      const html = await res.text();

      const titleRegex = /<a [^>]*class="[^"]*result__a[^"]*" [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<(?:td|a|div)\s+[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:td|a|div)>/gi;
      const snippets: string[] = [];
      let snipMatch;
      while ((snipMatch = snippetRegex.exec(html)) !== null) {
        const cleanSnippetText = snipMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (cleanSnippetText.length > 5) {
          snippets.push(cleanSnippetText);
        }
      }

      let match;
      let idx = 0;
      while ((match = titleRegex.exec(html)) !== null) {
        let url = match[1];
        if (url.includes('uddg=')) {
          try {
            url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          } catch {}
        }
        if (url.startsWith('//')) url = `https:${url}`;

        const title = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const snippet = snippets[idx] || `Information regarding "${title}".`;
        if (url && title && !url.includes('duckduckgo.com/l/?')) {
          if (!results.some((r) => r.url === url)) {
            results.push({ title, url, snippet });
          }
        }
        idx++;
      }

      if (results.length > 0) {
        return results.slice(0, maxResults);
      }
    } catch (err: any) {
      logger.warn('[BrowserToolService] HTTP fetch search failed, falling back to browser navigation:', err?.message);
    }

    // Fallback: Headless Playwright search
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    await this.navigate(sessionId, ddgUrl, timeoutMs);
    const snapshot = await this.readPage(sessionId, undefined, 5000);

    const fallbackResults: Array<{ title: string; url: string; snippet: string }> = [];
    const linkMatches = [...snapshot.content.matchAll(/link\s+"([^"]+)"\s+(https?:\/\/[^\s]+)/gi)];

    linkMatches.slice(0, maxResults * 2).forEach((m) => {
      const href = m[2];
      const text = m[1];
      if (href && !href.includes('duckduckgo.com') && text.length > 3) {
        fallbackResults.push({
          title: text,
          url: href,
          snippet: `DuckDuckGo Web Search result for "${query}": ${text}`,
        });
      }
    });

    return fallbackResults.slice(0, maxResults);
  }

  async runJavaScript(sessionId: string, script: string, timeoutMs: number = 5000): Promise<any> {
    const fnStr = script.startsWith('(') || script.startsWith('async') ? script : `() => { ${script} }`;
    const res = await this.callTool(sessionId, 'browser_evaluate', { function: fnStr }, timeoutMs);
    return res?.content?.[0]?.text || res;
  }
}

export const browserToolService = new BrowserToolService();
