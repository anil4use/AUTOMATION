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
    const categoryId = manifest.category ? manifest.category.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'utilities';

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
    const providerConsoleUrl = manifest.docsUrl || manifest.website || `https://developer.${manifest.id}.com`;

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
      fields: manifest.authConfig?.fields || [
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
      scopes: manifest.authScopes || manifest.scopes || ['read', 'write'],
      authorizationUrl: manifest.authConfig?.authorizationUrl || manifest.authorizationUrl || `https://${manifest.id}.com/oauth/authorize`,
      tokenUrl: manifest.authConfig?.tokenUrl || manifest.tokenUrl || `https://${manifest.id}.com/oauth/token`,
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
      { featureId: 'realtime_webhooks', name: 'Realtime Webhook Triggers', category: 'Triggers', status: manifest.triggers?.length ? 'SUPPORTED' : 'UNSUPPORTED' },
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
    let testCount = 0;
    const actions = manifest.actions || [];

    for (const action of actions) {
      const actionId = action.id || action.actionId;
      if (!actionId) continue;

      const sampleInput: Record<string, any> = {};
      const props = action.inputSchema?.properties || {};

      for (const [key, prop] of Object.entries<any>(props)) {
        if (prop.default !== undefined) {
          sampleInput[key] = prop.default;
        } else if (prop.type === 'string') {
          sampleInput[key] = `test_${key}`;
        } else if (prop.type === 'number') {
          sampleInput[key] = 1;
        } else if (prop.type === 'boolean') {
          sampleInput[key] = true;
        } else if (prop.type === 'array') {
          sampleInput[key] = [];
        } else if (prop.type === 'object') {
          sampleInput[key] = {};
        }
      }

      const testPayload = {
        testId: `test-${manifest.id}-${actionId}`,
        connectorId: manifest.id,
        name: `Test ${action.name || actionId} for ${manifest.name}`,
        actionId,
        sampleInput,
        expectedOutputKeys: ['success', 'data'],
        enabled: true,
      };

      await ConnectorTestDefinitionModel.findOneAndUpdate(
        { testId: testPayload.testId },
        { $set: testPayload },
        { upsert: true, new: true }
      );
      testCount++;
    }

    if (testCount === 0) {
      const fallbackTestPayload = {
        testId: `test-${manifest.id}-default`,
        connectorId: manifest.id,
        name: `Default Health & Action Test for ${manifest.name}`,
        actionId: 'execute',
        sampleInput: { ping: true },
        expectedOutputKeys: ['success', 'data'],
        enabled: true,
      };
      await ConnectorTestDefinitionModel.findOneAndUpdate(
        { testId: fallbackTestPayload.testId },
        { $set: fallbackTestPayload },
        { upsert: true, new: true }
      );
      testCount = 1;
    }

    return testCount;
  }

  private static buildInputSchemaFromAction(act: any, manifestId: string): any {
    if (act.inputSchema && Object.keys(act.inputSchema?.properties || {}).length > 0) {
      return act.inputSchema;
    }

    const inputsList = act.inputs || act.parameters || act.fields || [];
    const properties: Record<string, any> = {};
    const required: string[] = [];

    if (Array.isArray(inputsList) && inputsList.length > 0) {
      inputsList.forEach((inp: any) => {
        const key = inp.key || inp.name || inp.id;
        if (key) {
          properties[key] = {
            type: inp.type === 'json' ? 'object' : inp.type || 'string',
            title: inp.label || inp.name || key,
            description: inp.description || inp.help || `Enter ${inp.label || key}`,
          };
          if (inp.enum) properties[key].enum = inp.enum;
          if (inp.required) required.push(key);
        }
      });
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  private static buildUiSchemaFromAction(inputSchema: any, act: any, manifestId: string): Record<string, any> {
    const properties = inputSchema?.properties || {};
    const uiSchema: Record<string, any> = {};

    Object.entries(properties).forEach(([key, meta]: [string, any]) => {
      let widget: string = 'text';
      if (meta.type === 'number') widget = 'number';
      else if (meta.type === 'boolean') widget = 'boolean';
      else if (meta.type === 'object' || meta.type === 'array') widget = 'code_editor';
      else if (meta.enum) widget = 'select';

      uiSchema[key] = {
        widget,
        placeholder: meta.description || meta.title || `Enter ${key}`,
        defaultTestValue: meta.default !== undefined ? meta.default : meta.type === 'number' ? 1 : meta.type === 'boolean' ? true : `sample_${key}`,
        ...(meta.enum ? { enum: meta.enum.map((e: any) => ({ label: String(e), value: e })) } : {}),
      };
    });

    return uiSchema;
  }
}
