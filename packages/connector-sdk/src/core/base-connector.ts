import { ConnectorManifest } from '@automation/shared-types';
import { IConnector, ExecutionContext, ConnectorExecutionOutput } from './types';

export abstract class BaseConnector implements IConnector {
  abstract manifest: ConnectorManifest;

  abstract executeAction(actionId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput>;

  /**
   * Universal Dynamic Action Resolver
   * Automatically maps ANY LLM-generated action ID synonym, variation, or descriptive name to the exact supported action ID in this connector's manifest across ALL 51+ apps.
   */
  resolveActionId(requestedActionId: string): string {
    if (!this.manifest || !this.manifest.actions || this.manifest.actions.length === 0) {
      return requestedActionId;
    }

    const actions = this.manifest.actions;
    const req = requestedActionId.toLowerCase().trim();

    // 1. Direct exact match
    const exact = actions.find((a) => a.id.toLowerCase() === req);
    if (exact) return exact.id;

    // 2. Normalized match (strip underscores, hyphens, spaces)
    const normReq = req.replace(/[-_\s]+/g, '');
    const normMatch = actions.find((a) => a.id.toLowerCase().replace(/[-_\s]+/g, '') === normReq);
    if (normMatch) return normMatch.id;

    // 3. Verb synonym mapping across ALL connectors
    const verbSynonyms: Record<string, string[]> = {
      read: ['list', 'get', 'fetch', 'search', 'query', 'find', 'retrieve', 'show', 'pull', 'scan'],
      list: ['read', 'get', 'fetch', 'search', 'query', 'find', 'retrieve', 'show', 'all'],
      get: ['read', 'list', 'fetch', 'search', 'find', 'retrieve', 'show'],
      send: ['post', 'create', 'publish', 'dispatch', 'write', 'submit', 'emit'],
      create: ['send', 'post', 'add', 'insert', 'new', 'make', 'generate', 'write', 'push'],
      add: ['create', 'insert', 'append', 'push', 'post'],
      update: ['edit', 'modify', 'patch', 'set', 'change', 'upsert'],
      delete: ['remove', 'trash', 'clear', 'destroy', 'drop', 'purge'],
    };

    const reqWords = req.split(/[-_\s]+/);

    // Token overlap scoring
    let bestAction = actions[0].id;
    let maxScore = -1;

    for (const act of actions) {
      let score = 0;
      const actId = act.id.toLowerCase();
      const actName = act.name.toLowerCase();
      const actDesc = (act.description || '').toLowerCase();

      for (const w of reqWords) {
        if (!w || w.length < 2) continue;
        if (actId.includes(w)) score += 5;
        if (actName.includes(w)) score += 3;
        if (actDesc.includes(w)) score += 1;

        // Check verb synonyms
        for (const [canonical, synonyms] of Object.entries(verbSynonyms)) {
          if ((w === canonical || synonyms.includes(w)) && (actId.includes(canonical) || synonyms.some((s) => actId.includes(s)))) {
            score += 4;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestAction = act.id;
      }
    }

    return maxScore > 0 ? bestAction : requestedActionId;
  }

  async handleTrigger(triggerId: string, context: ExecutionContext): Promise<ConnectorExecutionOutput> {
    return { success: true, data: context.stepInput };
  }

  async refreshToken(credentials: Record<string, any>): Promise<Record<string, any>> {
    return credentials;
  }
}
