import { ConnectorManifest } from '@automation/shared-types';

export const indeedManifest: ConnectorManifest = {
  id: 'indeed',
  name: 'Indeed Job Board',
  description: 'Search Indeed job listings, track alerts, retrieve employer applications, and manage postings.',
  category: 'Jobs & Recruitment',
  icon: '/icons/indeed.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_job_match',
      name: 'New Job Search Match',
      description: 'Fires when new jobs matching specified criteria appear on Indeed.',
      type: 'trigger',
      inputs: [
        { key: 'query', label: 'Search Query / Job Title', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: false },
      ],
      outputs: [
        { key: 'jobKey', label: 'Job Key', type: 'string', required: true },
        { key: 'jobTitle', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: true },
        { key: 'jobUrl', label: 'Indeed Apply Link', type: 'string', required: true },
      ],
    },
    {
      id: 'new_application',
      name: 'New Applicant Received',
      description: 'Fires when a candidate applies for a posted employer job.',
      type: 'trigger',
      inputs: [
        { key: 'jobId', label: 'Indeed Job ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'applicantName', label: 'Applicant Name', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: true },
        { key: 'resumeUrl', label: 'Resume File URL', type: 'string', required: false },
        { key: 'appliedAt', label: 'Timestamp', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'search_jobs',
      name: 'Search Indeed Jobs',
      description: 'Search active job listings on Indeed by title, location, and salary filter.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Job Title or Search Query', type: 'string', required: true },
        { key: 'location', label: 'Location (City or State)', type: 'string', required: false },
        { key: 'radius', label: 'Radius (Miles)', type: 'number', required: false },
        { key: 'jobType', label: 'Job Type (fulltime, parttime, contract)', type: 'string', required: false },
        { key: 'salary', label: 'Min Salary Filter', type: 'number', required: false },
        { key: 'maxResults', label: 'Max Results (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobs', label: 'Array of Job Listings', type: 'json', required: true },
        { key: 'totalResults', label: 'Total Results Count', type: 'number', required: true },
      ],
    },
    {
      id: 'get_job_details',
      name: 'Get Job Details',
      description: 'Retrieve full job description, requirements, and benefits.',
      type: 'action',
      inputs: [
        { key: 'jobKey', label: 'Indeed Job Key or URL', type: 'string', required: true },
      ],
      outputs: [
        { key: 'title', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: true },
        { key: 'description', label: 'Description Text', type: 'string', required: true },
        { key: 'salary', label: 'Salary Info', type: 'string', required: false },
        { key: 'postedAt', label: 'Posted Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'get_company_jobs',
      name: 'Get Company Jobs',
      description: 'Retrieve all open postings for a specific company.',
      type: 'action',
      inputs: [
        { key: 'companyName', label: 'Company Name', type: 'string', required: true },
        { key: 'location', label: 'Location Filter', type: 'string', required: false },
        { key: 'maxResults', label: 'Max Results', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobs', label: 'Array of Postings', type: 'json', required: true },
      ],
    },
    {
      id: 'set_job_alert',
      name: 'Set Job Search Alert',
      description: 'Set up an automatic Indeed job alert.',
      type: 'action',
      inputs: [
        { key: 'query', label: 'Search Query', type: 'string', required: true },
        { key: 'location', label: 'Target Location', type: 'string', required: false },
        { key: 'frequency', label: 'Frequency (daily, weekly)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success', type: 'boolean', required: true },
        { key: 'alertId', label: 'Alert ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_saved_jobs',
      name: 'Get Saved Jobs',
      description: 'Retrieve user bookmarked jobs on Indeed.',
      type: 'action',
      inputs: [],
      outputs: [
        { key: 'jobs', label: 'Array of Bookmarked Jobs', type: 'json', required: true },
      ],
    },
    {
      id: 'post_job',
      name: 'Post Employer Job Listing',
      description: 'Create a new job posting on Indeed (Requires Employer API Access).',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company Name', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: true },
        { key: 'description', label: 'Job Description', type: 'string', required: true },
        { key: 'applyUrl', label: 'Apply Link', type: 'string', required: true },
      ],
      outputs: [
        { key: 'jobId', label: 'Created Job ID', type: 'string', required: true },
        { key: 'jobUrl', label: 'Public Job Link', type: 'string', required: true },
      ],
    },
    {
      id: 'update_job',
      name: 'Update Employer Job',
      description: 'Update fields of an active posting (Requires Employer API Access).',
      type: 'action',
      inputs: [
        { key: 'jobId', label: 'Job ID', type: 'string', required: true },
        { key: 'title', label: 'Updated Title', type: 'string', required: false },
        { key: 'description', label: 'Updated Description', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success', type: 'boolean', required: true },
      ],
    },
    {
      id: 'close_job',
      name: 'Close Job Listing',
      description: 'Remove/close an active job posting (Requires Employer API Access).',
      type: 'action',
      inputs: [
        { key: 'jobId', label: 'Job ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success', type: 'boolean', required: true },
      ],
    },
    {
      id: 'get_applications',
      name: 'Get Job Applications',
      description: 'Fetch candidate applications for a job posting (Requires Employer API Access).',
      type: 'action',
      inputs: [
        { key: 'jobId', label: 'Job ID', type: 'string', required: true },
        { key: 'status', label: 'Status Filter', type: 'string', required: false },
      ],
      outputs: [
        { key: 'applications', label: 'Array of Applications', type: 'json', required: true },
      ],
    },
  ],
};
