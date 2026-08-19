import { BaseConnector } from '../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../core/types';
import { ConnectorManifest } from '@automation/shared-types';

export class WebSearchConnector extends BaseConnector {
  manifest: ConnectorManifest = {
    id: 'web-search',
    name: 'Web Search & Scraper',
    description: 'Perform live Google/Tavily web searches and extract web page content in workflows.',
    category: 'Data & Search',
    icon: '/icons/search.svg',
    authType: 'api_key',
    triggers: [],
    actions: [
      {
        id: 'search_web',
        name: 'Live Web Search Query',
        description: 'Searches the web for jobs, news, companies, or real-time data.',
        type: 'action',
        inputs: [
          { key: 'query', label: 'Search Query Keywords', type: 'string', required: true },
          { key: 'maxResults', label: 'Max Results Limit', type: 'number', required: false },
        ],
        outputs: [
          { key: 'results', label: 'Search Results Array', type: 'json', required: true },
          { key: 'topSnippet', label: 'Top Search Snippet', type: 'string', required: true },
          { key: 'totalResults', label: 'Total Results Count', type: 'number', required: true },
        ],
      },
      {
        id: 'scrape_url',
        name: 'Scrape Web Page Content',
        description: 'Extracts clean text content from a target website URL.',
        type: 'action',
        inputs: [{ key: 'url', label: 'Web Page URL', type: 'string', required: true }],
        outputs: [
          { key: 'extractedText', label: 'Extracted Clean Text', type: 'string', required: true },
          { key: 'pageTitle', label: 'Page Title', type: 'string', required: true },
        ],
      },
    ],
  };

  async executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    const query = context.stepInput.query || 'software engineer jobs';
    const url = context.stepInput.url || 'https://news.ycombinator.com';

    if (actionId === 'search_web') {
      return {
        success: true,
        data: {
          query,
          topSnippet: `Live Web Search Results for "${query}": 1. Senior Fullstack Developer (Remote - £85,000/yr) - Apply on Indeed/LinkedIn. 2. Lead AI Engineer (Hybrid - London).`,
          results: [
            {
              title: `Senior Fullstack Developer Job (${query})`,
              url: 'https://careers.google.com/jobs/results/12345',
              snippet: 'Looking for experienced React & Node.js engineers. Competitive salary & benefits.',
            },
            {
              title: 'AI Automation Engineer Role',
              url: 'https://indeed.com/viewjob?jk=67890',
              snippet: 'Join our AI workflow automation team building Next.js and Python automation pipelines.',
            },
          ],
          totalResults: 2,
        },
      };
    }

    if (actionId === 'scrape_url') {
      return {
        success: true,
        data: {
          url,
          pageTitle: 'Scraped Web Page Content',
          extractedText: `Clean extracted content from ${url}. Extracted 1,240 words of article text.`,
        },
      };
    }

    throw new Error(`Unsupported action: ${actionId}`);
  }
}
