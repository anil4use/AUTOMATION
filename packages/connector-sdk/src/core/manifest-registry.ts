import { ConnectorManifest, AIConnectorIndex } from '@automation/shared-types';
import { linkedinManifest } from '../integrations/linkedin/manifest';
import { indeedManifest } from '../integrations/indeed/manifest';
import { ziprecruiterManifest } from '../integrations/ziprecruiter/manifest';
import { glassdoorManifest } from '../integrations/glassdoor/manifest';
import { greenhouseManifest } from '../integrations/greenhouse/manifest';
import { leverManifest } from '../integrations/lever/manifest';
import { DATA_VAULT_MANIFEST } from '../integrations/data-vault/manifest';

const _STATIC_MANIFESTS: ConnectorManifest[] = [
  DATA_VAULT_MANIFEST,
  linkedinManifest,
  indeedManifest,
  ziprecruiterManifest,
  glassdoorManifest,
  greenhouseManifest,
  leverManifest,
];

export function getManifestById(connectorId: string): ConnectorManifest | undefined {
  // Try the class registry first (has full-power manifests), fall back to static array
  const cleanId = connectorId.replace('autoflow-', '');
  return (
    manifestRegistry.getManifest(connectorId) ||
    manifestRegistry.getManifest(cleanId) ||
    _STATIC_MANIFESTS.find(
      (m: ConnectorManifest) => m.id === connectorId || m.id === cleanId
    )
  );
}

export function getActionOrTriggerSchema(connectorId: string, operationId: string) {
  const manifest = getManifestById(connectorId);
  if (!manifest) return null;

  // 1. Exact match
  const exactAction = manifest.actions.find((a) => a.id === operationId);
  if (exactAction) return exactAction;

  const exactTrigger = manifest.triggers.find((t) => t.id === operationId);
  if (exactTrigger) return exactTrigger;

  // 2. Default to primary action or trigger of the connector
  return manifest.actions[0] || manifest.triggers[0] || null;
}

// ─── Connector Prompt Aliases ──────────────────────────────────────────────────
// Used by exportForAI() to match user prompt keywords to connector IDs

const CONNECTOR_PROMPT_ALIASES: Record<string, string[]> = {
  'web-browser':      ['browser', 'playwright', 'headless browser', 'click element', 'screenshot', 'fill form', 'browser navigate'],
  'web-search':       ['web search', 'search web', 'duckduckgo', 'tavily', 'scrape url', 'google search'],
  'openai':          ['gpt', 'chatgpt', 'openai', 'gpt-4', 'gpt4', 'gpt 4', 'ai text'],
  'anthropic':       ['claude', 'anthropic', 'sonnet', 'haiku', 'opus'],
  'google-sheets':   ['sheets', 'spreadsheet', 'google sheets', 'worksheet'],
  'google-drive':    ['drive', 'gdrive', 'google drive'],
  'google-calendar': ['calendar', 'google calendar', 'gcal', 'event', 'meeting'],
  'github':          ['github', 'repo', 'repository', 'pull request', 'pr', 'issue', 'commit'],
  'slack':           ['slack', 'channel', '#general', 'workspace message'],
  'gmail':           ['gmail', 'email', 'mail', 'inbox', 'send email'],
  'notion':          ['notion', 'workspace', 'database page', 'notion page'],
  'stripe':          ['stripe', 'payment', 'invoice', 'customer', 'subscription', 'billing'],
  'hubspot':         ['hubspot', 'crm', 'contact', 'deal', 'lead', 'hubspot crm'],
  'jira':            ['jira', 'ticket', 'sprint', 'board', 'jira issue'],
  'telegram':        ['telegram', 'bot', 'tg', 'telegram bot'],
  'whatsapp':        ['whatsapp', 'wa', 'whats app', 'meta cloud'],
  'google-search':   ['search', 'google search', 'web search', 'serpapi'],
  'ms-teams':        ['teams', 'microsoft teams', 'teams channel', 'msteams'],
  'ms-outlook':      ['outlook', 'microsoft outlook', 'outlook mail', 'office365 email'],
  'ms-excel':        ['excel', 'microsoft excel', 'excel online', 'workbook'],
  'dropbox':         ['dropbox', 'cloud storage', 'dropbox file'],
  'zoom':            ['zoom', 'meeting', 'zoom meeting', 'webinar', 'recording'],
  'woocommerce':     ['woocommerce', 'woo', 'wc order', 'wordpress store'],
  'paypal':          ['paypal', 'payout', 'paypal payment'],
  'mailchimp':       ['mailchimp', 'audience', 'newsletter', 'mailchimp list'],
  'trello':          ['trello', 'trello card', 'trello board'],
  'calendly':        ['calendly', 'booking', 'appointment', 'calendly event'],
  'pipedrive':       ['pipedrive', 'pipedrive deal', 'pipedrive crm'],
  'asana':           ['asana', 'asana task', 'asana project'],
  'monday':          ['monday', 'monday.com', 'monday board'],
  'instagram':       ['instagram', 'ig', 'insta post', 'ig comment'],
  'facebook':        ['facebook', 'fb page', 'facebook lead', 'lead ad'],
  'meta-messenger':  ['messenger', 'fb messenger', 'meta messenger'],
  'activecampaign':  ['activecampaign', 'ac contact', 'ac tag'],
  'google-gemini':   ['gemini', 'google gemini', 'gemini 1.5', 'gemini flash'],
  'ai-document-ocr': ['ocr', 'invoice ocr', 'receipt extract', 'document ocr'],
  'gitlab':          ['gitlab', 'merge request', 'mr', 'gitlab issue'],
  'linear':          ['linear', 'linear issue', 'linear cycle'],
  'vercel':          ['vercel', 'vercel deploy', 'next.js deploy'],
  'quickbooks':      ['quickbooks', 'qbo', 'quickbooks invoice'],
  'docusign':        ['docusign', 'signature', 'envelope', 'e-sign'],
  'webhook-trigger': ['webhook', 'catch webhook', 'inbound webhook'],
};

// ─── ConnectorManifestRegistry Class ──────────────────────────────────────────

export class ConnectorManifestRegistry {
  private manifests = new Map<string, ConnectorManifest>();

  /** Register a connector manifest. Later registrations overwrite earlier ones with same ID. */
  register(manifest: ConnectorManifest): void {
    this.manifests.set(manifest.id, manifest);
  }

  /** Register multiple manifests at once. */
  registerAll(manifests: ConnectorManifest[]): void {
    for (const m of manifests) this.register(m);
  }

  getManifest(id: string): ConnectorManifest | undefined {
    return this.manifests.get(id);
  }

  getAllManifests(): ConnectorManifest[] {
    return [...this.manifests.values()];
  }

  getTrigger(connectorId: string, triggerId: string) {
    return this.getManifest(connectorId)?.triggers.find(t => t.id === triggerId);
  }

  getAction(connectorId: string, actionId: string) {
    return this.getManifest(connectorId)?.actions.find(a => a.id === actionId);
  }

  getConnectorsWithTriggers(): ConnectorManifest[] {
    return this.getAllManifests().filter(m => m.triggers.length > 0);
  }

  /** Fuzzy keyword search across name, description, action names, trigger names */
  search(query: string): ConnectorManifest[] {
    const q = query.toLowerCase();
    return this.getAllManifests().filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.actions.some(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) ||
      m.triggers.some(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    );
  }

  /**
   * Scoped export for the AI workflow generation engine.
   *
   * Strategy (Patch 1 / Gap 3):
   * - When connectedAppIds.length <= 4: inject all full schemas
   * - When > 4: keyword-score prompt against connector names/aliases, pick top 4 by score
   *   then recency; remaining connected apps become stubs with a LLM note
   * - All unconnected connectors: lightweight { id, name } stubs only
   */
  exportForAI(
    connectedAppIds: string[],
    prompt: string,
    userConnections: Array<{ appId: string; createdAt: Date }>
  ): AIConnectorIndex {
    let selectedIds: string[];

    if (connectedAppIds.length <= 4) {
      selectedIds = [...connectedAppIds];
    } else {
      // Score each connected connector by keyword match in prompt
      const p = prompt.toLowerCase();
      const scored = connectedAppIds.map(id => {
        const manifest = this.manifests.get(id);
        const nameMatch  = manifest && p.includes(manifest.name.toLowerCase()) ? 3 : 0;
        const idMatch    = p.includes(id.toLowerCase()) ? 2 : 0;
        const aliasMatch = (CONNECTOR_PROMPT_ALIASES[id] || [])
          .some(alias => p.includes(alias)) ? 2 : 0;
        // Recency tiebreaker — newer connections sorted last (lower index = older)
        const conn = userConnections.find(c => c.appId === id);
        const recencyScore = conn ? conn.createdAt.getTime() : 0;
        return { id, score: nameMatch + idMatch + aliasMatch, recencyScore };
      });
      scored.sort((a, b) => b.score - a.score || b.recencyScore - a.recencyScore);
      selectedIds = scored.slice(0, 4).map(s => s.id);
    }

    const droppedConnectedApps = connectedAppIds
      .filter(id => !selectedIds.includes(id))
      .map(id => this.getManifest(id)?.name || id);

    const fullSchemas = selectedIds
      .map(id => this.manifests.get(id))
      .filter((m): m is ConnectorManifest => Boolean(m));

    const catalog = this.getAllManifests()
      .filter(m => !selectedIds.includes(m.id))
      .map(m => ({ id: m.id, name: m.name }));

    return { fullSchemas, catalog, droppedConnectedApps };
  }

  /** Lightweight summary for the Registry API list endpoint */
  getSummaries() {
    return this.getAllManifests().map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      icon: m.icon,
      authType: m.authType,
      triggerCount: m.triggers.length,
      actionCount: m.actions.length,
      docsUrl: m.docsUrl,
      version: m.version,
    }));
  }
}

// ─── Singleton Instance ────────────────────────────────────────────────────────

export const manifestRegistry = new ConnectorManifestRegistry();

// Auto-seed with the existing static manifests.
// Individual connector classes (GmailConnector, etc.) call manifestRegistry.register()
// in their own module — this seeds the built-in catalog manifests.
manifestRegistry.registerAll(_STATIC_MANIFESTS);

// ─── Backward Compatibility ────────────────────────────────────────────────────
//
// IMPORTANT (Patch 3): The old `ALL_50_CONNECTOR_MANIFESTS` const is preserved
// as a lazy Proxy. A plain const assignment would evaluate at import time —
// BEFORE connector classes self-register — and return an empty array.
// The Proxy evaluates at access time, after all connectors have registered.
//
// This means any existing code using ALL_50_CONNECTOR_MANIFESTS[0] or
// ALL_50_CONNECTOR_MANIFESTS.find(...) will still work correctly.

export const ALL_50_CONNECTOR_MANIFESTS: ConnectorManifest[] = new Proxy(
  [] as ConnectorManifest[],
  {
    get(_, prop) {
      const all = manifestRegistry.getAllManifests();
      if (prop === 'length') return all.length;
      if (prop === Symbol.iterator) return all[Symbol.iterator].bind(all);
      if (typeof prop === 'string' && !isNaN(Number(prop))) return all[Number(prop)];
      const val = (all as any)[prop];
      return typeof val === 'function' ? val.bind(all) : val;
    },
  }
);

/** Preferred alternative to ALL_50_CONNECTOR_MANIFESTS — call at any time */
export const getAllConnectorManifests = (): ConnectorManifest[] =>
  manifestRegistry.getAllManifests();

