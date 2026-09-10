import { BaseConnector } from '../../core/base-connector';
import { ExecutionContext, ConnectorExecutionOutput } from '../../core/types';
import { indeedManifest } from './manifest';
import {
  executeBrowserSearchJobs,
  executeBrowserGetJobDetails,
  executeBrowserPostJob,
} from './browser';
import { executePublisherApiAction } from './publisher-api';
import { executeEmployerApiAction } from './employer-api';

export class IndeedConnector extends BaseConnector {
  manifest = indeedManifest;

  async executeAction(
    actionId: string,
    context: ExecutionContext
  ): Promise<ConnectorExecutionOutput> {
    const inputs = context.stepInput || {};
    const creds = context.connectionCredentials || {};
    const authMethod = creds.authMethod || (creds.cookies ? 'browser_session' : creds.employerApiKey ? 'employer_api' : 'publisher_api');
    const targetAction = this.resolveActionId(actionId);

    try {
      let data: Record<string, any>;

      if (authMethod === 'browser_session') {
        switch (targetAction) {
          case 'search_jobs':
            data = await executeBrowserSearchJobs(inputs, { cookies: creds.cookies, userAgent: creds.userAgent });
            break;
          case 'get_job_details':
            data = await executeBrowserGetJobDetails(inputs, { cookies: creds.cookies, userAgent: creds.userAgent });
            break;
          case 'post_job':
            data = await executeBrowserPostJob(inputs);
            break;
          default:
            data = await executeBrowserSearchJobs(inputs, { cookies: creds.cookies });
            break;
        }
      } else if (authMethod === 'employer_api') {
        data = await executeEmployerApiAction(targetAction, inputs, {
          employerApiKey: creds.employerApiKey || creds.apiKey,
          employerAccessToken: creds.employerAccessToken || creds.accessToken,
          employerId: creds.employerId,
        });
      } else {
        // Option 2: Publisher API / API Key
        const isEmployerOnly = ['post_job', 'update_job', 'close_job', 'get_applications'].includes(targetAction);
        if (isEmployerOnly) {
          data = await executeEmployerApiAction(targetAction, inputs, {
            employerApiKey: creds.employerApiKey,
            employerAccessToken: creds.employerAccessToken,
          });
        } else {
          data = await executePublisherApiAction(targetAction, inputs, {
            publisherId: creds.publisherId || creds.publisher_id || creds.apiKey,
            apiKey: creds.apiKey,
            accessToken: creds.accessToken,
          });
        }
      }

      if (data.success === false) {
        return {
          success: false,
          data: data,
          error: data.error || 'Indeed execution failed',
        };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, data: {}, error: err?.message || 'Indeed connector error' };
    }
  }
}

export * from './manifest';
export * from './choices';
