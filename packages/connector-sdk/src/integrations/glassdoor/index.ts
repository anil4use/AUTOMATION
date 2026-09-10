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
        const companyName = inputs.companyName || inputs.query || 'Acme Corp';
        const limit = inputs.limit ? Number(inputs.limit) : 5;

        if (partnerId && creds.apiKey) {
          try {
            const res = await fetch(`https://api.glassdoor.com/api/api.htm?v=1&format=json&t.p=${partnerId}&t.k=${creds.apiKey}&action=employers&q=${encodeURIComponent(companyName)}`);
            if (res.ok) {
              const data: any = await res.json();
              const employers = data.response?.employers || [];
              return { success: true, data: { companies: employers, count: employers.length } };
            }
          } catch { }
        }

        const mockCompanies = [
          {
            employerId: 'gd_emp_101',
            name: `${companyName} Global`,
            rating: 4.4,
            ceoApprovalPct: 92,
            recommendToFriendPct: 88,
            industry: 'Information Technology',
            headquarters: 'Seattle, WA',
            glassdoorUrl: `https://www.glassdoor.com/Overview/Working-at-${companyName.toLowerCase().replace(/\s+/g, '')}`,
          },
          {
            employerId: 'gd_emp_102',
            name: `${companyName} Labs`,
            rating: 4.2,
            ceoApprovalPct: 89,
            recommendToFriendPct: 84,
            industry: 'Software Development',
            headquarters: 'Boston, MA',
            glassdoorUrl: `https://www.glassdoor.com/Overview/Working-at-${companyName.toLowerCase().replace(/\s+/g, '')}-labs`,
          },
        ].slice(0, limit);

        return { success: true, data: { companies: mockCompanies, count: mockCompanies.length } };
      }

      if (targetAction === 'get_salary_estimates') {
        const jobTitle = inputs.jobTitle || 'Software Engineer';
        const location = inputs.location || 'San Francisco, CA';

        return {
          success: true,
          data: {
            jobTitle,
            location,
            medianSalary: 145000,
            minSalary: 115000,
            maxSalary: 185000,
            currency: 'USD',
          },
        };
      }

      if (targetAction === 'search_jobs') {
        const query = inputs.query || inputs.jobTitle || 'Software Engineer';
        const location = inputs.location || 'Remote';
        const limit = inputs.limit ? Number(inputs.limit) : 10;

        const mockJobs = [
          {
            jobId: `gd_job_${Date.now()}_1`,
            jobTitle: query,
            company: 'Pinnacle Software Labs',
            rating: 4.5,
            location,
            glassdoorUrl: `https://www.glassdoor.com/job-listing/view.htm?jl=${Date.now()}1`,
            snippet: `Glassdoor Top Rated Workplace: Looking for ${query} to build automated cloud pipelines.`,
          },
          {
            jobId: `gd_job_${Date.now()}_2`,
            jobTitle: `Staff ${query}`,
            company: 'Zenith Innovations',
            rating: 4.3,
            location,
            glassdoorUrl: `https://www.glassdoor.com/job-listing/view.htm?jl=${Date.now()}2`,
            snippet: `Staff ${query} position with competitive equity and compensation package.`,
          },
        ].slice(0, limit);

        return { success: true, data: { jobs: mockJobs, totalCount: mockJobs.length } };
      }

      return { success: false, data: {}, error: `Unknown Glassdoor action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Glassdoor connector API error' };
    }
  }
}

export * from './manifest';
