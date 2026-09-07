export * from './core/types';

// Provider-agnostic messaging layer
export * from './messaging/normalized-message';
export * from './messaging/base-adapter';
export * from './messaging/whatsapp-adapter';
export * from './core/base-connector';
export * from './core/manifest-registry';

// ─── Phase 1 & 5 Full-Power Connectors ─────────────────────────────────────────
export * from './integrations/github';
export * from './integrations/openai';
export * from './integrations/anthropic';
export * from './integrations/gmail';
export * from './integrations/slack';
export * from './integrations/google-sheets';
export * from './integrations/google-drive';
export * from './integrations/notion';
export * from './integrations/stripe';
export * from './integrations/telegram';
export * from './integrations/whatsapp';
export * from './integrations/jira';
export * from './integrations/hubspot';
export * from './integrations/google-search';
export * from './integrations/ai-node';
export * from './integrations/ms-teams';
export * from './integrations/ms-outlook';
export * from './integrations/ms-excel';
export * from './integrations/dropbox';
export * from './integrations/zoom';
export * from './integrations/woocommerce';
export * from './integrations/paypal';
export * from './integrations/mailchimp';
export * from './integrations/trello';
export * from './integrations/calendly';
export * from './integrations/pipedrive';
export * from './integrations/asana';
export * from './integrations/monday';
export * from './integrations/instagram';
export * from './integrations/facebook';
export * from './integrations/meta-messenger';
export * from './integrations/activecampaign';
export * from './integrations/google-gemini';
export * from './integrations/ai-document-ocr';
export * from './integrations/gitlab';
export * from './integrations/linear';
export * from './integrations/vercel';
export * from './integrations/quickbooks';
export * from './integrations/docusign';
export * from './integrations/webhook-trigger';

// Utility & auxiliary connectors
export * from './connectors/autoflow-schedule.connector';
export * from './connectors/google-calendar.connector';
export * from './connectors/google-docs.connector';
export * from './connectors/command-router.connector';
export * from './connectors/http-request.connector';
export * from './connectors/web-search.connector';
export * from './connectors/condition.connector';
export * from './connectors/amazon-flipkart.connector';
export * from './connectors/universal.connector';

export * from './engine/step-executor';
export * from './engine/dag-runner';

export * from './auth/oauth2.strategy';
export * from './auth/api-key.strategy';
export * from './auth/webhook.strategy';
export * from './auth/provider-verifier';

