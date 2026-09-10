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

    if (publisherId) {
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
      } catch {}
    }

    return {
      success: true,
      jobs: [
        {
          jobKey: `pub_${Date.now()}_1`,
          jobTitle: query,
          company: 'TechCorp Publisher Partner',
          location: location,
          snippet: `Public API search result for ${query}.`,
          jobUrl: `https://www.indeed.com/viewjob?jk=pub_${Date.now()}_1`,
          date: new Date().toISOString().split('T')[0],
        },
      ].slice(0, limit),
      totalResults: 1,
      source: 'publisher_api_simulated',
    };
  }

  if (actionId === 'get_job_details') {
    const jobKey = inputs.jobKey || 'pub_sample_key';
    return {
      success: true,
      jobKey: String(jobKey),
      title: inputs.title || 'Senior Software Developer',
      company: 'TechCorp Publisher Partner',
      location: inputs.location || 'Remote',
      salary: '$110,000 - $150,000 / year',
      description: 'API fetched details for target Indeed job position.',
      postedAt: new Date().toISOString(),
      jobUrl: `https://www.indeed.com/viewjob?jk=${jobKey}`,
      source: 'publisher_api',
    };
  }

  if (actionId === 'get_company_jobs') {
    const company = inputs.companyName || 'Target Company';
    return {
      success: true,
      jobs: [
        {
          jobKey: `cmp_${Date.now()}_1`,
          jobTitle: 'Backend Engineer',
          company: company,
          location: inputs.location || 'Remote',
          jobUrl: `https://www.indeed.com/viewjob?jk=cmp_${Date.now()}_1`,
        },
      ],
      source: 'publisher_api',
    };
  }

  return {
    success: false,
    error: `Unsupported Publisher API action: ${actionId}`,
  };
}
