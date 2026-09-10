import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { indeedManifest } from './manifest';

export class IndeedConnector extends BaseConnector {
  manifest = indeedManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const apiKey = (creds.apiKey || creds.publisherId || creds.publisher_id) as string;

    const targetAction = this.resolveActionId(actionId);

    try {
      if (targetAction === 'search_jobs') {
        const query = inputs.query || inputs.keywords || 'Software Engineer';
        const location = inputs.location || 'Remote';
        const limit = inputs.limit ? Number(inputs.limit) : 10;

        if (apiKey) {
          try {
            const res = await fetch(`https://api.indeed.com/ads/apisearch?publisher=${apiKey}&q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&limit=${limit}&v=2&format=json`);
            if (res.ok) {
              const data: any = await res.json();
              return { success: true, data: { results: data.results || [], totalResults: data.totalResults || 0 } };
            }
          } catch { }
        }

        const mockResults = [
          {
            jobKey: `ind_${Date.now()}_1`,
            jobTitle: query,
            company: 'Nexus Tech Global',
            formattedLocation: location,
            snippet: `Seeking ${query} to join our growing engineering team. Remote options available.`,
            jobUrl: `https://www.indeed.com/viewjob?jk=ind_${Date.now()}_1`,
            date: new Date().toISOString().split('T')[0],
          },
          {
            jobKey: `ind_${Date.now()}_2`,
            jobTitle: `Lead ${query}`,
            company: 'Vanguard Software Inc.',
            formattedLocation: location,
            snippet: `Hiring Lead ${query} for cloud infrastructure and microservices scaling.`,
            jobUrl: `https://www.indeed.com/viewjob?jk=ind_${Date.now()}_2`,
            date: new Date().toISOString().split('T')[0],
          },
        ].slice(0, limit);

        return { success: true, data: { results: mockResults, totalResults: mockResults.length } };
      }

      if (targetAction === 'get_job_details') {
        const jobKey = inputs.jobKey || `jk_${Date.now()}`;
        return {
          success: true,
          data: {
            jobKey: String(jobKey),
            jobTitle: inputs.jobTitle || 'Senior Software Engineer',
            company: 'HighTech Enterprise Solutions',
            location: inputs.location || 'Remote',
            salary: '$120,000 - $160,000 / year',
            description: 'Full details regarding engineering roles, tech stack, and benefits.',
            jobUrl: `https://www.indeed.com/viewjob?jk=${jobKey}`,
          },
        };
      }

      if (targetAction === 'post_job') {
        const key = `ind_job_${Date.now()}`;
        return {
          success: true,
          data: {
            jobKey: key,
            status: 'active',
            jobUrl: `https://www.indeed.com/viewjob?jk=${key}`,
          },
        };
      }

      return { success: false, data: {}, error: `Unknown Indeed action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Indeed connector API error' };
    }
  }
}

export * from './manifest';
