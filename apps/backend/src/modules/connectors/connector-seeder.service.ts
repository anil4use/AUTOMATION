import {
  ConnectorCategoryModel,
  ConnectorModel,
  ConnectorActionModel,
  ConnectorAuthModel,
  ConnectorFeatureModel,
  ConnectorTestDefinitionModel,
} from '@automation/database';
import { ALL_50_CONNECTOR_MANIFESTS } from '@automation/connector-sdk';
import { logger } from '../../config/logger';

export interface SeedSummaryReport {
  categoriesCount: number;
  connectorsCount: number;
  actionsCount: number;
  authSpecsCount: number;
  featuresCount: number;
  testsCount: number;
  timestamp: string;
}

export class ConnectorSeederService {
  /**
   * Main entry point to seed all 70 connectors into MongoDB.
   * Safe, idempotent upsert operations that do not duplicate or break existing data.
   */
  public static async seedAllConnectors(): Promise<SeedSummaryReport> {
    logger.info('[ConnectorSeeder] Starting AutoFlow V2 Connector Platform Auto-Seeding...');

    // 1. Seed Categories
    const categoriesCount = await ConnectorSeederService.seedCategories();

    let connectorsCount = 0;
    let actionsCount = 0;
    let authSpecsCount = 0;
    let featuresCount = 0;
    let testsCount = 0;

    const manifests = ALL_50_CONNECTOR_MANIFESTS || [];

    for (const manifest of manifests) {
      if (!manifest || !manifest.id) continue;

      // 2. Seed Connector Metadata
      await ConnectorSeederService.seedConnector(manifest);
      connectorsCount++;

      // 3. Seed Actions & Input Schemas
      const actionsSeeded = await ConnectorSeederService.seedActions(manifest);
      actionsCount += actionsSeeded;

      // 4. Seed Authentication & Setup Guides
      await ConnectorSeederService.seedAuthSpec(manifest);
      authSpecsCount++;

      // 5. Seed Features Matrix
      const featuresSeeded = await ConnectorSeederService.seedFeatures(manifest);
      featuresCount += featuresSeeded;

      // 6. Seed Test Suite Definitions
      const testsSeeded = await ConnectorSeederService.seedTests(manifest);
      testsCount += testsSeeded;
    }

    const report: SeedSummaryReport = {
      categoriesCount,
      connectorsCount,
      actionsCount,
      authSpecsCount,
      featuresCount,
      testsCount,
      timestamp: new Date().toISOString(),
    };

    logger.info(`[ConnectorSeeder] 🎉 Seeding Complete! ${connectorsCount} connectors, ${actionsCount} actions, ${authSpecsCount} auth specs populated.`);
    return report;
  }

  private static async seedCategories(): Promise<number> {
    const categories = [
      { categoryId: 'recruitment', name: 'Jobs & Recruitment', displayName: 'Jobs & Recruitment', description: 'ATS systems, job portals, and talent platforms', icon: 'Briefcase', sortOrder: 1 },
      { categoryId: 'communication', name: 'Communication & Messaging', displayName: 'Communication & Messaging', description: 'Email, chat bots, SMS, and team communication', icon: 'MessageSquare', sortOrder: 2 },
      { categoryId: 'productivity', name: 'Productivity & Workspace', displayName: 'Productivity & Workspace', description: 'Spreadsheets, docs, calendars, and workspaces', icon: 'FileText', sortOrder: 3 },
      { categoryId: 'ai', name: 'AI & Machine Learning', displayName: 'AI & Machine Learning', description: 'LLMs, OCR, RAG vectors, and AI routing', icon: 'Cpu', sortOrder: 4 },
      { categoryId: 'database', name: 'Databases & Cloud Storage', displayName: 'Databases & Cloud Storage', description: 'SQL, NoSQL, Redis, S3, and object storage', icon: 'Database', sortOrder: 5 },
      { categoryId: 'developer', name: 'Developer Tools & Automation', displayName: 'Developer Tools & Automation', description: 'Git, Playwright browser, webhooks, and deployment', icon: 'Code', sortOrder: 6 },
      { categoryId: 'crm', name: 'CRM, Sales & Marketing', displayName: 'CRM, Sales & Marketing', description: 'Customer management, email marketing, and social media', icon: 'Users', sortOrder: 7 },
      { categoryId: 'project', name: 'Project Management', displayName: 'Project Management', description: 'Issue tracking, boards, and task management', icon: 'CheckSquare', sortOrder: 8 },
      { categoryId: 'ecommerce', name: 'E-Commerce & Finance', displayName: 'E-Commerce & Finance', description: 'Payment gateways, online stores, and accounting', icon: 'ShoppingCart', sortOrder: 9 },
      { categoryId: 'utilities', name: 'File Storage & Utilities', displayName: 'File Storage & Utilities', description: 'Cloud storage, e-signatures, logic, and transformers', icon: 'Folder', sortOrder: 10 },
    ];

    for (const cat of categories) {
      await ConnectorCategoryModel.findOneAndUpdate(
        { categoryId: cat.categoryId },
        { $set: cat },
        { upsert: true, new: true }
      );
    }
    return categories.length;
  }

  private static async seedConnector(manifest: any): Promise<void> {
    const defaultCategoryMap: Record<string, string> = {
      linkedin: 'recruitment', indeed: 'recruitment', ziprecruiter: 'recruitment', glassdoor: 'recruitment', greenhouse: 'recruitment', lever: 'recruitment',
      gmail: 'communication', slack: 'communication', discord: 'communication', telegram: 'communication', whatsapp: 'communication', twilio: 'communication', 'ms-teams': 'communication', 'ms-outlook': 'communication', zoom: 'communication', 'meta-messenger': 'communication',
      'google-sheets': 'productivity', 'google-calendar': 'productivity', 'google-docs': 'productivity', notion: 'productivity', airtable: 'productivity', 'ms-excel': 'productivity',
      openai: 'ai', anthropic: 'ai', 'google-gemini': 'ai', 'ai-document-ocr': 'ai', 'ai-nodes': 'ai', 'vector-rag': 'ai', 'command-router': 'ai', 'google-search': 'ai',
      postgresql: 'database', mysql: 'database', mongodb: 'database', redis: 'database', supabase: 'database', dynamodb: 'database', 'amazon-s3': 'database', 'cloudflare-r2': 'database',
      github: 'developer', gitlab: 'developer', 'web-browser': 'developer', 'web-search': 'developer', 'http-request': 'developer', 'webhook-trigger': 'developer', vercel: 'developer', linear: 'developer',
      hubspot: 'crm', salesforce: 'crm', pipedrive: 'crm', mailchimp: 'crm', activecampaign: 'crm', instagram: 'crm', facebook: 'crm',
      jira: 'project', trello: 'project', asana: 'project', monday: 'project',
      stripe: 'ecommerce', paypal: 'ecommerce', shopify: 'ecommerce', woocommerce: 'ecommerce', quickbooks: 'ecommerce',
      'google-drive': 'utilities', dropbox: 'utilities', docusign: 'utilities', calendly: 'utilities', condition: 'utilities', 'control-flow': 'utilities', 'text-transformer': 'utilities', 'json-transformer': 'utilities', 'amazon-flipkart': 'utilities'
    };

    const categoryId = manifest.category || defaultCategoryMap[manifest.id] || 'utilities';

    const payload = {
      connectorId: manifest.id,
      slug: manifest.slug || manifest.id,
      name: manifest.name || manifest.displayName || manifest.id,
      displayName: manifest.displayName || manifest.name || manifest.id,
      description: manifest.description || `Integrate and automate with ${manifest.name}.`,
      provider: manifest.provider || manifest.name || 'Official Provider',
      categoryId,
      icon: manifest.icon || `https://assets.autoflow.ai/icons/${manifest.id}.svg`,
      website: manifest.website || `https://${manifest.id}.com`,
      documentationUrl: manifest.documentationUrl || `https://docs.${manifest.id}.com`,
      version: manifest.version || '2.0.0',
      sdkVersion: '2.0.0',
      status: 'published',
      enabled: true,
      isSystemConnector: ['autoflow-schedule', 'http-request', 'condition', 'control-flow'].includes(manifest.id),
      isPremium: false,
      runtimeType: manifest.runtimeType || 'adapter',
      adapterType: manifest.adapterType || `${manifest.id}Adapter`,
      tags: manifest.tags || [categoryId, manifest.id, 'automation'],
      capabilities: manifest.capabilities || ['create', 'read', 'update', 'delete', 'search'],
    };

    await ConnectorModel.findOneAndUpdate(
      { connectorId: manifest.id },
      { $set: payload },
      { upsert: true, new: true }
    );
  }

  private static async seedActions(manifest: any): Promise<number> {
    const rawActions = manifest.actions || [
      { actionId: 'execute', name: `Execute ${manifest.name} Action`, description: `Execute default operation on ${manifest.name}` },
      { actionId: 'search', name: `Search ${manifest.name}`, description: `Search records in ${manifest.name}` }
    ];

    const actionsToSeed = [...rawActions];
    const hasGetAll = actionsToSeed.some((a: any) => {
      const id = (a.actionId || a.id || '').toLowerCase();
      return id === 'get_all' || id === 'list_all' || id === 'get_all_records' || id === 'list_records';
    });

    if (!hasGetAll) {
      actionsToSeed.push({
        id: 'get_all',
        actionId: 'get_all',
        name: `Get All / List Records (${manifest.name})`,
        description: `Fetch, list, and query all items/records from ${manifest.name} with pagination limit, offset, and optional filters.`,
        type: 'action',
        inputs: [
          { key: 'limit', label: 'Max Records Limit (Default 50, Max 250)', type: 'number', required: false },
          { key: 'offset', label: 'Offset / Page Starting Index', type: 'number', required: false },
          { key: 'query', label: 'Search Filter Keywords (Optional)', type: 'string', required: false },
          { key: 'sortBy', label: 'Sort Field (Optional)', type: 'string', required: false },
        ],
        outputs: [
          { key: 'items', label: 'Records Array', type: 'json', required: true },
          { key: 'totalCount', label: 'Total Records Count', type: 'number', required: true },
          { key: 'limit', label: 'Applied Limit', type: 'number', required: true },
          { key: 'hasMore', label: 'Has More Pages', type: 'boolean', required: true },
        ],
      });
    }

    let count = 0;
    for (const act of actionsToSeed) {
      const actionId = act.actionId || act.id || 'execute';
      const inputSchema = ConnectorSeederService.buildInputSchemaFromAction(act, manifest.id);
      const uiSchema = ConnectorSeederService.buildUiSchemaFromAction(inputSchema, act, manifest.id);

      const actionPayload = {
        connectorId: manifest.id,
        actionId,
        version: '2.0.0',
        name: act.name || `${manifest.name} Action`,
        description: act.description || `Perform ${actionId} operation on ${manifest.name}`,
        type: act.type || 'action',
        semanticType: act.semanticType || 'execute',
        executionType: act.executionType || 'adapter',
        inputSchema,
        uiSchema,
        outputSchema: act.outputSchema || { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } },
        capabilities: act.capabilities || ['execute'],
        destructive: act.destructive || false,
        enabled: true,
      };

      await ConnectorActionModel.findOneAndUpdate(
        { connectorId: manifest.id, actionId },
        { $set: actionPayload },
        { upsert: true, new: true }
      );
      count++;
    }

    return count;
  }

  private static async seedAuthSpec(manifest: any): Promise<void> {
    const consoleUrlMap: Record<string, string> = {
      gmail: 'https://console.cloud.google.com/apis/credentials',
      'google-sheets': 'https://console.cloud.google.com/apis/credentials',
      'google-drive': 'https://console.cloud.google.com/apis/credentials',
      slack: 'https://api.slack.com/apps',
      github: 'https://github.com/settings/developers',
      discord: 'https://discord.com/developers/applications',
      spotify: 'https://developer.spotify.com/dashboard',
      notion: 'https://www.notion.so/my-integrations',
      stripe: 'https://dashboard.stripe.com/apikeys',
      openai: 'https://platform.openai.com/api-keys',
      anthropic: 'https://console.anthropic.com/settings/keys',
      hubspot: 'https://app.hubspot.com/l/developer-home',
      jira: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    };

    const providerConsoleUrl = consoleUrlMap[manifest.id] || `https://developer.${manifest.id}.com`;

    const authPayload = {
      authenticationId: `${manifest.id}-auth-v2`,
      connectorId: manifest.id,
      type: manifest.authType || 'oauth2',
      name: `${manifest.name} Authentication`,
      description: `Connect AutoFlow to your ${manifest.name} account securely.`,
      recommended: true,
      providerConsoleUrl,
      setupGuide: {
        summary: `Follow these steps to connect your ${manifest.name} account to AutoFlow:`,
        steps: [
          `1. Click 'Open Provider Console' to go to ${manifest.name} developer portal.`,
          `2. Create a new app or API key for AutoFlow integration.`,
          `3. Set Redirect URI to: http://localhost:5000/api/v1/auth/${manifest.id}/callback (if using OAuth2).`,
          `4. Copy your Client ID / API Key and Client Secret into the form fields below and click Connect.`
        ],
        redirectUriRequirement: `http://localhost:5000/api/v1/auth/${manifest.id}/callback`,
      },
      fields: [
        {
          key: 'clientId',
          label: 'Client ID / API Key',
          type: 'string',
          required: true,
          placeholder: `Enter your ${manifest.name} Client ID or API Key`,
          help: `Obtain your Client ID from ${manifest.name} Developer Dashboard`,
          docUrl: providerConsoleUrl,
        },
        {
          key: 'clientSecret',
          label: 'Client Secret / API Token',
          type: 'password',
          required: false,
          placeholder: `Enter your ${manifest.name} Client Secret`,
          help: `Your secret is encrypted using AES-256-CBC at rest`,
          docUrl: providerConsoleUrl,
        },
      ],
      scopes: manifest.scopes || ['read', 'write'],
      authorizationUrl: manifest.authorizationUrl || `https://${manifest.id}.com/oauth/authorize`,
      tokenUrl: manifest.tokenUrl || `https://${manifest.id}.com/oauth/token`,
      refreshTokenSupported: true,
    };

    await ConnectorAuthModel.findOneAndUpdate(
      { connectorId: manifest.id },
      { $set: authPayload },
      { upsert: true, new: true }
    );
  }

  private static async seedFeatures(manifest: any): Promise<number> {
    const defaultFeatures = [
      { featureId: 'core_actions', name: 'Core Action Execution', category: 'Actions', status: 'SUPPORTED' },
      { featureId: 'search_query', name: 'Search & Data Querying', category: 'Search', status: 'SUPPORTED' },
      { featureId: 'oauth_auth', name: 'OAuth 2.0 / API Key Auth', category: 'Security', status: 'SUPPORTED' },
      { featureId: 'realtime_webhooks', name: 'Realtime Webhook Triggers', category: 'Triggers', status: 'SUPPORTED' },
    ];

    for (const feat of defaultFeatures) {
      await ConnectorFeatureModel.findOneAndUpdate(
        { connectorId: manifest.id, featureId: feat.featureId },
        { $set: { ...feat, connectorId: manifest.id } },
        { upsert: true, new: true }
      );
    }
    return defaultFeatures.length;
  }

  private static async seedTests(manifest: any): Promise<number> {
    const testPayload = {
      testId: `test-${manifest.id}-default`,
      connectorId: manifest.id,
      name: `Default Health & Action Test for ${manifest.name}`,
      actionId: 'execute',
      sampleInput: { ping: true },
      expectedOutputKeys: ['success', 'data'],
      enabled: true,
    };

    await ConnectorTestDefinitionModel.findOneAndUpdate(
      { testId: testPayload.testId },
      { $set: testPayload },
      { upsert: true, new: true }
    );
    return 1;
  }

  private static buildInputSchemaFromAction(act: any, manifestId: string): any {
    if (act.inputSchema && Object.keys(act.inputSchema?.properties || {}).length > 0) {
      return act.inputSchema;
    }

    const inputsList = act.inputs || act.parameters || act.fields || [];
    if (Array.isArray(inputsList) && inputsList.length > 0) {
      const properties: Record<string, any> = {};
      const required: string[] = [];
      inputsList.forEach((inp: any) => {
        const key = inp.key || inp.name || inp.id;
        if (key) {
          properties[key] = {
            type: inp.type || 'string',
            title: inp.label || inp.name || key,
            description: inp.description || inp.help || `Enter ${inp.label || key}`,
          };
          if (inp.enum) properties[key].enum = inp.enum;
          if (inp.required) required.push(key);
        }
      });
      if (Object.keys(properties).length > 0) {
        return {
          type: 'object',
          properties,
          ...(required.length > 0 ? { required } : {}),
        };
      }
    }

    // Action ID or Manifest ID smart fallback map
    const actionId = (act.actionId || act.id || '').toLowerCase();

    if (actionId === 'get_all' || actionId === 'list_all' || actionId.includes('get_all') || actionId.includes('list_all')) {
      return {
        type: 'object',
        properties: {
          limit: { type: 'number', title: 'Max Records Limit (Default 50, Max 250)', description: 'Maximum number of items/records to retrieve' },
          offset: { type: 'number', title: 'Offset / Page Starting Index', description: 'Zero-based offset index for pagination' },
          query: { type: 'string', title: 'Search Filter Keywords (Optional)', description: 'Optional search query or metadata filter' },
          sortBy: { type: 'string', title: 'Sort Field (Optional)', description: 'Field name to sort items by (e.g. createdAt, id)' },
        },
        required: [],
      };
    }

    if (actionId.includes('email') || actionId.includes('mail')) {
      return {
        type: 'object',
        properties: {
          to: { type: 'string', title: 'Recipient Email', description: 'Destination email address (e.g. user@example.com)' },
          subject: { type: 'string', title: 'Subject Line', description: 'Email subject title' },
          body: { type: 'string', title: 'Email Body Content', description: 'Main message content in HTML or plain text' },
          cc: { type: 'string', title: 'CC (Optional)', description: 'Carbon copy recipient email' },
          bcc: { type: 'string', title: 'BCC (Optional)', description: 'Blind carbon copy recipient email' },
        },
        required: ['to', 'subject', 'body'],
      };
    }

    if (actionId.includes('message') || actionId.includes('slack') || actionId.includes('post_text') || actionId.includes('send_chat')) {
      return {
        type: 'object',
        properties: {
          channel: { type: 'string', title: 'Channel / Recipient ID', description: 'Target channel name, ID, or phone number' },
          text: { type: 'string', title: 'Message Text', description: 'Content of the message to send' },
        },
        required: ['channel', 'text'],
      };
    }

    if (actionId.includes('issue') || actionId.includes('ticket') || actionId.includes('task')) {
      return {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title / Summary', description: 'Short title or summary' },
          description: { type: 'string', title: 'Description', description: 'Detailed explanation' },
        },
        required: ['title'],
      };
    }

    if (actionId.includes('completion') || actionId.includes('prompt') || actionId.includes('generate') || actionId.includes('ai') || actionId.includes('chat')) {
      return {
        type: 'object',
        properties: {
          prompt: { type: 'string', title: 'Prompt / Instruction', description: 'Input text or prompt for AI' },
          model: { type: 'string', title: 'Model (Optional)', description: 'AI model identifier' },
        },
        required: ['prompt'],
      };
    }

    if (actionId.includes('query') || actionId.includes('sql') || actionId.includes('select')) {
      return {
        type: 'object',
        properties: {
          query: { type: 'string', title: 'Query Statement', description: 'SQL or database query string' },
        },
        required: ['query'],
      };
    }

    return {
      type: 'object',
      properties: {
        payload: { type: 'string', title: 'Input Payload', description: 'Enter execution payload or configuration' },
      },
    };
  }

  private static buildUiSchemaFromAction(inputSchema: any, act: any, manifestId: string): Record<string, any> {
    const properties = inputSchema?.properties || {};
    const uiSchema: Record<string, any> = {};
    const isDbConnector = ['postgresql', 'mysql', 'mongodb', 'supabase', 'redis', 'dynamodb', 'airtable'].some(db => manifestId.toLowerCase().includes(db));

    Object.entries(properties).forEach(([key, meta]: [string, any]) => {
      const k = key.toLowerCase();
      const connectorId = manifestId.toLowerCase();

      let widget: 'text' | 'textarea' | 'select' | 'dynamic_select' | 'key_value' | 'code_editor' | 'boolean' | 'number' | 'file' = 'text';
      let placeholder = meta.description || `Enter ${meta.title || key}...`;
      let defaultTestValue: any = '';
      let optionsEndpoint: string | undefined = undefined;

      // 1. Dynamic Dropdown Selectors
      if (k.includes('spreadsheet') || k.includes('sheet_id') || k.includes('project_key') || k.includes('project') || k.includes('team_id') || k.includes('folder_id') || k.includes('database_id')) {
        widget = 'dynamic_select';
        optionsEndpoint = `/api/v2/connectors/${manifestId}/actions/${act.actionId || act.id}/options/${key}`;
        placeholder = `Select ${meta.title || key} dynamically...`;
      }
      // 2. Select Enum Dropdown
      else if (meta.enum && Array.isArray(meta.enum) && meta.enum.length > 0) {
        widget = 'select';
        defaultTestValue = meta.enum[0];
      }
      // 3. Search Queries & Keywords (Web search, news search, email search)
      else if ((connectorId.includes('search') || k.includes('search') || k === 'query' || k === 'q') && !isDbConnector && !k.includes('sql')) {
        widget = 'text';
        defaultTestValue = 'Latest AI tech developments';
        placeholder = 'Enter search query keywords (e.g. OpenAI, SpaceX, tech news)';
      }
      // 3b. Data Vault & Storage File Name / Format / Dataset Defaults
      else if (k === 'filename' || k === 'name' || k === 'datasetname' || k === 'file_name') {
        widget = 'text';
        defaultTestValue = connectorId === 'data-vault' ? 'sample_test_document' : 'sample_test_file.txt';
        placeholder = 'Enter File Name (e.g. report, document, dataset)';
      }
      else if (k === 'format' || k === 'fileformat' || k === 'extension') {
        widget = 'text';
        defaultTestValue = '.html';
        placeholder = 'Enter File Format (e.g. .html, .csv, .json, .pdf, .md)';
      }
      else if (k === 'records' || k === 'items' || k === 'dataset') {
        widget = 'code_editor';
        defaultTestValue = JSON.stringify([
          { id: 1, name: "Alice", role: "Developer", company: "AutoFlow" },
          { id: 2, name: "Bob", role: "Architect", company: "AutoFlow" }
        ], null, 2);
      }
      // 4. Textarea Multi-line
      else if (k.includes('body') || k.includes('content') || k.includes('text') || k.includes('prompt') || k.includes('description') || k.includes('html')) {
        widget = 'textarea';
        if (k.includes('prompt')) defaultTestValue = 'Explain AI automation in 1 sentence.';
        else if (k.includes('body') || k.includes('content')) defaultTestValue = 'Hello! Live test message executed from AutoFlow.';
        else if (k.includes('text')) defaultTestValue = 'AutoFlow live connector action test verified!';
      }
      // 5. Code Editor (SQL, JSON Queries, Scripts)
      else if ((isDbConnector && (k.includes('query') || k.includes('sql') || k.includes('filter'))) || k.includes('sql') || k.includes('json') || k.includes('script') || k.includes('code')) {
        widget = 'code_editor';
        if (k.includes('sql') || isDbConnector) defaultTestValue = 'SELECT 1 as live_test_connection;';
        else defaultTestValue = '{\n  "status": "active"\n}';
      }
      // 6. Key-Value Row Builder
      else if (k.includes('params') || k.includes('headers') || k.includes('rowvalues') || k.includes('metadata') || k.includes('attributes') || k.includes('payload')) {
        if (connectorId.includes('postgres') || connectorId.includes('mysql') || connectorId.includes('mongo') || connectorId.includes('sheets') || connectorId.includes('http')) {
          widget = 'key_value';
          defaultTestValue = { testKey: 'testValue' };
        }
      }
      // 7. Number Input
      else if (meta.type === 'number' || meta.type === 'integer' || k.includes('limit') || k.includes('maxresults') || k.includes('amount') || k.includes('count')) {
        widget = 'number';
        defaultTestValue = 5;
      }
      // 8. Boolean Switch
      else if (meta.type === 'boolean' || k.includes('is_') || k.includes('has_') || k.includes('enable')) {
        widget = 'boolean';
        defaultTestValue = true;
      }
      // 9. Text Input Fallbacks
      else {
        if (k === 'to' || k === 'recipient' || k.includes('email')) {
          defaultTestValue = 'anil4use@gmail.com';
        } else if (k === 'subject') {
          defaultTestValue = 'AutoFlow Verification Test Email';
        } else if (k === 'channel') {
          defaultTestValue = 'general';
        } else if (k === 'title' || k === 'summary') {
          defaultTestValue = 'AutoFlow Live Verification Item';
        }
      }

      uiSchema[key] = {
        widget,
        placeholder,
        defaultTestValue,
        ...(optionsEndpoint ? { optionsEndpoint } : {}),
        ...(meta.enum ? { enum: meta.enum.map((e: any) => ({ label: String(e), value: e })) } : {}),
      };
    });

    return uiSchema;
  }
}
