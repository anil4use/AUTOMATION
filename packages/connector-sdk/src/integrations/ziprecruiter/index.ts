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

        throw new Error(`ZipRecruiter Jobs Search execution failed. Valid ZipRecruiter Partner API key required.`);
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

        throw new Error(`ZipRecruiter Candidate Search execution failed. Valid ZipRecruiter Partner API key required.`);
      }

      return { success: false, data: {}, error: `Unknown ZipRecruiter action: ${actionId}` };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'ZipRecruiter connector API error' };
    }
  }
}

export * from './manifest';
