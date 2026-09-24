import { ConnectorManifest } from '@automation/shared-types';

export const greenhouseManifest: ConnectorManifest = {
  id: 'greenhouse',
  name: 'Greenhouse ATS',
  description: 'Manage candidate applications, interview pipeline stages, notes, and job board sync in Greenhouse ATS.',
  category: 'Jobs & Recruitment',
  icon: '/icons/greenhouse.svg',
  authType: 'api_key',
  triggers: [
    {
      id: 'new_candidate_application',
      name: 'New Candidate Application',
      description: 'Triggers when a new candidate submits a job application in Greenhouse.',
      type: 'trigger',
      inputs: [
        { key: 'jobId', label: 'Filter by Job ID (Optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'applicationId', label: 'Application ID', type: 'number', required: true },
        { key: 'candidateId', label: 'Candidate ID', type: 'number', required: true },
        { key: 'firstName', label: 'First Name', type: 'string', required: true },
        { key: 'lastName', label: 'Last Name', type: 'string', required: true },
        { key: 'email', label: 'Email Address', type: 'string', required: true },
        { key: 'phone', label: 'Phone Number', type: 'string', required: false },
        { key: 'jobName', label: 'Target Job Position', type: 'string', required: true },
        { key: 'stage', label: 'Initial Application Stage', type: 'string', required: true },
        { key: 'appliedAt', label: 'Application Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'candidate_stage_changed',
      name: 'Candidate Stage Advanced',
      description: 'Triggers when a candidate is moved to a new interview stage.',
      type: 'trigger',
      inputs: [
        { key: 'jobId', label: 'Filter by Job ID (Optional)', type: 'string', required: false },
      ],
      outputs: [
        { key: 'applicationId', label: 'Application ID', type: 'number', required: true },
        { key: 'candidateId', label: 'Candidate ID', type: 'number', required: true },
        { key: 'oldStage', label: 'Previous Stage', type: 'string', required: true },
        { key: 'newStage', label: 'New Stage', type: 'string', required: true },
        { key: 'updatedAt', label: 'Stage Transition Timestamp', type: 'string', required: true },
      ],
    },
  ],
  actions: [
    {
      id: 'list_jobs',
      name: 'List Greenhouse Jobs',
      description: 'Fetch open job positions in Greenhouse ATS.',
      type: 'action',
            inputSchema: {
        type: 'object',
        properties: {
          status                : { type: 'string', title: 'Job Status (open, closed, draft)' },
          departmentId          : { type: 'string', title: 'Department ID' },
        },
      },
      inputs: [
        { key: 'status', label: 'Job Status (open, closed, draft)', type: 'string', required: false },
        { key: 'departmentId', label: 'Department ID', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          jobs                  : { type: 'object', title: 'Array of Greenhouse Jobs' },
          count                 : { type: 'number', title: 'Total Jobs Count' },
        },
      },
      outputs: [
        { key: 'jobs', label: 'Array of Greenhouse Jobs', type: 'json', required: true },
        { key: 'count', label: 'Total Jobs Count', type: 'number', required: true },
      ],
    },
    {
      id: 'get_candidate',
      name: 'Get Candidate Details',
      description: 'Retrieve candidate profile, application history, notes, and contact emails.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['candidateId'],
        properties: {
          candidateId           : { type: 'number', title: 'Greenhouse Candidate ID' },
        },
      },
      inputs: [
        { key: 'candidateId', label: 'Greenhouse Candidate ID', type: 'number', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          candidateId           : { type: 'number', title: 'Candidate ID' },
          firstName             : { type: 'string', title: 'First Name' },
          lastName              : { type: 'string', title: 'Last Name' },
          emails                : { type: 'object', title: 'Email Addresses List' },
          company               : { type: 'string', title: 'Current Company' },
          title                 : { type: 'string', title: 'Current Title' },
        },
      },
      outputs: [
        { key: 'candidateId', label: 'Candidate ID', type: 'number', required: true },
        { key: 'firstName', label: 'First Name', type: 'string', required: true },
        { key: 'lastName', label: 'Last Name', type: 'string', required: true },
        { key: 'emails', label: 'Email Addresses List', type: 'json', required: true },
        { key: 'company', label: 'Current Company', type: 'string', required: false },
        { key: 'title', label: 'Current Title', type: 'string', required: false },
      ],
    },
    {
      id: 'add_candidate_note',
      name: 'Add Candidate Note',
      description: 'Add interviewer or recruiter feedback note to a candidate in Greenhouse.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['candidateId', 'note'],
        properties: {
          candidateId           : { type: 'number', title: 'Candidate ID' },
          note                  : { type: 'string', title: 'Note Text / Feedback Content' },
          visibility            : { type: 'string', title: 'Visibility (public, private)' },
        },
      },
      inputs: [
        { key: 'candidateId', label: 'Candidate ID', type: 'number', required: true },
        { key: 'note', label: 'Note Text / Feedback Content', type: 'string', required: true },
        { key: 'visibility', label: 'Visibility (public, private)', type: 'string', required: false },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          noteId                : { type: 'number', title: 'Created Note ID' },
          candidateId           : { type: 'number', title: 'Candidate ID' },
          createdAt             : { type: 'string', title: 'Created Timestamp' },
        },
      },
      outputs: [
        { key: 'noteId', label: 'Created Note ID', type: 'number', required: true },
        { key: 'candidateId', label: 'Candidate ID', type: 'number', required: true },
        { key: 'createdAt', label: 'Created Timestamp', type: 'string', required: true },
      ],
    },
    {
      id: 'advance_candidate_stage',
      name: 'Advance Candidate Stage',
      description: 'Move candidate application to a specific interview stage.',
      type: 'action',
            inputSchema: {
        type: 'object',
        required: ['applicationId', 'stageId'],
        properties: {
          applicationId         : { type: 'number', title: 'Application ID' },
          stageId               : { type: 'number', title: 'Target Stage ID' },
        },
      },
      inputs: [
        { key: 'applicationId', label: 'Application ID', type: 'number', required: true },
        { key: 'stageId', label: 'Target Stage ID', type: 'number', required: true },
      ],
            outputSchema: {
        type: 'object',
        properties: {
          applicationId         : { type: 'number', title: 'Application ID' },
          currentStage          : { type: 'string', title: 'New Current Stage' },
          status                : { type: 'string', title: 'Update Status' },
        },
      },
      outputs: [
        { key: 'applicationId', label: 'Application ID', type: 'number', required: true },
        { key: 'currentStage', label: 'New Current Stage', type: 'string', required: true },
        { key: 'status', label: 'Update Status', type: 'string', required: true },
      ],
    },
  ],
};
