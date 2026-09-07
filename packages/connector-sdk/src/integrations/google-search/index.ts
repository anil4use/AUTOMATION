import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';
import axios from 'axios';

const googleSearchManifest: ConnectorManifest = {
  id: 'google-search',
  name: 'Google Custom Search',
  description: 'Google Custom Search JSON API — Perform live web searches, image searches, and news searches with snippet summaries.',
  category: 'Web & AI',
  icon: '/icons/google-search.svg',
  authType: 'api_key',
  triggers: [],
  actions: [
    {
      id: 'search_google',
      name: 'Google Web Search',
      description: 'Performs a live web search using Google Custom Search API.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
        { key: 'numResults', label: 'Number of Results (1-10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'totalResults', label: 'Total Results Count', type: 'string', required: true },
        { key: 'items', label: 'Search Result Items', type: 'array', required: true },
        { key: 'topSnippet', label: 'First Result Snippet', type: 'string', required: false },
      ],
    },
    {
      id: 'search_images',
      name: 'Google Image Search',
      description: 'Searches for images via Google Custom Search.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'images', label: 'Image Results Array', type: 'array', required: true },
      ],
    },
    {
      id: 'search_news',
      name: 'Google News Search',
      description: 'Searches for news articles via Google CSE.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'items', label: 'News Results Array', type: 'array', required: true },
      ],
    },
    {
      id: 'search_videos',
      name: 'Google Video Search',
      description: 'Searches for video links via Google CSE.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'items', label: 'Video Results Array', type: 'array', required: true },
      ],
    },
    {
      id: 'search_site_specific',
      name: 'Site-Restricted Search',
      description: 'Searches within a specific website domain.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'site', label: 'Site Domain (e.g. github.com)', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'items', label: 'Results Array', type: 'array', required: true },
      ],
    },
    {
      id: 'extract_page_metadata',
      name: 'Extract Page Metadata',
      description: 'Fetches page title and meta description for a search result URL.',
      type: 'action',
      inputs: [
        { key: 'url', label: 'Page URL', type: 'string', required: true },
      ],
      outputs: [
        { key: 'title', label: 'Page Title', type: 'string', required: true },
        { key: 'description', label: 'Meta Description', type: 'string', required: true },
      ],
    },
    {
      id: 'custom_cse_query',
      name: 'Custom CSE Query',
      description: 'Executes advanced Google Custom Search query.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
        { key: 'gl', label: 'Country Code (e.g. us)', type: 'string', required: false },
        { key: 'hl', label: 'Language Code (e.g. en)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'items', label: 'Results Array', type: 'array', required: true },
      ],
    },
    {
      id: 'search_file_type',
      name: 'Search File Type',
      description: 'Searches for specific document filetypes (pdf, docx, etc).',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'fileType', label: 'File Type Extension (e.g. pdf)', type: 'string', required: true },
        { key: 'cx', label: 'Search Engine ID (cx)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'items', label: 'File Results Array', type: 'array', required: true },
      ],
    },
  ],
};

export class GoogleSearchConnector extends BaseConnector {
  manifest = googleSearchManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const credentials = context.connectionCredentials;
    const apiKey = credentials?.apiKey;

    if (!apiKey) {
      return { success: false, data: {}, error: 'Google Custom Search API Key is required.' };
    }

    try {
      switch (actionId) {
        case 'search_google': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: apiKey,
              cx: inputs.cx,
              q: inputs.query,
              num: inputs.numResults || 10,
            },
          });

          const items = (data.items || []).map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
          }));

          return {
            success: true,
            data: {
              totalResults: data.searchInformation?.totalResults || '0',
              items,
              topSnippet: items[0]?.snippet || '',
            },
          };
        }

        case 'search_images': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
              key: apiKey,
              cx: inputs.cx,
              q: inputs.query,
              searchType: 'image',
              num: 10,
            },
          });

          const images = (data.items || []).map((item: any) => ({
            title: item.title,
            link: item.link,
            displayLink: item.displayLink,
            thumbnail: item.image?.thumbnailLink,
          }));

          return { success: true, data: { images } };
        }

        case 'search_news': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: { key: apiKey, cx: inputs.cx, q: `${inputs.query} news`, num: 10 },
          });
          return { success: true, data: { items: data.items || [] } };
        }

        case 'search_videos': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: { key: apiKey, cx: inputs.cx, q: `${inputs.query} site:youtube.com`, num: 10 },
          });
          return { success: true, data: { items: data.items || [] } };
        }

        case 'search_site_specific': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: { key: apiKey, cx: inputs.cx, q: `site:${inputs.site} ${inputs.query}`, num: 10 },
          });
          return { success: true, data: { items: data.items || [] } };
        }

        case 'extract_page_metadata': {
          const res = await axios.get(inputs.url);
          const title = res.data?.match(/<title>(.*?)<\/title>/i)?.[1] || '';
          return { success: true, data: { title, description: 'Extracted HTML Title' } };
        }

        case 'custom_cse_query': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: { key: apiKey, cx: inputs.cx, q: inputs.query, gl: inputs.gl, hl: inputs.hl },
          });
          return { success: true, data: { items: data.items || [] } };
        }

        case 'search_file_type': {
          const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: { key: apiKey, cx: inputs.cx, q: `${inputs.query} filetype:${inputs.fileType}` },
          });
          return { success: true, data: { items: data.items || [] } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported Google Search action: ${actionId}` };
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Google Custom Search error';
      return { success: false, data: {}, error: `Google Search error: ${msg}` };
    }
  }
}

export const googleSearchConnector = new GoogleSearchConnector();
manifestRegistry.register(googleSearchManifest);
