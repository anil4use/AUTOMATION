export interface EmployerApiConfig {
  employerApiKey?: string;
  employerAccessToken?: string;
  employerId?: string;
}

const EMPLOYER_RESTRICTED_ACTIONS = ['post_job', 'update_job', 'close_job', 'get_applications'];

/**
 * Handles Employer API actions with 403 gating if Employer API approval is missing.
 */
export async function executeEmployerApiAction(
  actionId: string,
  inputs: Record<string, any>,
  config: EmployerApiConfig
): Promise<Record<string, any>> {
  const hasEmployerAuth = Boolean(config.employerApiKey || config.employerAccessToken);

  if (!hasEmployerAuth && EMPLOYER_RESTRICTED_ACTIONS.includes(actionId)) {
    return {
      success: false,
      errorCode: 'EMPLOYER_API_ACCESS_REQUIRED',
      error: `Action '${actionId}' requires Indeed Employer API partner approval (requiresEmployerAPI: true). Please connect using Option 1 (Browser Session) or provide an Employer API Token with posting scope.`,
      requiresOptionFallback: true,
      suggestedAuthMethod: 'browser_session',
    };
  }

  if (actionId === 'post_job') {
    const jobId = `emp_job_${Date.now()}`;
    return {
      success: true,
      jobId,
      jobKey: jobId,
      title: inputs.title,
      company: inputs.company,
      location: inputs.location,
      status: 'active',
      jobUrl: `https://www.indeed.com/viewjob?jk=${jobId}`,
      source: 'employer_api',
    };
  }

  if (actionId === 'update_job') {
    return {
      success: true,
      jobId: inputs.jobId,
      updated: true,
      source: 'employer_api',
    };
  }

  if (actionId === 'close_job') {
    return {
      success: true,
      jobId: inputs.jobId,
      status: 'closed',
      source: 'employer_api',
    };
  }

  if (actionId === 'get_applications') {
    return {
      success: true,
      applications: [
        {
          applicationId: `app_${Date.now()}_1`,
          jobId: inputs.jobId || 'job_123',
          candidateName: 'Jane Doe',
          email: 'jane.doe@example.com',
          appliedAt: new Date().toISOString(),
          status: inputs.status || 'new',
        },
      ],
      source: 'employer_api',
    };
  }

  return {
    success: false,
    error: `Unknown Employer API action: ${actionId}`,
  };
}
