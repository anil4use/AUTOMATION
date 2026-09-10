import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { greenhouseManifest } from './manifest';

export class GreenhouseConnector extends BaseConnector {
  manifest = greenhouseManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const apiKey = (creds.harvestApiKey || creds.apiKey || creds.api_key) as string;

    const targetAction = this.resolveActionId(actionId);

    try {
      if (targetAction === 'list_jobs') {
        const status = inputs.status || 'open';
        if (!apiKey) {
          return { success: false, data: {}, error: 'Greenhouse Harvest API key is required to list jobs.' };
        }
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const res = await fetch(`https://harvest.greenhouse.io/v1/jobs?status=${status}`, {
          headers: { Authorization: authHeader },
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: { jobs: data || [], count: (data || []).length } };
        }
        const errText = await res.text();
        return { success: false, data: {}, error: `Greenhouse API error (${res.status}): ${errText}` };
      }

      if (targetAction === 'get_candidate') {
        const candidateId = inputs.candidateId;
        if (!candidateId) {
          return { success: false, data: {}, error: 'candidateId is required for get_candidate.' };
        }
        if (!apiKey) {
          return { success: false, data: {}, error: 'Greenhouse Harvest API key is required to fetch candidate.' };
        }
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const res = await fetch(`https://harvest.greenhouse.io/v1/candidates/${candidateId}`, {
          headers: { Authorization: authHeader },
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data };
        }
        return { success: false, data: {}, error: `Greenhouse API candidate fetch failed (${res.status})` };
      }

      if (targetAction === 'add_candidate_note') {
        const candidateId = inputs.candidateId;
        const note = inputs.note;
        if (!candidateId || !note) {
          return { success: false, data: {}, error: 'candidateId and note content are required.' };
        }
        if (!apiKey) {
          return { success: false, data: {}, error: 'Greenhouse Harvest API key is required to add candidate note.' };
        }
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const res = await fetch(`https://harvest.greenhouse.io/v1/candidates/${candidateId}/activity_feed/notes`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: note }),
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data };
        }
        return { success: false, data: {}, error: `Greenhouse API add note failed (${res.status})` };
      }

      if (targetAction === 'advance_candidate_stage') {
        const applicationId = inputs.applicationId;
        if (!applicationId) {
          return { success: false, data: {}, error: 'applicationId is required to advance candidate stage.' };
        }
        if (!apiKey) {
          return { success: false, data: {}, error: 'Greenhouse Harvest API key is required.' };
        }
        return { success: false, data: {}, error: 'Greenhouse advance stage requires valid Harvest API credentials and stage configuration.' };
      }

      return { success: false, data: {}, error: `Unknown Greenhouse action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Greenhouse connector API error' };
    }
  }
}

export * from './manifest';
export * from './webhook';
export * from './choices';
