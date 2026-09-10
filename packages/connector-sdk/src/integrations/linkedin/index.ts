import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { linkedinManifest } from './manifest';
import {
  executeBrowserSearchJobs,
  executeBrowserGetProfile,
  executeBrowserApplyJob,
  executeBrowserPostFeed,
} from './browser';
import { executeApiAction } from './api';

export class LinkedInConnector extends BaseConnector {
  manifest = linkedinManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const authMethod = creds.authMethod || (creds.cookies ? 'browser_session' : 'access_token');
    const targetAction = this.resolveActionId(actionId);

    try {
      let data: Record<string, any>;

      if (authMethod === 'browser_session') {
        switch (targetAction) {
          case 'search_jobs':
            data = await executeBrowserSearchJobs(inputs, { cookies: creds.cookies, userAgent: creds.userAgent });
            break;
          case 'get_profile':
          case 'search_people':
            data = await executeBrowserGetProfile(inputs, { cookies: creds.cookies, userAgent: creds.userAgent });
            break;
          case 'apply_to_job':
            data = await executeBrowserApplyJob(inputs);
            break;
          case 'create_post':
            data = await executeBrowserPostFeed(inputs);
            break;
          default:
            data = await executeBrowserSearchJobs(inputs, { cookies: creds.cookies });
            break;
        }
      } else {
        data = await executeApiAction(targetAction, inputs, { accessToken: creds.accessToken, partnerApiKey: creds.partnerApiKey });
      }

      if (data.success === false) {
        return { success: false, data: {}, error: data.error || 'LinkedIn execution failed' };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'LinkedIn connector error' };
    }
  }
}

export * from './manifest';
export * from './choices';
