import { ConnectorManifest } from '@automation/shared-types';

export const DATA_VAULT_MANIFEST: ConnectorManifest = {
  id: 'data-vault',
  name: 'Data Vault & Storage SDK',
  description: 'Save workflow outputs (JSON, CSV datasets, TXT, HTML, PDF, Markdown) directly into persistent cloud-hosted database storage. Browse and 1-click download files anytime.',
  category: 'Databases & Storage',
  icon: '/icons/data-vault.svg',
  authType: 'none',

  actions: [
    {
      id: 'save_document',
      type: 'action',
      name: 'Save Document File',
      description: 'Save structured JSON, Markdown, HTML, or text content as a persistent vault file.',
      inputs: [
        { key: 'fileName', label: 'File Name', type: 'string', required: true, placeholder: 'e.g. Scraped_Summary.json' },
        {
          key: 'format',
          label: 'File Format',
          type: 'select',
          required: true,
          options: [
            { label: 'JSON Document (.json)', value: 'json' },
            { label: 'CSV Table (.csv)', value: 'csv' },
            { label: 'Plain Text (.txt)', value: 'txt' },
            { label: 'HTML Document (.html)', value: 'html' },
            { label: 'Markdown Document (.md)', value: 'markdown' },
          ],
        },
        { key: 'content', label: 'Document Content Payload', type: 'string', required: true, placeholder: 'e.g. {{nodes.step_2.output}}' },
      ],
      outputs: [
        { key: 'fileId', label: 'File ID', type: 'string', required: false },
        { key: 'fileName', label: 'Saved File Name', type: 'string', required: false },
        { key: 'downloadUrl', label: 'Browser Download URL', type: 'string', required: false },
        { key: 'sizeBytes', label: 'File Size in Bytes', type: 'number', required: false },
      ],
    },
    {
      id: 'append_csv_dataset',
      type: 'action',
      name: 'Append CSV Dataset Rows',
      description: 'Converts an array of objects or key-value rows from previous steps into a clean CSV dataset.',
      inputs: [
        { key: 'fileName', label: 'CSV File Name', type: 'string', required: true, placeholder: 'e.g. Daily_Scraped_Jobs.csv' },
        { key: 'headers', label: 'CSV Column Headers (Optional Comma-Separated)', type: 'string', required: false, placeholder: 'e.g. title, company, location, url' },
        { key: 'rowData', label: 'Row Data / Array Payload', type: 'string', required: true, placeholder: 'e.g. {{nodes.step_2.output.results}}' },
      ],
      outputs: [
        { key: 'fileId', label: 'Dataset File ID', type: 'string', required: false },
        { key: 'fileName', label: 'CSV File Name', type: 'string', required: false },
        { key: 'totalRows', label: 'Total Rows Saved', type: 'number', required: false },
        { key: 'downloadUrl', label: 'Browser Download URL', type: 'string', required: false },
      ],
    },
    {
      id: 'query_dataset',
      type: 'action',
      name: 'Query Saved Vault Files',
      description: 'Search and fetch records from previously saved Data Vault files.',
      inputs: [
        { key: 'searchQuery', label: 'File Name Search Filter', type: 'string', required: false, placeholder: 'e.g. React Jobs' },
        { key: 'format', label: 'Format Filter', type: 'string', required: false, placeholder: 'e.g. csv or json' },
      ],
      outputs: [
        { key: 'files', label: 'Matching Saved Files Array', type: 'array', required: false },
        { key: 'totalCount', label: 'Total Files Count', type: 'number', required: false },
      ],
    },
    {
      id: 'create_version_snapshot',
      type: 'action',
      name: 'Create Versioned Snapshot',
      description: 'Saves a timestamped version snapshot (e.g. v1.0, v1.1) of workflow output data.',
      inputs: [
        { key: 'fileName', label: 'Snapshot Base Name', type: 'string', required: true, placeholder: 'e.g. Executive_Report' },
        { key: 'version', label: 'Version Tag', type: 'string', required: true, placeholder: 'e.g. v1.0' },
        { key: 'content', label: 'Snapshot Content Data', type: 'string', required: true, placeholder: '{{nodes.step_3.output}}' },
      ],
      outputs: [
        { key: 'fileId', label: 'Snapshot File ID', type: 'string', required: false },
        { key: 'version', label: 'Version Tag', type: 'string', required: false },
        { key: 'downloadUrl', label: 'Browser Download URL', type: 'string', required: false },
      ],
    },
  ],

  triggers: [],
};
