import { ConnectorManifest } from '@automation/shared-types';

export const indeedManifest: ConnectorManifest = {
  id: 'indeed',
  name: 'Indeed Job Board',
  description: 'Search Indeed job index, retrieve salary info, track job alerts, and publish job listings.',
  category: 'Jobs & Recruitment',
  icon: '/icons/indeed.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_job_alert',
      name: 'New Job Alert Match',
      description: 'Triggers when a new job posting matching alert parameters is found on Indeed.',
      type: 'trigger',
      inputs: [
        { key: 'publisherId', label: 'Publisher ID', type: 'string', required: true },
        { key: 'keywords', label: 'Job Title / Keywords', type: 'string', required: true },
        { key: 'location', label: 'Location (City, State, Zip, or Remote)', type: 'string', required: false },
        { key: 'jobType', label: 'Job Type (fulltime, parttime, contract)', type: 'string', required: false },
        { key: 'radius', label: 'Search Radius (Miles)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobId', label: 'Job Key / ID', type: 'string', required: true },
        { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company Name', type: 'string', required: true },
        { key: 'formattedLocation', label: 'Location', type: 'string', required: true },
        { key: 'snippet', label: 'Description Snippet', type: 'string', required: true },
        { key: 'jobUrl', label: 'Indeed Apply URL', type: 'string', required: true },
        { key: 'date', label: 'Posting Date', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'search_jobs',
      name: 'Search Jobs on Indeed',
      description: 'Search active job listings on Indeed by title, query, location, and distance.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Job Title or Search Query', type: 'string', required: true },
        { key: 'location', label: 'Location (City or State)', type: 'string', required: false },
        { key: 'radius', label: 'Radius (Miles)', type: 'number', required: false },
        { key: 'limit', label: 'Result Limit (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'results', label: 'Array of Job Postings', type: 'json', required: true },
        { key: 'totalResults', label: 'Total Matching Jobs Count', type: 'number', required: true },
      ],
    },
    {
      id: 'get_job_details',
      name: 'Get Job Details',
      description: 'Retrieve full job description, salary range, and posting status.',
      type: 'action',
      inputs: [
        { key: 'jobKey', label: 'Indeed Job Key / ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'jobKey', label: 'Job Key', type: 'string', required: true },
        { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: true },
        { key: 'salary', label: 'Salary Info', type: 'string', required: false },
        { key: 'description', label: 'Job Description', type: 'string', required: true },
        { key: 'jobUrl', label: 'Job URL', type: 'string', required: true },
      ],
    },
    {
      id: 'post_job',
      name: 'Post Job Listing',
      description: 'Publish a job opening to Indeed via Publisher API.',
      type: 'action',
      inputs: [
        { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company Name', type: 'string', required: true },
        { key: 'location', label: 'Job Location', type: 'string', required: true },
        { key: 'description', label: 'Job Description', type: 'string', required: true },
        { key: 'applyUrl', label: 'Candidate Apply URL', type: 'string', required: true },
        { key: 'jobType', label: 'Job Type (fulltime, contract)', type: 'string', required: false },
        { key: 'salaryMin', label: 'Minimum Salary', type: 'number', required: false },
        { key: 'salaryMax', label: 'Maximum Salary', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobKey', label: 'Created Job Key', type: 'string', required: true },
        { key: 'status', label: 'Posting Status', type: 'string', required: true },
        { key: 'jobUrl', label: 'Published Job Page', type: 'string', required: true },
      ],
    },
  ],
};
