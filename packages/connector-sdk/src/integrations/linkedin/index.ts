import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { linkedinManifest } from './manifest';
import {
  executeSearchJobs,
  executeGetJobDetails,
  executePostJob,
  executePostCompanyUpdate,
  executePostUserShare,
  executeSearchCompanies,
  executeGetUserProfile,
} from './actions';

export class LinkedInConnector extends BaseConnector {
  manifest = linkedinManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const credentials = context.connectionCredentials || {};
    const creds = {
      accessToken: (credentials.accessToken || credentials.access_token) as string,
    };

    const targetAction = this.resolveActionId(actionId);

    try {
      let data: Record<string, any>;

      switch (targetAction) {
        case 'search_jobs':
          data = await executeSearchJobs(inputs, creds);
          break;
        case 'get_job_details':
          data = await executeGetJobDetails(inputs, creds);
          break;
        case 'post_job':
          data = await executePostJob(inputs, creds);
          break;
        case 'post_company_update':
          data = await executePostCompanyUpdate(inputs, creds);
          break;
        case 'post_user_share':
          data = await executePostUserShare(inputs, creds);
          break;
        case 'search_companies':
          data = await executeSearchCompanies(inputs, creds);
          break;
        case 'get_user_profile':
          data = await executeGetUserProfile(inputs, creds);
          break;
        default:
          return {
            success: false,
            data: {},
            error: `Unknown LinkedIn action: '${actionId}'`,
          };
      }

      return { success: true, data };
    } catch (err: any) {
      return {
        success: false,
        data: {},
        error: err?.message || 'LinkedIn connector API error',
      };
    }
  }
}

export * from './manifest';
export * from './choices';
