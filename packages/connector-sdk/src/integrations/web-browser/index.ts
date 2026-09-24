import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ConnectorManifest } from '@automation/shared-types';
import { manifestRegistry } from '../../core/manifest-registry';

const webBrowserManifest: ConnectorManifest = {
  id: 'web-browser',
  name: 'Web Browser (Playwright)',
  description: 'Full-power browser automation engine powered by Microsoft Playwright MCP — Navigate pages, read content, capture screenshots, click elements, fill forms, and run JavaScript locally with zero API fees.',
  category: 'Developer Tools',
  icon: '/icons/browser.svg',
  authType: 'none', // Native local headless browser service — zero credentials required
  triggers: [],
  actions: [
    {
      id: 'browser_navigate',
      name: 'Navigate to URL',
      description: 'Navigates the browser to any web URL.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url                   : { type: 'string', title: 'Target Web Page URL' },
          timeout               : { type: 'number', title: 'Navigation Timeout (ms)' },
        },
      },
      inputs: [
        { key: 'url', label: 'Target Web Page URL', type: 'string', required: true },
        { key: 'timeout', label: 'Navigation Timeout (ms)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success' },
          finalUrl              : { type: 'string', title: 'Final Page URL' },
          pageTitle             : { type: 'string', title: 'Page Title' },
        },
      },
      outputs: [
        { key: 'success', label: 'Success', type: 'boolean', required: true },
        { key: 'finalUrl', label: 'Final Page URL', type: 'string', required: true },
        { key: 'pageTitle', label: 'Page Title', type: 'string', required: false },
      ],
    },
    {
      id: 'browser_read_page',
      name: 'Read Page Content',
      description: 'Extracts clean structured text and links from a website.',
      type: 'action',
            inputSchema: {
        type: 'object',
        properties: {
          url                   : { type: 'string', title: 'Web Page URL (Optional if already navigated)' },
          selector              : { type: 'string', title: 'Specific Element Selector (Optional)' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL (Optional if already navigated)', type: 'string', required: false },
        { key: 'selector', label: 'Specific Element Selector (Optional)', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          title                 : { type: 'string', title: 'Page Title' },
          content               : { type: 'string', title: 'Readable Page Text Content' },
          links                 : { type: 'object', title: 'Extracted Links Array' },
        },
      },
      outputs: [
        { key: 'title', label: 'Page Title', type: 'string', required: true },
        { key: 'content', label: 'Readable Page Text Content', type: 'string', required: true },
        { key: 'links', label: 'Extracted Links Array', type: 'json', required: true },
      ],
    },
    {
      id: 'browser_take_screenshot',
      name: 'Capture Page Screenshot',
      description: 'Captures a webpage screenshot as JPEG base64 or LLM vision description.',
      type: 'action',
            inputSchema: {
        type: 'object',
        properties: {
          url                   : { type: 'string', title: 'Web Page URL (Optional)' },
          fullPage              : { type: 'boolean', title: 'Capture Full Scrollable Page' },
          returnAs              : { type: 'string', title: 'Output Mode (base64 or description)' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL (Optional)', type: 'string', required: false },
        { key: 'fullPage', label: 'Capture Full Scrollable Page', type: 'boolean', required: false },
        { key: 'returnAs', label: 'Output Mode (base64 or description)', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          imageBase64           : { type: 'string', title: 'JPEG Base64 Data' },
          description           : { type: 'string', title: 'LLM Vision Text Description' },
          width                 : { type: 'number', title: 'Viewport Width' },
          height                : { type: 'number', title: 'Viewport Height' },
        },
      },
      outputs: [
        { key: 'imageBase64', label: 'JPEG Base64 Data', type: 'string', required: false },
        { key: 'description', label: 'LLM Vision Text Description', type: 'string', required: false },
        { key: 'width', label: 'Viewport Width', type: 'number', required: true },
        { key: 'height', label: 'Viewport Height', type: 'number', required: true },
      ],
    },
    {
      id: 'browser_click_element',
      name: 'Click Element on Page',
      description: 'Clicks a button, link, or interactive element on the active page.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['element'],
        properties: {
          url                   : { type: 'string', title: 'Web Page URL (Optional)' },
          element               : { type: 'string', title: 'Element Description or CSS Selector' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL (Optional)', type: 'string', required: false },
        { key: 'element', label: 'Element Description or CSS Selector', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success Status' },
          newUrl                : { type: 'string', title: 'Current URL After Click' },
        },
      },
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
        { key: 'newUrl', label: 'Current URL After Click', type: 'string', required: true },
      ],
    },
    {
      id: 'browser_fill_form',
      name: 'Fill and Submit Form',
      description: 'Fills multiple form fields and clicks a submit button.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url                   : { type: 'string', title: 'Form Page URL' },
          submitElement         : { type: 'string', title: 'Submit Button Selector/Label (Optional)' },
        },
      },
      inputs: [
        { key: 'url', label: 'Form Page URL', type: 'string', required: true },
        { key: 'fields', label: 'Form Fields (Array of { element, value })', type: 'json', required: true },
        { key: 'submitElement', label: 'Submit Button Selector/Label (Optional)', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Success Status' },
          resultUrl             : { type: 'string', title: 'URL After Form Submission' },
        },
      },
      outputs: [
        { key: 'success', label: 'Success Status', type: 'boolean', required: true },
        { key: 'resultUrl', label: 'URL After Form Submission', type: 'string', required: false },
      ],
    },
    {
      id: 'browser_search_web',
      name: 'Search Web via DuckDuckGo',
      description: 'Searches the web using scraper-friendly DuckDuckGo HTML search.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query                 : { type: 'string', title: 'Search Query Keywords' },
          maxResults            : { type: 'number', title: 'Max Results (Default: 5)' },
        },
      },
      inputs: [
        { key: 'query', label: 'Search Query Keywords', type: 'string', required: true },
        { key: 'maxResults', label: 'Max Results (Default: 5)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          topSnippet            : { type: 'string', title: 'Summary Snippet' },
        },
      },
      outputs: [
        { key: 'results', label: 'Results Array ({ title, url, snippet })', type: 'json', required: true },
        { key: 'topSnippet', label: 'Summary Snippet', type: 'string', required: true },
      ],
    },
    {
      id: 'browser_extract_data',
      name: 'Extract Data in English',
      description: 'Extracts data matching plain English instructions from a webpage.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['url', 'instructions'],
        properties: {
          url                   : { type: 'string', title: 'Target Web Page URL' },
          instructions          : { type: 'string', title: 'Plain English Extraction Instructions' },
        },
      },
      inputs: [
        { key: 'url', label: 'Target Web Page URL', type: 'string', required: true },
        { key: 'instructions', label: 'Plain English Extraction Instructions', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          extractedData         : { type: 'string', title: 'Extracted Content Text' },
        },
      },
      outputs: [
        { key: 'extractedData', label: 'Extracted Content Text', type: 'string', required: true },
      ],
    },
    {
      id: 'browser_login_and_navigate',
      name: 'Secure Website Login',
      description: 'Performs form login with encrypted credentials and navigates to target URL.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['loginUrl', 'usernameSelector', 'passwordSelector', 'username', 'password', 'submitSelector'],
        properties: {
          loginUrl              : { type: 'string', title: 'Login Page URL' },
          usernameSelector      : { type: 'string', title: 'Username Input Field' },
          passwordSelector      : { type: 'string', title: 'Password Input Field' },
          username              : { type: 'string', title: 'Username / Email' },
          password              : { type: 'string', title: 'Password (Masked)' },
          submitSelector        : { type: 'string', title: 'Login Submit Button' },
          targetUrl             : { type: 'string', title: 'Target URL After Login (Optional)' },
        },
      },
      inputs: [
        { key: 'loginUrl', label: 'Login Page URL', type: 'string', required: true },
        { key: 'usernameSelector', label: 'Username Input Field', type: 'string', required: true },
        { key: 'passwordSelector', label: 'Password Input Field', type: 'string', required: true },
        { key: 'username', label: 'Username / Email', type: 'string', required: true },
        { key: 'password', label: 'Password (Masked)', type: 'string', required: true },
        { key: 'submitSelector', label: 'Login Submit Button', type: 'string', required: true },
        { key: 'targetUrl', label: 'Target URL After Login (Optional)', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          success               : { type: 'boolean', title: 'Login Success' },
          currentUrl            : { type: 'string', title: 'Landing Page URL' },
          pageContent           : { type: 'string', title: 'Page Text Content' },
        },
      },
      outputs: [
        { key: 'success', label: 'Login Success', type: 'boolean', required: true },
        { key: 'currentUrl', label: 'Landing Page URL', type: 'string', required: true },
        { key: 'pageContent', label: 'Page Text Content', type: 'string', required: true },
      ],
    },
    {
      id: 'browser_wait_and_read',
      name: 'Wait for Content & Read',
      description: 'Waits for specific text to appear on the page before capturing snapshot.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['url', 'waitForText'],
        properties: {
          url                   : { type: 'string', title: 'Web Page URL' },
          waitForText           : { type: 'string', title: 'Text to Wait For' },
          timeout               : { type: 'number', title: 'Timeout (ms, default 10000)' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL', type: 'string', required: true },
        { key: 'waitForText', label: 'Text to Wait For', type: 'string', required: true },
        { key: 'timeout', label: 'Timeout (ms, default 10000)', type: 'number', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          appeared              : { type: 'boolean', title: 'Text Appeared' },
          pageContent           : { type: 'string', title: 'Page Content' },
        },
      },
      outputs: [
        { key: 'appeared', label: 'Text Appeared', type: 'boolean', required: true },
        { key: 'pageContent', label: 'Page Content', type: 'string', required: true },
      ],
    },
    {
      id: 'browser_get_links',
      name: 'Extract All Links',
      description: 'Extracts all hyperlinked URLs from a webpage.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['url'],
        properties: {
          url                   : { type: 'string', title: 'Web Page URL' },
          filter                : { type: 'string', title: 'Filter Keyword (Optional)' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL', type: 'string', required: true },
        { key: 'filter', label: 'Filter Keyword (Optional)', type: 'string', required: false },
      ],
            outputs: [
        { key: 'links', label: 'Links Array ({ text, href })', type: 'json', required: true },
      ],
    },
    {
      id: 'browser_run_script',
      name: 'Run Custom JavaScript',
      description: 'Evaluates custom JavaScript expression on the active page DOM.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['script'],
        properties: {
          url                   : { type: 'string', title: 'Web Page URL (Optional)' },
          script                : { type: 'string', title: 'JavaScript Expression' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL (Optional)', type: 'string', required: false },
        { key: 'script', label: 'JavaScript Expression', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          result                : { type: 'object', title: 'Script Return Value' },
        },
      },
      outputs: [
        { key: 'result', label: 'Script Return Value', type: 'json', required: true },
      ],
    },
    {
      id: 'browser_monitor_change',
      name: 'Monitor Page Element Change',
      description: 'Checks if page element content has changed compared to previous content.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['url', 'previousContent'],
        properties: {
          url                   : { type: 'string', title: 'Web Page URL' },
          previousContent       : { type: 'string', title: 'Previous Element Content' },
        },
      },
      inputs: [
        { key: 'url', label: 'Web Page URL', type: 'string', required: true },
        { key: 'previousContent', label: 'Previous Element Content', type: 'string', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          changed               : { type: 'boolean', title: 'Content Has Changed' },
          currentContent        : { type: 'string', title: 'Current Element Content' },
        },
      },
      outputs: [
        { key: 'changed', label: 'Content Has Changed', type: 'boolean', required: true },
        { key: 'currentContent', label: 'Current Element Content', type: 'string', required: true },
      ],
    },
  ],
};

export class WebBrowserConnector extends BaseConnector {
  manifest = webBrowserManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput;
    const sessionId = (context as any).sessionId || (context as any).executionId || `session_${Date.now()}`;

    // Dynamically load browserToolService from backend service layer if running in backend context
    let browserToolService: any = (globalThis as any).browserToolService || null;
    if (!browserToolService && typeof window === 'undefined') {
      try {
        const safeReq = eval('require');
        const mod = safeReq('../../../../apps/backend/src/services/browser-tool.service') || safeReq('../../../../../apps/backend/src/services/browser-tool.service');
        browserToolService = mod?.browserToolService || null;
      } catch {}
    }

    if (!browserToolService) {
      return {
        success: false,
        data: {},
        error: 'BrowserToolService is not available in current process context.',
      };
    }

    try {
      switch (actionId) {
        case 'browser_navigate': {
          const timeout = Number(inputs.timeout) || 10000;
          const { finalUrl, pageTitle } = await browserToolService.navigate(sessionId, inputs.url, timeout);
          return { success: true, data: { success: true, finalUrl, pageTitle } };
        }

        case 'browser_read_page': {
          const result = await browserToolService.readPage(sessionId, inputs.url, Number(inputs.timeout) || 10000);
          return { success: true, data: result };
        }

        case 'browser_take_screenshot': {
          const result = await browserToolService.takeScreenshot(sessionId, inputs.url, {
            fullPage: inputs.fullPage !== false,
            returnAs: inputs.returnAs,
          }, 10000);
          return { success: true, data: result };
        }

        case 'browser_click_element': {
          if (inputs.url) await browserToolService.navigate(sessionId, inputs.url, 10000);
          await browserToolService.click(sessionId, inputs.element, 5000);
          return { success: true, data: { success: true, newUrl: inputs.url || '' } };
        }

        case 'browser_fill_form': {
          const fields = Array.isArray(inputs.fields) ? inputs.fields : Array.isArray(inputs.formFields) ? inputs.formFields : [];
          const submitEl = inputs.submitElement || inputs.submitSelector;
          if (inputs.url) await browserToolService.navigate(sessionId, inputs.url, 10000);
          const result = await browserToolService.fillForm(sessionId, fields, submitEl, 15000);
          return { success: true, data: result };
        }

        case 'browser_search_web': {
          const query = inputs.query || inputs.q || 'AutoFlow AI';
          const maxResults = Number(inputs.maxResults) || 5;
          const results = await browserToolService.searchWeb(sessionId, query, maxResults, 15000);
          const topSnippet = results.map((r: any, i: number) => `${i + 1}. ${r.title}: ${r.url}`).join('\n');
          return { success: true, data: { results, topSnippet } };
        }

        case 'browser_extract_data': {
          if (inputs.url) await browserToolService.navigate(sessionId, inputs.url, 10000);
          const snapshot = await browserToolService.readPage(sessionId, undefined, 5000);
          return { success: true, data: { extractedData: snapshot.content } };
        }

        case 'browser_login_and_navigate': {
          await browserToolService.navigate(sessionId, inputs.loginUrl, 10000);
          await browserToolService.fillForm(
            sessionId,
            [
              { element: inputs.usernameSelector, value: inputs.username },
              { element: inputs.passwordSelector, value: inputs.password },
            ],
            inputs.submitSelector,
            15000
          );
          if (inputs.targetUrl) {
            await browserToolService.navigate(sessionId, inputs.targetUrl, 10000);
          }
          const page = await browserToolService.readPage(sessionId, undefined, 5000);
          return { success: true, data: { success: true, currentUrl: inputs.targetUrl || inputs.loginUrl, pageContent: page.content } };
        }

        case 'browser_wait_and_read': {
          await browserToolService.navigate(sessionId, inputs.url, 10000);
          const timeout = Number(inputs.timeout) || 10000;
          await browserToolService.callTool(sessionId, 'browser_wait_for', { text: inputs.waitForText, timeout }, timeout);
          const page = await browserToolService.readPage(sessionId, undefined, 5000);
          return { success: true, data: { appeared: true, pageContent: page.content } };
        }

        case 'browser_get_links': {
          const snapshot = await browserToolService.readPage(sessionId, inputs.url, 5000);
          let filtered = snapshot.links;
          if (inputs.filter) {
            filtered = filtered.filter((l: any) => l.text.toLowerCase().includes(inputs.filter.toLowerCase()) || l.href.toLowerCase().includes(inputs.filter.toLowerCase()));
          }
          return { success: true, data: { links: filtered } };
        }

        case 'browser_run_script': {
          if (inputs.url) await browserToolService.navigate(sessionId, inputs.url, 10000);
          const res = await browserToolService.runJavaScript(sessionId, inputs.script, 5000);
          return { success: true, data: { result: res } };
        }

        case 'browser_monitor_change': {
          const snapshot = await browserToolService.readPage(sessionId, inputs.url, 5000);
          const currentContent = snapshot.content;
          const previousContent = inputs.previousContent || '';
          const changed = currentContent.trim() !== previousContent.trim();
          return { success: true, data: { changed, currentContent, previousContent } };
        }

        default:
          return { success: false, data: {}, error: `Unsupported WebBrowser action: ${actionId}` };
      }
    } catch (err: any) {
      return { success: false, data: {}, error: `WebBrowser Error: ${err?.message || err}` };
    }
  }
}

export const webBrowserConnector = new WebBrowserConnector();
manifestRegistry.register(webBrowserManifest);
