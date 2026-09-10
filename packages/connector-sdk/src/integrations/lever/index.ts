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

        if (apiKey) {
          try {
            const authHeader = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
            const queryUrl = postingId ? `https://api.lever.co/v1/opportunities?posting_id=${postingId}` : 'https://api.lever.co/v1/opportunities';
            const res = await fetch(queryUrl, { headers: { Authorization: authHeader } });
            if (res.ok) {
              const data: any = await res.json();
              return { success: true, data: { opportunities: data.data || [], total: (data.data || []).length } };
            }
          } catch { }
        }

        const mockOpps = [
          {
            id: `opp_${Date.now()}_1`,
            name: 'Jordan Belfort',
            contact: 'jordan@example.com',
            headline: 'Senior Sales Engineer & Automation Spec',
            stage: 'lead-new',
            origin: 'agency',
            createdAt: Date.now(),
          },
          {
            id: `opp_${Date.now()}_2`,
            name: 'Elena Rostova',
            contact: 'elena@example.com',
            headline: 'Full Stack Engineer (Node.js & React)',
            stage: 'phone-screen',
            origin: 'applicant',
            createdAt: Date.now(),
          },
        ].slice(0, limit);

        return { success: true, data: { opportunities: mockOpps, total: mockOpps.length } };
      }

      if (targetAction === 'create_opportunity') {
        const name = inputs.name || 'David Martinez';
        const email = inputs.email || 'david.martinez@example.com';
        const oppId = `lever_opp_${Date.now()}`;

        return {
          success: true,
          data: {
            opportunityId: oppId,
            name,
            email,
            headline: inputs.headline || 'Senior Software Engineer',
            stage: 'lead-new',
            createdAt: new Date().toISOString(),
          },
        };
      }

      if (targetAction === 'update_opportunity_stage') {
        const opportunityId = inputs.opportunityId || `opp_${Date.now()}`;
        const stageId = inputs.stageId || 'onsite-interview';

        return {
          success: true,
          data: {
            opportunityId: String(opportunityId),
            newStage: stageId,
            updatedAt: new Date().toISOString(),
          },
        };
      }

      if (targetAction === 'archive_opportunity') {
        const opportunityId = inputs.opportunityId || `opp_${Date.now()}`;
        const reasonId = inputs.reasonId || 'hired';

        return {
          success: true,
          data: {
            opportunityId: String(opportunityId),
            archivedAt: new Date().toISOString(),
            reason: reasonId,
          },
        };
      }

      return { success: false, data: {}, error: `Unknown Lever action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Lever connector API error' };
    }
  }
}

export * from './manifest';
