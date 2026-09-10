import { ConnectorManifest } from '@automation/shared-types';

export const linkedinManifest: ConnectorManifest = {
  id: 'linkedin',
  name: 'LinkedIn Jobs & Network',
  description: 'Search & post jobs, track applicants, search people, apply to Easy Apply roles, and post updates on LinkedIn.',
  category: 'Jobs & Recruitment',
  icon: '/icons/linkedin.svg',
  authType: 'oauth2',
  authConfig: {
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['r_liteprofile', 'w_member_social', 'r_organization_social', 'rw_organization_admin', 'r_compliance'],
  },
  triggers: [
    {
      id: 'new_job_match',
      name: 'New Job Search Match',
      description: 'Fires when new jobs matching saved search criteria appear on LinkedIn.',
      type: 'trigger',
      inputs: [
        { key: 'keywords', label: 'Search Keywords', type: 'string', required: true },
        { key: 'location', label: 'Location Filter', type: 'string', required: false },
      ],
      outputs: [
        { key: 'jobId', label: 'Job ID', type: 'string', required: true },
        { key: 'title', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company Name', type: 'string', required: true },
        { key: 'jobUrl', label: 'LinkedIn Job URL', type: 'string', required: true },
        { key: 'postedAt', label: 'Posted Date', type: 'string', required: true },
      ],
    },
    {
      id: 'new_connection_request',
      name: 'New Connection Request',
      description: 'Fires when someone sends you a connection request on LinkedIn.',
      type: 'trigger',
      inputs: [],
      outputs: [
        { key: 'senderName', label: 'Sender Name', type: 'string', required: true },
        { key: 'headline', label: 'Sender Headline', type: 'string', required: true },
        { key: 'profileUrl', label: 'Profile URL', type: 'string', required: true },
        { key: 'receivedAt', label: 'Received Time', type: 'string', required: true },
      ],
    },
    {
      id: 'new_message_received',
      name: 'New LinkedIn Message',
      description: 'Fires when a new LinkedIn message arrives in your inbox.',
      type: 'trigger',
      inputs: [],
      outputs: [
        { key: 'conversationId', label: 'Conversation ID', type: 'string', required: true },
        { key: 'senderName', label: 'Sender Name', type: 'string', required: true },
        { key: 'messageText', label: 'Message Body', type: 'string', required: true },
        { key: 'sentAt', label: 'Sent Time', type: 'string', required: true },
      ],
    },
    {
      id: 'profile_viewed',
      name: 'Profile Viewed Notification',
      description: 'Fires when someone views your LinkedIn profile.',
      type: 'trigger',
      inputs: [],
      outputs: [
        { key: 'viewerName', label: 'Viewer Name', type: 'string', required: true },
        { key: 'viewerHeadline', label: 'Viewer Headline', type: 'string', required: true },
        { key: 'viewerUrl', label: 'Viewer Profile Link', type: 'string', required: false },
        { key: 'viewedAt', label: 'Timestamp', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'search_jobs',
      name: 'Search LinkedIn Jobs',
      description: 'Search active LinkedIn job postings by keyword, location, and job type.',
      type: 'action',
      inputs: [
        { key: 'keywords', label: 'Keywords or Title', type: 'string', required: true },
        { key: 'location', label: 'Location (e.g. Remote, San Francisco)', type: 'string', required: false },
        { key: 'jobType', label: 'Job Type (remote, onsite, hybrid)', type: 'string', required: false },
        { key: 'experienceLevel', label: 'Experience Level (entry, mid, senior)', type: 'string', required: false },
        { key: 'maxResults', label: 'Max Results Limit (Default: 20)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'jobs', label: 'Array of Job Postings', type: 'json', required: true },
        { key: 'totalCount', label: 'Total Count', type: 'number', required: true },
      ],
    },
    {
      id: 'get_job_details',
      name: 'Get Job Details',
      description: 'Retrieve full description, requirements, salary, and applicant count for a job posting.',
      type: 'action',
      inputs: [
        { key: 'jobUrl', label: 'LinkedIn Job URL or ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'title', label: 'Job Title', type: 'string', required: true },
        { key: 'company', label: 'Company Name', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: true },
        { key: 'description', label: 'Full Job Description', type: 'string', required: true },
        { key: 'salary', label: 'Salary Range', type: 'string', required: false },
        { key: 'applicantCount', label: 'Applicant Count', type: 'number', required: false },
        { key: 'postedAt', label: 'Posted Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'apply_to_job',
      name: 'Apply to Easy Apply Job',
      description: 'Submit an application to a LinkedIn Easy Apply job posting.',
      type: 'action',
      inputs: [
        { key: 'jobUrl', label: 'LinkedIn Easy Apply Job URL', type: 'string', required: true },
        { key: 'resumeText', label: 'Resume Summary Text', type: 'string', required: false },
        { key: 'coverLetter', label: 'Cover Letter Text', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success (true/false)', type: 'boolean', required: true },
        { key: 'applicationId', label: 'Application ID', type: 'string', required: true },
        { key: 'message', label: 'Submission Message', type: 'string', required: true },
      ],
    },
    {
      id: 'search_people',
      name: 'Search Profiles & Network',
      description: 'Search LinkedIn profiles by keywords, company, and location.',
      type: 'action',
      inputs: [
        { key: 'keywords', label: 'Keywords or Skills', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: false },
        { key: 'company', label: 'Company Name', type: 'string', required: false },
        { key: 'maxResults', label: 'Max Results Limit', type: 'number', required: false },
      ],
      outputs: [
        { key: 'profiles', label: 'Array of Member Profiles', type: 'json', required: true },
        { key: 'count', label: 'Matching Count', type: 'number', required: true },
      ],
    },
    {
      id: 'get_profile',
      name: 'Get Member Profile',
      description: 'Read a public LinkedIn profile (headline, about, experience, education, skills).',
      type: 'action',
      inputs: [
        { key: 'profileUrl', label: 'LinkedIn Profile URL or Handle', type: 'string', required: true },
      ],
      outputs: [
        { key: 'name', label: 'Member Name', type: 'string', required: true },
        { key: 'headline', label: 'Professional Headline', type: 'string', required: true },
        { key: 'location', label: 'Location', type: 'string', required: false },
        { key: 'about', label: 'About Bio Text', type: 'string', required: false },
        { key: 'experience', label: 'Experience Array', type: 'json', required: false },
        { key: 'skills', label: 'Skills Array', type: 'json', required: false },
      ],
    },
    {
      id: 'send_connection_request',
      name: 'Send Connection Invite',
      description: 'Send a connection request to a LinkedIn member with an optional note.',
      type: 'action',
      inputs: [
        { key: 'profileUrl', label: 'Target Member Profile URL', type: 'string', required: true },
        { key: 'message', label: 'Personal Note (Max 300 chars)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success (true/false)', type: 'boolean', required: true },
        { key: 'status', label: 'Invite Status', type: 'string', required: true },
      ],
    },
    {
      id: 'send_message',
      name: 'Send LinkedIn Message',
      description: 'Send a direct message to a 1st-degree connection on LinkedIn.',
      type: 'action',
      inputs: [
        { key: 'profileUrl', label: 'Recipient Profile URL', type: 'string', required: true },
        { key: 'message', label: 'Message Body', type: 'string', required: true },
      ],
      outputs: [
        { key: 'success', label: 'Success (true/false)', type: 'boolean', required: true },
        { key: 'conversationId', label: 'Conversation ID', type: 'string', required: true },
      ],
    },
    {
      id: 'create_post',
      name: 'Create Post on Feed',
      description: 'Publish an update or job notice to your LinkedIn feed.',
      type: 'action',
      inputs: [
        { key: 'text', label: 'Post Content Text', type: 'string', required: true },
        { key: 'visibility', label: 'Visibility (public, connections)', type: 'string', required: false },
        { key: 'imageUrl', label: 'Image URL Attachment', type: 'string', required: false },
      ],
      outputs: [
        { key: 'success', label: 'Success', type: 'boolean', required: true },
        { key: 'postUrl', label: 'Published Post Link', type: 'string', required: true },
        { key: 'postId', label: 'Post ID', type: 'string', required: true },
      ],
    },
    {
      id: 'get_feed',
      name: 'Get Recent Feed Posts',
      description: 'Read recent LinkedIn feed posts from your network.',
      type: 'action',
      inputs: [
        { key: 'maxResults', label: 'Max Results (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'posts', label: 'Array of Feed Posts', type: 'json', required: true },
        { key: 'count', label: 'Post Count', type: 'number', required: true },
      ],
    },
  ],
};
