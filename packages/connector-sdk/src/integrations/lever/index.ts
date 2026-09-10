import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { leverManifest } from './manifest';

export class LeverConnector extends BaseConnector {
  manifest = leverManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const apiKey = (creds.apiKey || creds.api_key) as string;

    const targetAction = this.resolveActionId(actionId);

    try {
      if (targetAction === 'list_opportunities') {
        const postingId = inputs.postingId;
        const limit = inputs.limit ? Number(inputs.limit) : 10;

        if (!apiKey) {
          return { success: false, data: {}, error: 'Lever API key is required to list opportunities.' };
        }

        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const queryUrl = postingId ? `https://api.lever.co/v1/opportunities?posting_id=${postingId}` : `https://api.lever.co/v1/opportunities?limit=${limit}`;
        const res = await fetch(queryUrl, { headers: { Authorization: authHeader } });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: { opportunities: data.data || [], total: (data.data || []).length } };
        }
        const errText = await res.text();
        return { success: false, data: {}, error: `Lever API error (${res.status}): ${errText}` };
      }

      if (targetAction === 'create_opportunity') {
        if (!apiKey) {
          return { success: false, data: {}, error: 'Lever API key is required to create an opportunity.' };
        }
        const name = inputs.name;
        const email = inputs.email;
        if (!name || !email) {
          return { success: false, data: {}, error: 'name and email are required fields for create_opportunity.' };
        }
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const res = await fetch('https://api.lever.co/v1/opportunities', {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, emails: [email], headline: inputs.headline }),
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: data.data };
        }
        const errText = await res.text();
        return { success: false, data: {}, error: `Lever API error (${res.status}): ${errText}` };
      }

      if (targetAction === 'update_opportunity_stage') {
        if (!apiKey) {
          return { success: false, data: {}, error: 'Lever API key is required to update stage.' };
        }
        const opportunityId = inputs.opportunityId;
        const stageId = inputs.stageId;
        if (!opportunityId || !stageId) {
          return { success: false, data: {}, error: 'opportunityId and stageId are required.' };
        }
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const res = await fetch(`https://api.lever.co/v1/opportunities/${opportunityId}/stage`, {
          method: 'PUT',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: stageId }),
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: data.data };
        }
        return { success: false, data: {}, error: `Lever API update stage failed (${res.status})` };
      }

      if (targetAction === 'archive_opportunity') {
        if (!apiKey) {
          return { success: false, data: {}, error: 'Lever API key is required to archive opportunity.' };
        }
        const opportunityId = inputs.opportunityId;
        const reasonId = inputs.reasonId;
        if (!opportunityId || !reasonId) {
          return { success: false, data: {}, error: 'opportunityId and reasonId are required.' };
        }
        const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
        const res = await fetch(`https://api.lever.co/v1/opportunities/${opportunityId}/archived`, {
          method: 'PUT',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reasonId }),
        });
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: data.data };
        }
        return { success: false, data: {}, error: `Lever API archive failed (${res.status})` };
      }

      return { success: false, data: {}, error: `Unknown Lever action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Lever connector API error' };
    }
  }
}

export * from './manifest';
export * from './webhook';
export * from './choices';
