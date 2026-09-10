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

    let count = 0;
    for (const act of rawActions) {
      const actionId = act.actionId || act.id || 'execute';
      const actionPayload = {
        connectorId: manifest.id,
        actionId,
        version: '2.0.0',
        name: act.name || `${manifest.name} Action`,
        description: act.description || `Perform ${actionId} operation on ${manifest.name}`,
        type: act.type || 'action',
        semanticType: act.semanticType || 'execute',
        executionType: act.executionType || 'adapter',
        adapterMethod: act.adapterMethod || actionId,
        inputSchema: act.inputSchema || {
          type: 'object',
          properties: {
            payload: { type: 'string', title: 'Input Payload', description: 'Enter execution payload or configuration' },
          },
        },
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
}
