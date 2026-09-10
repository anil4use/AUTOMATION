import { ConnectorManifest } from '@automation/shared-types';

export const glassdoorManifest: ConnectorManifest = {
  id: 'glassdoor',
  name: 'Glassdoor',
  description: 'Search company ratings, employee reviews, benchmark salary ranges, and job postings.',
  category: 'Jobs & Recruitment',
  icon: '/icons/glassdoor.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_company_review',
      name: 'New Company Review',
      description: 'Triggers when a new employee review or rating is published for your organization.',
      type: 'trigger',
      inputs: [
        { key: 'employerId', label: 'Glassdoor Employer ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'reviewId', label: 'Review ID', type: 'string', required: true },
        { key: 'rating', label: 'Overall Rating (1-5)', type: 'number', required: true },
        { key: 'summary', label: 'Review Title / Summary', type: 'string', required: true },
        { key: 'pros', label: 'Review Pros', type: 'string', required: true },
        { key: 'cons', label: 'Review Cons', type: 'string', required: true },
        { key: 'jobTitle', label: 'Reviewer Job Title', type: 'string', required: false },
        { key: 'reviewDate', label: 'Review Date', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'search_companies',
      name: 'Search Companies & Ratings',
      description: 'Search company profiles, overall star ratings, CEO approval %, and reviews on Glassdoor.',
      type: 'action',
      inputs: [
        { key: 'companyName', label: 'Company Name', type: 'string', required: true },
        { key: 'limit', label: 'Result Limit (Default: 5)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'companies', label: 'Array of Company Data', type: 'json', required: true },
        { key: 'count', label: 'Matching Count', type: 'number', required: true },
      ],
    },
    {
      id: 'get_salary_estimates',
      name: 'Get Salary Benchmarks',
      description: 'Retrieve benchmark salary ranges (median, min, max) by job title and location.',
      type: 'action',
      inputs: [
        { key: 'jobTitle', label: 'Job Title (e.g. Senior Frontend Engineer)', type: 'string', required: true },
        { key: 'location', label: 'Location (e.g. San Francisco, CA)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: true },
        { key: 'medianSalary', label: 'Median Base Pay ($/yr)', type: 'number', required: true },
        { key: 'minSalary', label: 'Min Salary Range', type: 'number', required: true },
        { key: 'maxSalary', label: 'Max Salary Range', type: 'number', required: true },
        { key: 'currency', label: 'Currency Code (USD, EUR)', type: 'string', required: true },
      ],
    },
    {
      id: 'search_jobs',
      name: 'Search Glassdoor Jobs',
      description: 'Search active job postings listed on Glassdoor.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Job Title or Keyword', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: false },
        { key: 'limit', label: 'Max Results Limit', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobs', label: 'Array of Jobs', type: 'json', required: true },
        { key: 'totalCount', label: 'Total Count', type: 'number', required: true },
      ],
    },
  ],
};
