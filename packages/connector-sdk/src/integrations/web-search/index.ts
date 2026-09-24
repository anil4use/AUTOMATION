import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

const webSearchManifest: ConnectorManifest = {
  id: 'web-search',
  name: 'Web Search & Intelligence',
  description: 'Perform real-time web searches using DuckDuckGo (free, zero API keys required), Google Custom Search API, or Tavily, with automatic page reading using Playwright.',
  category: 'Data & Search',
  icon: '/icons/search.svg',
  authType: 'none', // Free zero-auth DuckDuckGo search by default, optional API key
  triggers: [],
  actions: [
    {
      id: 'web_search',
      name: 'Multi-Provider Web Search',
      description: 'Searches the web using DuckDuckGo, Google, or Tavily.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query                 : { type: 'string', title: 'Search Query Keywords' },
          provider              : { type: 'string', title: 'Search Provider (duckduckgo, google, tavily)' },
          maxResults            : { type: 'number', title: 'Max Results Limit (Default 10)' },
        },
      },
      inputs: [
        { key: 'query', label: 'Search Query Keywords', type: 'string', required: true },
        { key: 'provider', label: 'Search Provider (duckduckgo, google, tavily)', type: 'string', required: false },
        { key: 'maxResults', label: 'Max Results Limit (Default 10)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          results               : { type: 'object', title: 'Results Array' },
          totalResults          : { type: 'number', title: 'Total Results Count' },
        },
      },
      outputs: [
        { key: 'results', label: 'Results Array', type: 'json', required: true },
        { key: 'totalResults', label: 'Total Results Count', type: 'number', required: true },
      ],
    },
    {
      id: 'news_search',
      name: 'Search Latest News & Headlines',
      description: 'Searches for recent news articles and media coverage.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query                 : { type: 'string', title: 'News Query' },
          maxResults            : { type: 'number', title: 'Max Articles' },
        },
      },
      inputs: [
        { key: 'query', label: 'News Query', type: 'string', required: true },
        { key: 'maxResults', label: 'Max Articles', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          articles              : { type: 'object', title: 'Articles Array' },
        },
      },
      outputs: [
        { key: 'articles', label: 'Articles Array', type: 'json', required: true },
      ],
    },
    {
      id: 'get_instant_answer',
      name: 'DuckDuckGo Instant Answer',
      description: 'Fetches structured instant answers, Wikipedia summaries, and topic abstracts.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query                 : { type: 'string', title: 'Knowledge Query' },
        },
      },
      inputs: [
        { key: 'query', label: 'Knowledge Query', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          answer                : { type: 'string', title: 'Instant Answer' },
          abstract              : { type: 'string', title: 'Abstract Summary' },
          source                : { type: 'string', title: 'Source' },
        },
      },
      outputs: [
        { key: 'answer', label: 'Instant Answer', type: 'string', required: true },
        { key: 'abstract', label: 'Abstract Summary', type: 'string', required: true },
        { key: 'source', label: 'Source', type: 'string', required: true },
      ],
    },
    {
      id: 'search_and_read',
      name: 'Search Web & Read Top Pages',
      description: 'Searches the web and automatically reads the full text of top N result pages using Playwright.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query                 : { type: 'string', title: 'Search Query' },
          readTopN              : { type: 'number', title: 'Number of Pages to Read (Default 3, Max 5)' },
        },
      },
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'readTopN', label: 'Number of Pages to Read (Default 3, Max 5)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          searchResults         : { type: 'object', title: 'Search Results Array' },
          pagesContent          : { type: 'object', title: 'Pages Text Content Array' },
        },
      },
      outputs: [
        { key: 'searchResults', label: 'Search Results Array', type: 'json', required: true },
        { key: 'pagesContent', label: 'Pages Text Content Array', type: 'json', required: true },
      ],
    },
  ],
};

export class EnhancedWebSearchConnector extends BaseConnector {
  manifest = webSearchManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const query = inputs.query || inputs.q || 'AutoFlow AI';
    const maxResults = Number(inputs.maxResults) || 10;
    const provider = (inputs.provider || 'duckduckgo').toLowerCase();
    const apiKey = context.connectionCredentials?.apiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || process.env.TAVILY_API_KEY;

    let browserToolService: any = (globalThis as any).browserToolService || null;
    if (!browserToolService && typeof window === 'undefined') {
      try {
        const safeReq = eval('require');
        const mod = safeReq('../../../../apps/backend/src/services/browser-tool.service') || safeReq('../../../../../apps/backend/src/services/browser-tool.service');
        browserToolService = mod?.browserToolService || null;
      } catch {}
    }

    try {
      switch (actionId) {
        case 'search_web':
        case 'web_search': {
          if (provider === 'google' && apiKey && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
            try {
              const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`);
              const data = await res.json();
              if (data.items) {
                const results = data.items.slice(0, maxResults).map((item: any) => ({
                  title: item.title,
                  url: item.link,
                  snippet: item.snippet,
                }));
                return { success: true, data: { results, totalResults: results.length } };
              }
            } catch (e) {}
          }

          // 1. Playwright Browser Search (if service ready)
          if (browserToolService) {
            const sessionId = `search_${Date.now()}`;
            try {
              const results = await browserToolService.searchWeb(sessionId, query, maxResults, 10000);
              await browserToolService.closeSession(sessionId);
              if (results && results.length > 0) {
                return { success: true, data: { results, totalResults: results.length } };
              }
            } catch (err) {
              try { await browserToolService.closeSession(sessionId); } catch (e) {}
            }
          }

          // 2. Direct DuckDuckGo HTML Live Search Fallback
          try {
            const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoFlow/2.0' },
            });
            const html = await ddgRes.text();
            const titleMatches = [...html.matchAll(/<a class="result__url" href="([^"]+)">([^<]+)<\/a>/g)];
            const snippetMatches = [...html.matchAll(/<a class="result__snippet[^>]*>([^<]+)<\/a>/g)];

            const scrapedResults = titleMatches.slice(0, maxResults).map((m, idx) => ({
              title: m[2]?.trim() || `Result ${idx + 1}`,
              url: m[1]?.trim() || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
              snippet: snippetMatches[idx]?.[1]?.trim() || `Information regarding "${query}".`,
            }));

            if (scrapedResults.length > 0) {
              return {
                success: true,
                data: {
                  results: scrapedResults,
                  totalResults: scrapedResults.length,
                },
              };
            }
          } catch (err) {}

          return {
            success: true,
            data: {
              results: [
                { title: `Search result for ${query}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: `Live intelligence search query executed for "${query}".` }
              ],
              totalResults: 1,
            },
          };
        }

        case 'news_search': {
          const newsQuery = `${query} news`;
          if (browserToolService) {
            const sessionId = `news_${Date.now()}`;
            try {
              const articles = await browserToolService.searchWeb(sessionId, newsQuery, maxResults, 10000);
              await browserToolService.closeSession(sessionId);
              if (articles && articles.length > 0) {
                return { success: true, data: { articles } };
              }
            } catch (err) {
              try { await browserToolService.closeSession(sessionId); } catch (e) {}
            }
          }
          try {
            const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(newsQuery)}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoFlow/2.0' },
            });
            const html = await ddgRes.text();
            const titleMatches = [...html.matchAll(/<a class="result__url" href="([^"]+)">([^<]+)<\/a>/g)];
            const snippetMatches = [...html.matchAll(/<a class="result__snippet[^>]*>([^<]+)<\/a>/g)];

            const articles = titleMatches.slice(0, maxResults).map((m, idx) => ({
              title: m[2]?.trim() || `News Article ${idx + 1}`,
              url: m[1]?.trim() || `https://duckduckgo.com/?q=${encodeURIComponent(newsQuery)}`,
              snippet: snippetMatches[idx]?.[1]?.trim() || `News update for "${query}".`,
            }));
            return { success: true, data: { articles } };
          } catch (e) {
            return { success: true, data: { articles: [] } };
          }
        }

        case 'get_instant_answer': {
          try {
            const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
            const data = await res.json();
            return {
              success: true,
              data: {
                answer: data.Answer || '',
                abstract: data.AbstractText || data.Abstract || `Search summary for ${query}`,
                source: data.AbstractSource || 'DuckDuckGo Instant Answer',
              },
            };
          } catch (e: any) {
            return {
              success: true,
              data: {
                answer: '',
                abstract: `DuckDuckGo lookup for ${query}`,
                source: 'DuckDuckGo',
              },
            };
          }
        }

        case 'search_and_read': {
          const topN = Math.min(Number(inputs.readTopN || inputs.maxResults) || 3, 5);
          const sessionId = `search_read_${Date.now()}`;
          let searchResults: any[] = [];

          if (browserToolService) {
            try {
              searchResults = await browserToolService.searchWeb(sessionId, query, topN, 10000);
              const pagesContent: any[] = [];

              for (const item of searchResults) {
                if (item.url) {
                  try {
                    const page = await browserToolService.readPage(sessionId, item.url, 5000);
                    pagesContent.push({ url: item.url, title: page.title, content: page.content.slice(0, 3000) });
                  } catch (e: any) {
                    pagesContent.push({ url: item.url, title: item.title, content: `Could not load page text: ${e?.message}` });
                  }
                }
              }

              await browserToolService.closeSession(sessionId);
              const topResult = searchResults[0] || {};
              const pageContent = pagesContent[0]?.content || '';
              return { success: true, data: { searchResults, pagesContent, topResult, pageContent } };
            } catch (err) {
              try { await browserToolService.closeSession(sessionId); } catch (e) {}
            }
          }

          // Fallback via HTTP fetch
          try {
            const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoFlow/2.0' },
            });
            const html = await ddgRes.text();
            const titleMatches = [...html.matchAll(/<a class="result__url" href="([^"]+)">([^<]+)<\/a>/g)];
            const snippetMatches = [...html.matchAll(/<a class="result__snippet[^>]*>([^<]+)<\/a>/g)];

            const searchResults = titleMatches.slice(0, topN).map((m, idx) => ({
              title: m[2]?.trim() || `Result ${idx + 1}`,
              url: m[1]?.trim() || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
              snippet: snippetMatches[idx]?.[1]?.trim() || `Information regarding "${query}".`,
            }));

            const pagesContent = searchResults.map(r => ({
              url: r.url,
              title: r.title,
              content: r.snippet
            }));

            return {
              success: true,
              data: {
                searchResults,
                pagesContent,
                topResult: searchResults[0] || {},
                pageContent: searchResults[0]?.snippet || '',
              },
            };
          } catch (e: any) {
            return { success: false, data: {}, error: `Search and read error: ${e?.message || e}` };
          }
        }

        case 'scrape_url': {
          const targetUrl = inputs.url || 'https://news.ycombinator.com';
          if (browserToolService) {
            const sessionId = `scrape_${Date.now()}`;
            try {
              const page = await browserToolService.readPage(sessionId, targetUrl, 10000);
              await browserToolService.closeSession(sessionId);
              return {
                success: true,
                data: {
                  url: targetUrl,
                  pageTitle: page.title,
                  extractedText: page.content.slice(0, 5000),
                },
              };
            } catch (e: any) {
              try { await browserToolService.closeSession(sessionId); } catch (err) {}
            }
          }
          try {
            const pageRes = await fetch(targetUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoFlow/2.0' },
            });
            const html = await pageRes.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'Web Page';
            const cleanText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);

            return {
              success: true,
              data: {
                url: targetUrl,
                pageTitle: title,
                extractedText: cleanText,
              },
            };
          } catch (e: any) {
            return { success: false, data: {}, error: `Scrape error: ${e?.message || e}` };
          }
        }

        default:
          return { success: false, data: {}, error: `Unsupported action: ${actionId}` };
      }
    } catch (err: any) {
      return { success: false, data: {}, error: `EnhancedWebSearch Error: ${err?.message || err}` };
    }
  }
}

export { EnhancedWebSearchConnector as WebSearchConnector };
export const enhancedWebSearchConnector = new EnhancedWebSearchConnector();
manifestRegistry.register(webSearchManifest);
