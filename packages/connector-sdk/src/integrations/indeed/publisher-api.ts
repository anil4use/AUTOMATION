export interface IndeedApiConfig {
  publisherId?: string;
  apiKey?: string;
  accessToken?: string;
}

/**
 * Executes public/publisher actions on Indeed using the Publisher API or public fallback.
 */
export async function executePublisherApiAction(
  actionId: string,
  inputs: Record<string, any>,
  config: IndeedApiConfig
): Promise<Record<string, any>> {
  const publisherId = config.publisherId || config.apiKey;

  if (actionId === 'search_jobs') {
    const query = inputs.query || 'Engineer';
    const location = inputs.location || 'Remote';
    const limit = inputs.maxResults ? Number(inputs.maxResults) : 10;

    if (!publisherId) {
      return {
        success: false,
        error: 'Indeed Publisher ID / API Key is required for Publisher API search.',
      };
    }

    try {
      const res = await fetch(
        `https://api.indeed.com/ads/apisearch?publisher=${publisherId}&q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&limit=${limit}&v=2&format=json`
      );
      if (res.ok) {
        const data: any = await res.json();
        return {
          success: true,
          jobs: data.results || [],
          totalResults: data.totalResults || 0,
          source: 'publisher_api',
        };
      }
      return { success: false, error: `Indeed Publisher API returned status ${res.status}` };
    } catch (err: any) {
      return { success: false, error: `Indeed Publisher API request failed: ${err?.message}` };
    }
  }

  if (actionId === 'get_job_details') {
    const jobKey = inputs.jobKey;
    if (!jobKey) {
      return { success: false, error: 'jobKey parameter is required for get_job_details.' };
    }
    if (!publisherId) {
      return { success: false, error: 'Indeed Publisher ID / API Key is required for job details.' };
    }
    try {
      const res = await fetch(`https://api.indeed.com/ads/apigetjobs?publisher=${publisherId}&jobkeys=${encodeURIComponent(jobKey)}&v=2&format=json`);
      if (res.ok) {
        const data: any = await res.json();
        return { success: true, job: data.results?.[0] || null, source: 'publisher_api' };
      }
      return { success: false, error: `Indeed API fetch error ${res.status}` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch job details from Indeed API.' };
    }
  }

  if (actionId === 'get_company_jobs') {
    const company = inputs.companyName;
    if (!company) {
      return { success: false, error: 'companyName parameter is required for get_company_jobs.' };
    }
    if (!publisherId) {
      return { success: false, error: 'Indeed Publisher ID / API Key is required.' };
    }
    return executePublisherApiAction('search_jobs', { query: company, location: inputs.location }, config);
  }

  return {
    success: false,
    error: `Unsupported Publisher API action: ${actionId}`,
  };
}
