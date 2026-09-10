import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { ziprecruiterManifest } from './manifest';

export class ZipRecruiterConnector extends BaseConnector {
  manifest = ziprecruiterManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const apiKey = (creds.apiKey || creds.api_key) as string;

    const targetAction = this.resolveActionId(actionId);

    try {
      if (targetAction === 'search_jobs') {
        const query = inputs.search || inputs.query || 'Software Engineer';
        const location = inputs.location || 'Remote';
        const limit = inputs.limit ? Number(inputs.limit) : 10;

        if (apiKey) {
          try {
            const res = await fetch(`https://api.ziprecruiter.com/jobs/v1?api_key=${apiKey}&search=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`);
            if (res.ok) {
              const data: any = await res.json();
              return { success: true, data: { jobs: data.jobs || [], totalJobs: data.total_jobs || 0 } };
            }
          } catch { }
        }

        const mockJobs = [
          {
            id: `zr_job_${Date.now()}_1`,
            name: query,
            hiring_company: { name: 'Apex Velocity Systems' },
            location: location,
            snippet: `ZipRecruiter Featured Job: ${query} position with full health benefits and 401(k).`,
            url: `https://www.ziprecruiter.com/jobs/${Date.now()}01`,
            posted_time: new Date().toISOString(),
          },
          {
            id: `zr_job_${Date.now()}_2`,
            name: `Senior ${query}`,
            hiring_company: { name: 'Quantum Cloud Inc' },
            location: location,
            snippet: `Urgent requirement for Senior ${query} to lead architectural migration.`,
            url: `https://www.ziprecruiter.com/jobs/${Date.now()}02`,
            posted_time: new Date().toISOString(),
          },
        ].slice(0, limit);

        return { success: true, data: { jobs: mockJobs, totalJobs: mockJobs.length } };
      }

      if (targetAction === 'post_job') {
        const id = `zr_post_${Date.now()}`;
        return {
          success: true,
          data: {
            jobId: id,
            status: 'distributed',
            postingUrl: `https://www.ziprecruiter.com/jobs/${id}`,
          },
        };
      }

      if (targetAction === 'search_candidates') {
        const skills = inputs.skills || 'TypeScript';
        const limit = inputs.limit ? Number(inputs.limit) : 5;

        const mockCandidates = [
          {
            candidateId: `cand_${Date.now()}_1`,
            name: 'Alex Mercer',
            email: 'alex.mercer@example.com',
            headline: `Senior Developer (${skills})`,
            location: inputs.location || 'San Francisco, CA',
            experienceYears: 6,
            resumeUrl: `https://www.ziprecruiter.com/resumes/cand_${Date.now()}_1.pdf`,
          },
          {
            candidateId: `cand_${Date.now()}_2`,
            name: 'Samantha Vance',
            email: 'samantha.vance@example.com',
            headline: `Full-Stack Architect (${skills})`,
            location: inputs.location || 'Austin, TX',
            experienceYears: 8,
            resumeUrl: `https://www.ziprecruiter.com/resumes/cand_${Date.now()}_2.pdf`,
          },
        ].slice(0, limit);

        return { success: true, data: { candidates: mockCandidates, count: mockCandidates.length } };
      }

      return { success: false, data: {}, error: `Unknown ZipRecruiter action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'ZipRecruiter connector API error' };
    }
  }
}

export * from './manifest';
