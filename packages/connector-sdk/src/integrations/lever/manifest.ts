import { ConnectorManifest } from '@automation/shared-types';

export const leverManifest: ConnectorManifest = {
  id: 'lever',
  name: 'Lever ATS',
  description: 'Manage candidate opportunities, interview scheduling, pipeline stages, and referrals in Lever ATS.',
  category: 'Jobs & Recruitment',
  icon: '/icons/lever.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'candidate_created',
      name: 'New Candidate Opportunity Created',
      description: 'Triggers when a candidate lead or referral is added in Lever.',
      type: 'trigger',
      inputs: [
        { key: 'postingId', label: 'Filter by Job Posting ID (Optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'opportunityId', label: 'Opportunity ID', type: 'string', required: true },
        { key: 'name', label: 'Candidate Full Name', type: 'string', required: true },
        { key: 'contactEmail', label: 'Contact Email', type: 'string', required: true },
        { key: 'headline', label: 'Candidate Headline', type: 'string', required: false },
        { key: 'origin', label: 'Lead Origin (agency, referral, applied)', type: 'string', required: true },
        { key: 'stage', label: 'Initial Pipeline Stage', type: 'string', required: true },
        { key: 'createdAt', label: 'Creation Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'interview_scheduled',
      name: 'Interview Scheduled',
      description: 'Triggers when an interview event is scheduled for a candidate.',
      type: 'trigger',
      inputs: [
        { key: 'opportunityId', label: 'Filter by Opportunity ID (Optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'interviewId', label: 'Interview ID', type: 'string', required: true },
        { key: 'candidateName', label: 'Candidate Name', type: 'string', required: true },
        { key: 'subject', label: 'Interview Title', type: 'string', required: true },
        { key: 'interviewers', label: 'Interviewers List', type: 'json', required: true },
        { key: 'scheduledAt', label: 'Scheduled Time', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'list_opportunities',
      name: 'List Candidate Opportunities',
      description: 'Fetch candidate opportunities in Lever by stage, tag, or posting ID.',
      type: 'action',
      inputs: [
        { key: 'postingId', label: 'Job Posting ID', type: 'string', required: false },
        { key: 'stageId', label: 'Pipeline Stage ID', type: 'string', required: false },
        { key: 'limit', label: 'Result Limit (Default: 10)', type: 'number', required: false },
      ],
      outputs: [
        { key: 'opportunities', label: 'Array of Candidate Opportunities', type: 'json', required: true },
        { key: 'total', label: 'Total Count', type: 'number', required: true },
      ],
    },
    {
      id: 'create_opportunity',
      name: 'Create Candidate Opportunity',
      description: 'Add a new candidate lead, applicant, or referral into Lever ATS.',
      type: 'action',
      inputs: [
        { key: 'name', label: 'Candidate Full Name', type: 'string', required: true },
        { key: 'email', label: 'Candidate Email', type: 'string', required: true },
        { key: 'headline', label: 'Headline / Current Role', type: 'string', required: false },
        { key: 'postingId', label: 'Target Job Posting ID', type: 'string', required: false },
        { key: 'phone', label: 'Phone Number', type: 'string', required: false },
        { key: 'resumeUrl', label: 'Resume File Link', type: 'string', required: false },
      ],
      outputs: [
        { key: 'opportunityId', label: 'Created Opportunity ID', type: 'string', required: true },
        { key: 'name', label: 'Candidate Name', type: 'string', required: true },
        { key: 'stage', label: 'Current Stage', type: 'string', required: true },
        { key: 'createdAt', label: 'Created Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'update_opportunity_stage',
      name: 'Update Opportunity Stage',
      description: 'Advance or move a candidate opportunity to a new pipeline stage.',
      type: 'action',
      inputs: [
        { key: 'opportunityId', label: 'Opportunity ID', type: 'string', required: true },
        { key: 'stageId', label: 'Target Stage ID (e.g. phone-screen, onsite)', type: 'string', required: true },
      ],
      outputs: [
        { key: 'opportunityId', label: 'Opportunity ID', type: 'string', required: true },
        { key: 'newStage', label: 'Updated Stage ID', type: 'string', required: true },
        { key: 'updatedAt', label: 'Updated Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'archive_opportunity',
      name: 'Archive Candidate Opportunity',
      description: 'Archive candidate opportunity with a specific rejection/archive reason.',
      type: 'action',
      inputs: [
        { key: 'opportunityId', label: 'Opportunity ID', type: 'string', required: true },
        { key: 'reasonId', label: 'Archive Reason ID', type: 'string', required: true },
      ],
      outputs: [
        { key: 'opportunityId', label: 'Opportunity ID', type: 'string', required: true },
        { key: 'archivedAt', label: 'Archived Timestamp', type: 'string', required: true },
        { key: 'reason', label: 'Archive Reason', type: 'string', required: true },
      ],
    },
  ],
};
