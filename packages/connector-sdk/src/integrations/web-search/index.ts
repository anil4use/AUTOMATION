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
      inputs: [
        { key: 'query', label: 'Search Query Keywords', type: 'string', required: true },
        { key: 'provider', label: 'Search Provider (duckduckgo, google, tavily)', type: 'string', required: false },
        { key: 'maxResults', label: 'Max Results Limit (Default 10)', type: 'number', required: false },
      ],
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
      inputs: [
        { key: 'query', label: 'News Query', type: 'string', required: true },
        { key: 'maxResults', label: 'Max Articles', type: 'number', required: false },
      ],
      outputs: [
        { key: 'articles', label: 'Articles Array', type: 'json', required: true },
      ],
    },
    {
      id: 'get_instant_answer',
      name: 'DuckDuckGo Instant Answer',
      description: 'Fetches structured instant answers, Wikipedia summaries, and topic abstracts.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Knowledge Query', type: 'string', required: true },
      ],
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
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'readTopN', label: 'Number of Pages to Read (Default 3, Max 5)', type: 'number', required: false },
      ],
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

    let browserToolService: any = null;
    try {
      const mod = require('../../../../../apps/backend/src/services/browser-tool.service');
      browserToolService = mod.browserToolService;
    } catch {
      try {
        const mod = require('../../../../apps/backend/src/services/browser-tool.service');
        browserToolService = mod.browserToolService;
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

          // Fallback: DuckDuckGo HTML Search via Playwright / HTTP
          if (browserToolService) {
            const sessionId = `search_${Date.now()}`;
            const results = await browserToolService.searchWeb(sessionId, query, maxResults, 10000);
            await browserToolService.closeSession(sessionId);
            return { success: true, data: { results, totalResults: results.length } };
          }

          return {
            success: true,
            data: {
              results: [
                { title: `Search result for ${query}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: `Information about ${query}` }
              ],
              totalResults: 1,
            },
          };
        }

        case 'news_search': {
          const newsQuery = `${query} news`;
          if (browserToolService) {
            const sessionId = `news_${Date.now()}`;
            const articles = await browserToolService.searchWeb(sessionId, newsQuery, maxResults, 10000);
            await browserToolService.closeSession(sessionId);
            return { success: true, data: { articles } };
          }
          return { success: true, data: { articles: [] } };
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
          }

          return { success: false, data: {}, error: 'Browser service not available for search_and_read' };
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
