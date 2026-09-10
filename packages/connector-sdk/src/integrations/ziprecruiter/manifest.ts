import { ConnectorManifest } from '@automation/shared-types';

export const ziprecruiterManifest: ConnectorManifest = {
  id: 'ziprecruiter',
  name: 'ZipRecruiter',
  description: 'Distribute job openings across ZipRecruiter partner network, search resumes & candidates.',
  category: 'Jobs & Recruitment',
  icon: '/icons/ziprecruiter.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_candidate_lead',
      name: 'New Candidate Lead',
      description: 'Triggers when a candidate applies or submits a resume to a job posting.',
      type: 'trigger',
      inputs: [
        { key: 'jobId', label: 'ZipRecruiter Job ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'candidateId', label: 'Candidate ID', type: 'string', required: true },
        { key: 'name', label: 'Candidate Name', type: 'string', required: true },
        { key: 'email', label: 'Candidate Email', type: 'string', required: true },
        { key: 'phone', label: 'Phone Number', type: 'string', required: false },
        { key: 'resumeUrl', label: 'Resume File Link', type: 'string', required: false },
        { key: 'appliedAt', label: 'Applied Timestamp', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'search_jobs',
      name: 'Search ZipRecruiter Jobs',
      description: 'Query ZipRecruiter marketplace jobs by keyword, location, and radius.',
      type: 'action',
      inputs: [
        { key: 'search', label: 'Search Keyword / Job Title', type: 'string', required: true },
        { key: 'location', label: 'Location (City or Zip)', type: 'string', required: false },
        { key: 'radiusMiles', label: 'Radius (Miles)', type: 'number', required: false },
        { key: 'daysAgo', label: 'Posted Within Days (Default: 30)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobs', label: 'Array of ZipRecruiter Jobs', type: 'json', required: true },
        { key: 'totalJobs', label: 'Total Jobs Count', type: 'number', required: true },
      ],
    },
    {
      id: 'post_job',
      name: 'Post Job to Network',
      description: 'Distribute job opening across ZipRecruiter partner job boards.',
      type: 'action',
      inputs: [
        { key: 'title', label: 'Job Title', type: 'string', required: true },
        { key: 'location', label: 'Job Location', type: 'string', required: true },
        { key: 'description', label: 'Full Description', type: 'string', required: true },
        { key: 'employmentType', label: 'Employment Type (full_time, part_time, contract)', type: 'string', required: true },
        { key: 'category', label: 'Industry Category', type: 'string', required: false },
      ],
      outputs: [
        { key: 'jobId', label: 'ZipRecruiter Job ID', type: 'string', required: true },
        { key: 'status', label: 'Distribution Status', type: 'string', required: true },
        { key: 'postingUrl', label: 'Public Job Posting URL', type: 'string', required: true },
      ],
    },
    {
      id: 'search_candidates',
      name: 'Search Resume Database',
      description: 'Search ZipRecruiter candidate database by skills, experience, and location.',
      type: 'action',
      inputs: [
        { key: 'skills', label: 'Required Skills (e.g. React, Node.js)', type: 'string', required: true },
        { key: 'location', label: 'Target Location', type: 'string', required: false },
        { key: 'experienceYears', label: 'Min Experience Years', type: 'number', required: false },
        { key: 'limit', label: 'Max Results Limit (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'candidates', label: 'Array of Candidate Profiles', type: 'json', required: true },
        { key: 'count', label: 'Candidate Count', type: 'number', required: true },
      ],
    },
  ],
};
