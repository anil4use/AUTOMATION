import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { glassdoorManifest } from './manifest';

export class GlassdoorConnector extends BaseConnector {
  manifest = glassdoorManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const partnerId = (creds.partnerId || creds.partner_id || creds.apiKey) as string;

    const targetAction = this.resolveActionId(actionId);

    try {
      if (targetAction === 'search_companies') {
        const companyName = inputs.companyName || inputs.query;
        if (!companyName) {
          return { success: false, data: {}, error: 'companyName parameter is required.' };
        }
        if (!partnerId || !creds.apiKey) {
          return { success: false, data: {}, error: 'Glassdoor Partner ID and API key are required.' };
        }

        const res = await fetch(`https://api.glassdoor.com/api/api.htm?v=1&format=json&t.p=${partnerId}&t.k=${creds.apiKey}&action=employers&q=${encodeURIComponent(companyName)}`);
        if (res.ok) {
          const data: any = await res.json();
          const employers = data.response?.employers || [];
          return { success: true, data: { companies: employers, count: employers.length } };
        }
        return { success: false, data: {}, error: `Glassdoor API request failed with status ${res.status}` };
      }

      if (targetAction === 'get_salary_estimates') {
        const jobTitle = inputs.jobTitle;
        if (!jobTitle) {
          return { success: false, data: {}, error: 'jobTitle parameter is required for get_salary_estimates.' };
        }
        if (!partnerId || !creds.apiKey) {
          return { success: false, data: {}, error: 'Glassdoor Partner ID and API key are required.' };
        }
        const res = await fetch(`https://api.glassdoor.com/api/api.htm?v=1&format=json&t.p=${partnerId}&t.k=${creds.apiKey}&action=jobs-stats&jobTitle=${encodeURIComponent(jobTitle)}`);
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: data.response || {} };
        }
        return { success: false, data: {}, error: `Glassdoor API request failed (${res.status})` };
      }

      if (targetAction === 'search_jobs') {
        const query = inputs.query || inputs.jobTitle;
        if (!query) {
          return { success: false, data: {}, error: 'query or jobTitle is required for search_jobs.' };
        }
        if (!partnerId || !creds.apiKey) {
          return { success: false, data: {}, error: 'Glassdoor Partner ID and API key are required for job search.' };
        }
        const res = await fetch(`https://api.glassdoor.com/api/api.htm?v=1&format=json&t.p=${partnerId}&t.k=${creds.apiKey}&action=jobs&q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data: any = await res.json();
          return { success: true, data: { jobs: data.response?.jobs || [], totalCount: data.response?.totalJobs || 0 } };
        }
        return { success: false, data: {}, error: `Glassdoor job search failed (${res.status})` };
      }

      return { success: false, data: {}, error: `Unknown Glassdoor action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Glassdoor connector API error' };
    }
  }
}

export * from './manifest';
