'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, Lock, Copy, Check, ChevronDown, ShieldCheck, Play, Sparkles, Loader2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Node } from 'reactflow';
import { useUserRole } from '@/context/UserRoleContext';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export const CONNECTOR_MANIFESTS: Record<string, {
  name: string;
  operations: Array<{
    id: string;
    label: string;
    type: 'trigger' | 'action';
    fields: Array<{
      id: string;
      label: string;
      type: 'input' | 'textarea' | 'select';
      placeholder?: string;
      options?: Array<{ value: string; label: string }>;
      defaultValue?: string;
    }>;
  }>;
}> = {
  gmail: {
    name: 'Gmail',
    operations: [
      {
        id: 'send_email',
        label: 'Send Email Notification / Auto-Reply',
        type: 'action',
        fields: [
          { id: 'recipient', label: 'To (Recipient Email)', type: 'input', placeholder: 'e.g. {{nodes.node_trigger.output.sender}}' },
          { id: 'subject', label: 'Email Subject', type: 'input', placeholder: 'e.g. Auto-Reply / Summary: {{nodes.node_trigger.output.subject}}' },
          { id: 'body', label: 'Email Body Content / Auto-Reply Message', type: 'textarea', placeholder: 'e.g. Thank you for reaching out! AI Summary: {{nodes.node_ai.output.result}}' },
        ],
      },
      {
        id: 'new_email',
        label: 'New Incoming Email Trigger',
        type: 'trigger',
        fields: [
          {
            id: 'mailboxLabel',
            label: 'Mailbox Label / Folder',
            type: 'select',
            options: [
              { value: 'INBOX', label: 'INBOX' },
              { value: 'IMPORTANT', label: 'IMPORTANT' },
              { value: 'STARRED', label: 'STARRED' },
              { value: 'SPAM', label: 'SPAM' },
            ],
            defaultValue: 'INBOX',
          },
          { id: 'searchFilter', label: 'Search Query Filter', type: 'input', placeholder: 'e.g. is:unread from:leads@company.com' },
        ],
      },
    ],
  },

  slack: {
    name: 'Slack',
    operations: [
      {
        id: 'send_message',
        label: 'Post Channel Message',
        type: 'action',
        fields: [
          { id: 'channel', label: 'Slack Channel Name or ID', type: 'input', placeholder: 'e.g. #general or #leads' },
          { id: 'text', label: 'Message Payload Text', type: 'textarea', placeholder: 'e.g. New lead summary: {{nodes.node_ai.output.result}}' },
        ],
      },
      {
        id: 'new_message',
        label: 'New Channel Message Trigger',
        type: 'trigger',
        fields: [
          { id: 'channel', label: 'Channel to Watch', type: 'input', placeholder: 'e.g. #customer-support' },
        ],
      },
    ],
  },

  'google-sheets': {
    name: 'Google Sheets',
    operations: [
      {
        id: 'append_row',
        label: 'Append Row to Spreadsheet',
        type: 'action',
        fields: [
          { id: 'spreadsheetId', label: 'Spreadsheet ID / Name', type: 'input', placeholder: 'e.g. Leads_Tracker_2026' },
          { id: 'worksheetName', label: 'Worksheet Name', type: 'input', placeholder: 'e.g. Sheet1' },
          { id: 'rowData', label: 'Row Values (Comma or JSON)', type: 'textarea', placeholder: 'e.g. {{nodes.node_trigger.output.sender}}, {{nodes.node_ai.output.result}}' },
        ],
      },
      {
        id: 'new_row',
        label: 'New Row Added Trigger',
        type: 'trigger',
        fields: [
          { id: 'spreadsheetId', label: 'Spreadsheet ID to Watch', type: 'input', placeholder: 'e.g. Incoming_Responses' },
        ],
      },
    ],
  },

  'ai-agent': {
    name: 'AI Processor Node',
    operations: [
      {
        id: 'process_text',
        label: 'Summarize, Auto-Reply & Extract Text with AI',
        type: 'action',
        fields: [
          { id: 'prompt', label: 'AI System Prompt / Instruction', type: 'textarea', placeholder: 'e.g. Summarize the incoming email details into 3 bullet points, or generate a professional polite auto-reply.' },
          { id: 'inputText', label: 'Input Text Variable', type: 'input', placeholder: 'e.g. {{nodes.node_trigger.output.body}}' },
        ],
      },
    ],
  },

  whatsapp: {
    name: 'WhatsApp Business',
    operations: [
      {
        id: 'send_message',
        label: 'Send WhatsApp Text Message',
        type: 'action',
        fields: [
          { id: 'recipient', label: 'Recipient Phone Number', type: 'input', placeholder: 'e.g. +1234567890' },
          { id: 'message', label: 'Message Content', type: 'textarea', placeholder: 'e.g. Hi! Here is your alert: {{nodes.node_ai.output.result}}' },
        ],
      },
      {
        id: 'new_message',
        label: 'Inbound WhatsApp Message Trigger',
        type: 'trigger',
        fields: [
          { id: 'keyword', label: 'Trigger Keyword (Optional)', type: 'input', placeholder: 'e.g. HELP or LEAD' },
        ],
      },
    ],
  },

  'web-search': {
    name: 'Web Search & Scraper',
    operations: [
      {
        id: 'search_web',
        label: 'Search Google / Tavily & Scrape Web Pages',
        type: 'action',
        fields: [
          { id: 'query', label: 'Search Query Keyword', type: 'input', placeholder: 'e.g. UK Data Engineer jobs in London' },
        ],
      },
    ],
  },

  notion: {
    name: 'Notion Workspace',
    operations: [
      {
        id: 'create_page',
        label: 'Create Database Page Record',
        type: 'action',
        fields: [
          { id: 'databaseId', label: 'Notion Database ID', type: 'input', placeholder: 'e.g. database_9981' },
          { id: 'title', label: 'Page Title & Content', type: 'textarea', placeholder: 'e.g. Lead: {{nodes.node_ai.output.result}}' },
        ],
      },
    ],
  },

  stripe: {
    name: 'Stripe Payments',
    operations: [
      {
        id: 'payment_succeeded',
        label: 'Payment Checkout Succeeded Trigger',
        type: 'trigger',
        fields: [
          { id: 'eventFilter', label: 'Webhook Event Filter', type: 'input', placeholder: 'charge.succeeded' },
        ],
      },
      {
        id: 'create_customer',
        label: 'Create Stripe Customer Record',
        type: 'action',
        fields: [
          { id: 'email', label: 'Customer Email', type: 'input', placeholder: 'e.g. {{nodes.node_trigger.output.email}}' },
          { id: 'name', label: 'Customer Name', type: 'input', placeholder: 'e.g. {{nodes.node_trigger.output.name}}' },
        ],
      },
    ],
  },

  'http-request': {
    name: 'HTTP Webhook / REST API',
    operations: [
      {
        id: 'custom_api_call',
        label: 'Custom HTTP REST API Call',
        type: 'action',
        fields: [
          {
            id: 'method',
            label: 'HTTP Method',
            type: 'select',
            options: [
              { value: 'POST', label: 'POST' },
              { value: 'GET', label: 'GET' },
              { value: 'PUT', label: 'PUT' },
              { value: 'DELETE', label: 'DELETE' },
            ],
            defaultValue: 'POST',
          },
          { id: 'url', label: 'Endpoint URL', type: 'input', placeholder: 'https://api.example.com/webhook' },
          { id: 'headers', label: 'Request Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type": "application/json"}' },
          { id: 'body', label: 'Request Body Payload', type: 'textarea', placeholder: '{"data": "{{nodes.node_ai.output.result}}"}' },
        ],
      },
    ],
  },

  'autoflow-condition': {
    name: 'If / Else Logic Condition',
    operations: [
      {
        id: 'if_else',
        label: 'If / Else Rule Evaluation',
        type: 'action',
        fields: [
          { id: 'leftValue', label: 'Value to Test (Dynamic Variable token)', type: 'input', placeholder: 'e.g. {{nodes.node_2.output.title}}' },
          {
            id: 'operator',
            label: 'Comparison Operator',
            type: 'select',
            options: [
              { value: 'contains', label: 'Contains text' },
              { value: 'equals', label: 'Equals (==)' },
              { value: 'not_equals', label: 'Not Equals (!=)' },
              { value: 'greater_than', label: 'Greater Than (>)' },
              { value: 'less_than', label: 'Less Than (<)' },
              { value: 'is_empty', label: 'Is Empty / Null' },
              { value: 'is_not_empty', label: 'Is Not Empty' },
            ],
            defaultValue: 'contains',
          },
          { id: 'rightValue', label: 'Comparison Target Value', type: 'input', placeholder: 'e.g. React or Senior' },
        ],
      },
      {
        id: 'filter',
        label: 'Filter Array Items',
        type: 'action',
        fields: [
          { id: 'arrayData', label: 'Input Array Data', type: 'input', placeholder: 'e.g. {{nodes.node_2.output.results}}' },
          { id: 'matchValue', label: 'Match Keyword', type: 'input', placeholder: 'e.g. Remote' },
        ],
      },
    ],
  },
  'amazon-flipkart': {
    name: 'Amazon & Flipkart E-Commerce',
    operations: [
      {
        id: 'search_products',
        label: 'Search Product Deals & Prices',
        type: 'action',
        fields: [
          { id: 'keyword', label: 'Product Name / Keyword Search', type: 'input', placeholder: 'e.g. Wireless Headphones or MacBooks' },
          {
            id: 'platform',
            label: 'Target E-Commerce Store',
            type: 'select',
            options: [
              { value: 'Both', label: 'Amazon & Flipkart Both' },
              { value: 'Amazon', label: 'Amazon Store Only' },
              { value: 'Flipkart', label: 'Flipkart Store Only' },
            ],
            defaultValue: 'Both',
          },
        ],
      },
      {
        id: 'track_product_price',
        label: 'Track Product Price & Discounts',
        type: 'action',
        fields: [
          { id: 'productUrl', label: 'Amazon or Flipkart Product URL', type: 'input', placeholder: 'https://www.amazon.in/dp/... or https://www.flipkart.com/...' },
        ],
      },
    ],
  },
  firebase: {
    name: 'Firebase Firestore',
    operations: [
      {
        id: 'store_doc',
        label: 'Store Document in Firestore Collection',
        type: 'action',
        fields: [
          { id: 'collection', label: 'Collection Name', type: 'input', placeholder: 'e.g. users, leads, orders' },
          { id: 'documentId', label: 'Document ID (Optional)', type: 'input', placeholder: 'e.g. doc_123 or leave blank for auto-ID' },
          { id: 'data', label: 'Document Payload (JSON)', type: 'textarea', placeholder: '{"name": "{{nodes.node_1.output.name}}", "email": "{{nodes.node_1.output.email}}"}' },
        ],
      },
      {
        id: 'get_doc',
        label: 'Fetch Document by ID',
        type: 'action',
        fields: [
          { id: 'collection', label: 'Collection Name', type: 'input', placeholder: 'e.g. users' },
          { id: 'documentId', label: 'Document ID', type: 'input', placeholder: 'e.g. doc_123' },
        ],
      },
    ],
  },
  mongodb: {
    name: 'MongoDB Atlas',
    operations: [
      {
        id: 'insert_doc',
        label: 'Insert JSON Document into Collection',
        type: 'action',
        fields: [
          { id: 'database', label: 'Database Name', type: 'input', placeholder: 'e.g. automation_platform' },
          { id: 'collection', label: 'Collection Name', type: 'input', placeholder: 'e.g. leads_log' },
          { id: 'document', label: 'Document Object Payload (JSON)', type: 'textarea', placeholder: '{"title": "{{nodes.node_1.output.title}}", "summary": "{{nodes.node_2.output.result}}"}' },
        ],
      },
      {
        id: 'query_docs',
        label: 'Query Documents Filter',
        type: 'action',
        fields: [
          { id: 'database', label: 'Database Name', type: 'input', placeholder: 'e.g. automation_platform' },
          { id: 'collection', label: 'Collection Name', type: 'input', placeholder: 'e.g. leads_log' },
          { id: 'filter', label: 'MongoDB Filter Query (JSON)', type: 'textarea', placeholder: '{"status": "active"}' },
        ],
      },
    ],
  },
  postgresql: {
    name: 'PostgreSQL Database',
    operations: [
      {
        id: 'execute_query',
        label: 'Execute SQL Command / Query',
        type: 'action',
        fields: [
          { id: 'sql', label: 'PostgreSQL SQL Query', type: 'textarea', placeholder: 'INSERT INTO leads (name, email) VALUES (\'{{nodes.node_1.output.name}}\', \'{{nodes.node_1.output.email}}\');' },
        ],
      },
    ],
  },
  mysql: {
    name: 'MySQL Database',
    operations: [
      {
        id: 'execute_query',
        label: 'Execute MySQL Query',
        type: 'action',
        fields: [
          { id: 'sql', label: 'MySQL SQL Statement', type: 'textarea', placeholder: 'SELECT * FROM users WHERE status = \'active\';' },
        ],
      },
    ],
  },
  redis: {
    name: 'Redis Cache & Store',
    operations: [
      {
        id: 'set_key',
        label: 'Set Key Value Pair',
        type: 'action',
        fields: [
          { id: 'key', label: 'Redis Key', type: 'input', placeholder: 'e.g. cache:user_session' },
          { id: 'value', label: 'Value Content', type: 'textarea', placeholder: 'e.g. {{nodes.node_1.output.result}}' },
        ],
      },
    ],
  },
  supabase: {
    name: 'Supabase Database',
    operations: [
      {
        id: 'insert_row',
        label: 'Insert Row into Supabase Table',
        type: 'action',
        fields: [
          { id: 'tableName', label: 'Table Name', type: 'input', placeholder: 'e.g. profiles' },
          { id: 'rowValues', label: 'Row Data (JSON)', type: 'textarea', placeholder: '{"full_name": "{{nodes.node_1.output.name}}"}' },
        ],
      },
    ],
  },
  'aws-s3': {
    name: 'AWS S3 Storage',
    operations: [
      {
        id: 'upload_file',
        label: 'Upload File to S3 Bucket',
        type: 'action',
        fields: [
          { id: 'bucketName', label: 'Target Bucket Name', type: 'input', placeholder: 'e.g. my-app-backups' },
          { id: 'fileName', label: 'S3 Key / File Path', type: 'input', placeholder: 'e.g. reports/summary.json' },
          { id: 'content', label: 'File Payload Content', type: 'textarea', placeholder: 'e.g. {{nodes.node_ai.output.result}}' },
        ],
      },
    ],
  },
  twilio: {
    name: 'Twilio SMS',
    operations: [
      {
        id: 'send_sms',
        label: 'Send SMS Message Notification',
        type: 'action',
        fields: [
          { id: 'to', label: 'Recipient Phone Number (+E.164)', type: 'input', placeholder: 'e.g. +1234567890' },
          { id: 'body', label: 'SMS Body Text', type: 'textarea', placeholder: 'e.g. Alert: {{nodes.node_1.output.summary}}' },
        ],
      },
    ],
  },
  razorpay: {
    name: 'Razorpay Payments',
    operations: [
      {
        id: 'create_order',
        label: 'Create Payment Order',
        type: 'action',
        fields: [
          { id: 'amount', label: 'Amount in Paise (e.g. 50000 = ₹500)', type: 'input', placeholder: '50000' },
          { id: 'receipt', label: 'Receipt ID Reference', type: 'input', placeholder: 'receipt_order_101' },
        ],
      },
    ],
  },
  shopify: {
    name: 'Shopify Store',
    operations: [
      {
        id: 'get_products',
        label: 'Search Store Products & Inventory',
        type: 'action',
        fields: [
          { id: 'query', label: 'Product Title Search Query', type: 'input', placeholder: 'e.g. T-Shirt' },
        ],
      },
    ],
  },
  github: {
    name: 'GitHub Repository',
    operations: [
      {
        id: 'get_commits',
        label: 'Fetch Commits & Pull Requests',
        type: 'action',
        fields: [
          { id: 'repo', label: 'Repository Owner / Name', type: 'input', placeholder: 'e.g. octocat/Hello-World' },
          { id: 'branch', label: 'Branch Name', type: 'input', placeholder: 'main' },
        ],
      },
    ],
  },
  openai: {
    name: 'OpenAI GPT-4o',
    operations: [
      {
        id: 'chat_completion',
        label: 'GPT-4o Text & Summary Generation',
        type: 'action',
        fields: [
          { id: 'prompt', label: 'AI System Prompt / User Prompt', type: 'textarea', placeholder: 'e.g. Summarize the following data into 3 key takeaways:' },
          { id: 'inputText', label: 'Input Context Text', type: 'input', placeholder: 'e.g. {{nodes.node_1.output.text}}' },
        ],
      },
    ],
  },
  anthropic: {
    name: 'Anthropic Claude 3.5',
    operations: [
      {
        id: 'claude_generate',
        label: 'Claude 3.5 Sonnet Analysis',
        type: 'action',
        fields: [
          { id: 'prompt', label: 'Claude Prompt Instruction', type: 'textarea', placeholder: 'Analyze and summarize text:' },
        ],
      },
    ],
  },
  gemini: {
    name: 'Google Gemini 3.6',
    operations: [
      {
        id: 'gemini_generate',
        label: 'Gemini 3.6 Flash Generation',
        type: 'action',
        fields: [
          { id: 'prompt', label: 'System Instruction / Prompt', type: 'textarea', placeholder: 'Generate summary digest:' },
        ],
      },
    ],
  },
  groq: {
    name: 'Groq Llama 3',
    operations: [
      {
        id: 'groq_completion',
        label: 'Ultra-Fast Llama 3 Inference',
        type: 'action',
        fields: [
          { id: 'prompt', label: 'Prompt Payload', type: 'textarea', placeholder: 'Fast summary:' },
        ],
      },
    ],
  },
  'autoflow-schedule': {
    name: 'AutoFlow Schedule Trigger',
    operations: [
      {
        id: 'schedule_time',
        label: 'Time Interval (Daily/Weekly/Target Time)',
        type: 'trigger',
        fields: [
          {
            id: 'frequency',
            label: 'Trigger Schedule Frequency',
            type: 'select',
            options: [
              { value: 'hourly', label: 'Every 1 Hour (60 mins)' },
              { value: 'daily', label: 'Daily at Specified Time' },
              { value: 'weekly', label: 'Weekly on Target Day' },
              { value: 'interval', label: 'Custom Minutes Interval' },
            ],
            defaultValue: 'hourly',
          },
        ],
      },
      {
        id: 'inbound_webhook',
        label: 'Instant Webhook Endpoint',
        type: 'trigger',
        fields: [],
      },
    ],
  },
};

function normalizeConnectorId(rawId?: string): string {
  if (!rawId) return 'autoflow-schedule';
  const lower = rawId.toLowerCase();
  if (lower.includes('amazon') || lower.includes('flipkart') || lower.includes('shopping')) return 'amazon-flipkart';
  if (lower.includes('condition') || lower.includes('if_else') || lower.includes('logic')) return 'autoflow-condition';
  if (lower.includes('sheet')) return 'google-sheets';
  if (lower.includes('search') || lower.includes('web')) return 'web-search';
  if (lower.includes('ai') || lower.includes('analys')) return 'ai-agent';
  if (lower.includes('gmail') || lower.includes('mail')) return 'gmail';
  if (lower.includes('slack')) return 'slack';
  if (lower.includes('schedule') || lower.includes('time')) return 'autoflow-schedule';
  return rawId;
}

export function FieldMapper({
  selectedNode,
  onChangeApp,
  onUpdateNodeData,
}: {
  selectedNode?: Node | null;
  onChangeApp?: () => void;
  onUpdateNodeData?: (nodeId: string, updatedData: Partial<any>) => void;
}) {
  const { user } = useUserRole();
  const [activeTab, setActiveTab] = useState<'setup' | 'configure' | 'test'>('setup');
  const [selectedOperationId, setSelectedOperationId] = useState<string>('');
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const [userConnections, setUserConnections] = useState<any[]>([]);
  const [isCheckingConn, setIsCheckingConn] = useState(false);
  const [inlineKey, setInlineKey] = useState('');
  const [isConnectingInline, setIsConnectingInline] = useState(false);

  const currentConnectorId = selectedNode?.data ? normalizeConnectorId(selectedNode.data.connectorId) : 'autoflow-schedule';

  const fetchUserConnections = async () => {
    try {
      setIsCheckingConn(true);
      const res = await apiClient.get('/v1/connectors/connections');
      if (res.data?.data) {
        setUserConnections(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching connections:', err);
    } finally {
      setIsCheckingConn(false);
    }
  };

  useEffect(() => {
    fetchUserConnections();
  }, [currentConnectorId]);

  // Schedule Trigger Modes & Fields
  const [scheduleMode, setScheduleMode] = useState<'hourly' | 'daily' | 'interval' | 'weekly' | 'date' | 'cron' | 'webhook'>('daily');
  const [dailyTime, setDailyTime] = useState('09:00');
  const [webhookCopied, setWebhookCopied] = useState(false);

  // Sync state when selectedNode changes
  useEffect(() => {
    if (selectedNode?.data) {
      const data = selectedNode.data;
      const connId = normalizeConnectorId(data.connectorId);
      const manifest = CONNECTOR_MANIFESTS[connId] || CONNECTOR_MANIFESTS['autoflow-schedule'];

      const initialOpId = data.operationId || manifest.operations[0]?.id || '';
      setSelectedOperationId(initialOpId);

      const existingConfig = data.config || {};
      const existingMapping = data.fieldMapping || {};
      const combined = { ...existingConfig, ...existingMapping };

      // Normalize field aliases for UI input fields
      if (combined.worksheetName && !combined.worksheet) combined.worksheet = combined.worksheetName;
      if (combined.worksheet && !combined.worksheetName) combined.worksheetName = combined.worksheet;
      if (combined.values && !combined.rowData) combined.rowData = typeof combined.values === 'string' ? combined.values : JSON.stringify(combined.values);
      if (combined.rowData && !combined.values) combined.values = combined.rowData;

      setConfigValues(combined);

      if (data.config?.time) {
        setDailyTime(data.config.time);
      }

      if (existingConfig.frequency) {
        setScheduleMode(existingConfig.frequency as any);
      } else if (existingConfig.intervalHours) {
        setScheduleMode('hourly');
      } else if (existingConfig.intervalMinutes) {
        setScheduleMode('interval');
      } else if (existingConfig.dayOfWeek) {
        setScheduleMode('weekly');
      } else if (existingConfig.targetDate) {
        setScheduleMode('date');
      } else if (existingConfig.webhookUrl) {
        setScheduleMode('webhook');
      }
    }
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div className="w-96 border-l border-borderColor bg-bgSecondary flex flex-col p-6 justify-center items-center text-center">
        <Sliders className="text-textMuted mb-3" size={28} />
        <Heading as="h4" className="mb-1">Select a Workflow Step</Heading>
        <Text variant="muted">Click any step card in the vertical flow to setup app, event, account, and dynamic field parameters.</Text>
      </div>
    );
  }

  const { data } = selectedNode;
  const connectorId = normalizeConnectorId(data.connectorId);
  const isScheduleNode = connectorId === 'autoflow-schedule';
  const manifest = CONNECTOR_MANIFESTS[connectorId] || CONNECTOR_MANIFESTS['autoflow-schedule'];

  const handleConnectInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineKey.trim()) return;

    setIsConnectingInline(true);
    try {
      await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId,
        name: `${manifest.name} (Verified via Canvas)`,
        apiKey: inlineKey.trim(),
      });
      toast.success(`${manifest.name} Account Verified & Connected!`, {
        description: 'Credentials encrypted via AES-256 in MongoDB Atlas.',
      });
      if (onUpdateNodeData) {
        onUpdateNodeData(selectedNode.id, { isConnected: true });
      }
      setInlineKey('');
      await fetchUserConnections();
    } catch (err: any) {
      toast.error('Connection Verification Failed', {
        description: err?.response?.data?.message || 'Invalid API key or credentials format.',
      });
    } finally {
      setIsConnectingInline(false);
    }
  };

  const isSystemNode = connectorId === 'autoflow-schedule' || connectorId === 'ai-agent' || connectorId === 'web-search' || connectorId === 'autoflow-condition' || connectorId === 'http-request';
  const activeConnection = userConnections.find((c) => c.connectorId === connectorId || c.connectorId === (connectorId === 'gmail-read' ? 'gmail' : connectorId));
  const isAccountConnected = isSystemNode || Boolean(activeConnection);

  const currentOperation =
    manifest.operations.find((op) => op.id === selectedOperationId) || manifest.operations[0];

  const handleOperationChange = (opId: string) => {
    setSelectedOperationId(opId);
    const newOp = manifest.operations.find((op) => op.id === opId);
    const defaultConfigs: Record<string, string> = {};
    if (newOp) {
      newOp.fields.forEach((f) => {
        if (f.defaultValue) defaultConfigs[f.id] = f.defaultValue;
      });
    }
    setConfigValues(defaultConfigs);

    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, {
        operationId: opId,
        config: defaultConfigs,
        label: `${manifest.name} ${newOp?.label || ''}`.trim(),
      });
    }
    toast.success('Event Updated', { description: `Set action/event to ${newOp?.label || opId}` });
  };

  const handleFieldChange = (fieldId: string, val: string) => {
    const updated = { ...configValues, [fieldId]: val };
    setConfigValues(updated);

    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, { config: updated });
    }
  };

  const handleScheduleIntervalChange = (mins: string) => {
    const updated = {
      ...configValues,
      intervalMinutes: mins,
      frequency: 'interval',
    };
    setConfigValues(updated);

    const labelText = `Schedule Trigger (Every ${mins} mins)`;
    if (onUpdateNodeData) {
      onUpdateNodeData(selectedNode.id, {
        config: updated,
        label: labelText,
        name: labelText,
      });
    }
    toast.success('Schedule Interval Updated', {
      description: `Workflow configured to trigger automatically every ${mins} minutes.`,
    });
  };

function getDynamicWizardTabs(manifest: any) {
  if (manifest?.wizardMetadata) {
    return [
      { id: 'setup', label: manifest.wizardMetadata.step1.label, subtitle: manifest.wizardMetadata.step1.subtitle },
      { id: 'configure', label: manifest.wizardMetadata.step2.label, subtitle: manifest.wizardMetadata.step2.subtitle },
      { id: 'test', label: manifest.wizardMetadata.step3.label, subtitle: manifest.wizardMetadata.step3.subtitle },
    ];
  }

  const category = (manifest?.category || '').toLowerCase();
  const id = (manifest?.id || '').toLowerCase();

  if (category.includes('ai') || ['openai', 'anthropic', 'gemini', 'groq', 'huggingface', 'elevenlabs', 'ai-agent'].includes(id)) {
    return [
      { id: 'setup', label: '1. API Key & Auth', subtitle: 'Credentials & Portal Link' },
      { id: 'configure', label: '2. Model & Prompts', subtitle: 'Model & System Instruction' },
      { id: 'test', label: '3. Live Prompt Ping', subtitle: 'Test Sample AI Output' },
    ];
  }

  if (category.includes('database') || category.includes('storage') || ['mongodb', 'postgresql', 'mysql', 'redis', 'supabase', 'firebase', 'aws-s3', 'bigquery'].includes(id)) {
    return [
      { id: 'setup', label: '1. Connection Credentials', subtitle: 'Host, Port & Auth Keys' },
      { id: 'configure', label: '2. Database & Schema', subtitle: 'Target DB, Table & Query' },
      { id: 'test', label: '3. Ping & Query Test', subtitle: 'Live DB Driver Connectivity' },
    ];
  }

  if (category.includes('messaging') || category.includes('communication') || ['slack', 'discord', 'telegram', 'whatsapp', 'twilio', 'zoom'].includes(id)) {
    return [
      { id: 'setup', label: '1. Bot & Webhook Auth', subtitle: 'Bot Token & Account SID' },
      { id: 'configure', label: '2. Channel & Target', subtitle: 'Channel ID & Phone Number' },
      { id: 'test', label: '3. Send Test Message', subtitle: 'Dispatch Sample Message' },
    ];
  }

  if (category.includes('developer') || category.includes('crm') || ['github', 'gitlab', 'jira', 'linear', 'hubspot', 'salesforce', 'clickup', 'trello'].includes(id)) {
    return [
      { id: 'setup', label: '1. Token & Org Scope', subtitle: 'Personal Access Token' },
      { id: 'configure', label: '2. Repo & Workspace', subtitle: 'Repository Name & Branch' },
      { id: 'test', label: '3. Scope & API Test', subtitle: 'Fetch User Repositories' },
    ];
  }

  if (category.includes('jobs') || category.includes('recruitment') || ['linkedin', 'indeed', 'ziprecruiter', 'glassdoor', 'greenhouse', 'lever'].includes(id)) {
    return [
      { id: 'setup', label: '1. OAuth & Account', subtitle: 'LinkedIn / Portal Credentials' },
      { id: 'configure', label: '2. Job & Search Setup', subtitle: 'Keywords, Location & Job ID' },
      { id: 'test', label: '3. Test Job Query', subtitle: 'Verify Job Portal API Connection' },
    ];
  }

  if (category.includes('finance') || category.includes('commerce') || ['stripe', 'razorpay', 'shopify'].includes(id)) {
    return [
      { id: 'setup', label: '1. Secret Auth', subtitle: 'Secret Key & Store Domain' },
      { id: 'configure', label: '2. Merchant Settings', subtitle: 'Currency & Event Webhook' },
      { id: 'test', label: '3. Live Balance Ping', subtitle: 'Query Merchant Info' },
    ];
  }

  return [
    { id: 'setup', label: '1. App & Auth Setup', subtitle: 'Connect Account' },
    { id: 'configure', label: '2. Operation Parameters', subtitle: 'Configure Parameters' },
    { id: 'test', label: '3. Live Step Verification', subtitle: 'Test Node Execution' },
  ];
}

  const handleInsertVariable = (varStr: string) => {
    if (activeFieldId) {
      const existing = configValues[activeFieldId] || '';
      handleFieldChange(activeFieldId, `${existing} ${varStr}`.trim());
      toast.success('Variable Inserted', { description: `Added ${varStr} to field.` });
    } else {
      // Default to first field if none active
      const firstFieldId = currentOperation?.fields[0]?.id;
      if (firstFieldId) {
        const existing = configValues[firstFieldId] || '';
        handleFieldChange(firstFieldId, `${existing} ${varStr}`.trim());
        toast.success('Variable Inserted', { description: `Added ${varStr} to field.` });
      } else {
        toast.info('Select a field to insert variable');
      }
    }
  };

  const sampleVariables = [
    { label: 'Sender Email', var: '{{nodes.node_trigger.output.sender}}' },
    { label: 'Subject', var: '{{nodes.node_trigger.output.subject}}' },
    { label: 'Body Text', var: '{{nodes.node_trigger.output.body}}' },
    { label: 'AI Summary Result', var: '{{nodes.node_ai.output.result}}' },
    { label: 'Trigger Time', var: '{{nodes.node_trigger.output.triggeredAt}}' },
    { label: 'Run ID', var: '{{nodes.node_trigger.output.runId}}' },
  ];

  const handleRunTest = async () => {
    setIsExecuting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post('/v1/workflows/test-step', {
        connectorId: connectorId,
        operationId: selectedOperationId,
        configValues,
      });

      const data = res.data.data;
      setTestResult({
        status: 'success',
        statusCode: 200,
        timestamp: data?.executedAt || new Date().toISOString(),
        outputData: data?.outputData,
      });
      toast.success('Step Executed Live', {
        description: `Executed ${selectedOperationId} via real ${manifest.name} API.`,
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Step execution failed.';
      setTestResult({
        status: 'error',
        statusCode: err?.response?.status || 400,
        timestamp: new Date().toISOString(),
        error: errorMsg,
      });
      toast.error('Step Execution Failed', { description: errorMsg });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `https://api.autoflow.ai/v1/webhooks/wh_${selectedNode.id}`;
    navigator.clipboard.writeText(url);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
    toast.success('Webhook URL Copied', { description: 'Paste into external service payload URL.' });
  };

  return (
    <div className="w-96 border-l border-borderColor bg-bgSecondary flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Drawer Header */}
      <div className="p-4 border-b border-borderColor flex items-center justify-between bg-white/[0.01]">
        <div>
          <Heading as="h3" className="text-sm">
            {data.stepNumber ? `${data.stepNumber}. ` : ''}{data.label || data.name}
          </Heading>
          <Text variant="muted" className="text-[11px]">
            {data.type === 'trigger' ? 'Trigger Event Configuration' : 'Action Step Parameters'}
          </Text>
        </div>
        <Badge variant={data.type === 'trigger' ? 'active' : 'info'}>
          {data.type === 'trigger' ? 'TRIGGER' : 'ACTION'}
        </Badge>
      </div>

      {/* Dynamic App-Aware 3-Step Wizard Navigation Bar */}
      <div className="flex border-b border-borderColor bg-bgPrimary px-2 pt-2 gap-1">
        {getDynamicWizardTabs(manifest).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 px-1 text-center rounded-t-lg transition-all border-t-2 flex flex-col items-center justify-center ${
              activeTab === tab.id
                ? 'bg-bgSecondary text-white border-accentPurple shadow-glow'
                : 'text-textMuted hover:text-white border-transparent'
            }`}
          >
            <span className="text-xs font-bold truncate max-w-full">{tab.label}</span>
            <span className="text-[9px] text-textMuted font-normal truncate max-w-full hidden sm:block">
              {tab.subtitle}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {/* TAB 1: SETUP (App Selection, Dynamic Event Selector & User Account) */}
        {activeTab === 'setup' && (
          <>
            {/* App Selection Card */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-borderColor flex items-center justify-between">
              <div>
                <div className="text-[11px] text-textMuted uppercase tracking-wider font-semibold">App</div>
                <div className="font-semibold text-xs text-white mt-0.5">{manifest.name}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={onChangeApp} className="text-xs">
                Change App
              </Button>
            </div>

            {/* Dynamic Event Dropdown */}
            <div>
              <label className="text-xs text-textSecondary font-semibold mb-1.5 block">
                Action / Event Event
              </label>
              <div className="relative">
                <select
                  value={selectedOperationId}
                  onChange={(e) => handleOperationChange(e.target.value)}
                  className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2 text-xs text-white outline-none appearance-none font-medium focus:border-accentPurple"
                >
                  {manifest.operations.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-textMuted pointer-events-none" />
              </div>
            </div>

            {/* Account Card Scoped Dynamically to Logged-in User & App Authentication */}
            <div>
              <label className="text-xs text-textSecondary font-semibold mb-1.5 flex items-center justify-between">
                <span>Account Authentication ({user.email})</span>
                {isCheckingConn && <Loader2 size={12} className="animate-spin text-accentPurple" />}
              </label>

              {isAccountConnected ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="text-accentEmerald shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {activeConnection?.name || `${manifest.name} Account`}
                      </div>
                      <div className="text-[10px] text-accentEmerald font-mono font-medium">
                        CONNECTED 🟢 (AES-256 Encrypted in MongoDB)
                      </div>
                    </div>
                  </div>
                  <Badge variant="active">Verified</Badge>
                </div>
              ) : (
                <form onSubmit={handleConnectInline} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span>Authentication Required: {manifest.name}</span>
                    </div>
                    <a href="/connectors" target="_blank" className="text-[10px] text-amber-400 hover:underline flex items-center gap-1">
                      <span>Docs</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>

                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    Connect your {manifest.name} credentials to execute this step:
                  </p>

                  <div className="flex flex-col gap-2">
                    <input
                      type="password"
                      value={inlineKey}
                      onChange={(e) => setInlineKey(e.target.value)}
                      placeholder={`Enter secret key, token, or connection URI for ${manifest.name}...`}
                      style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                      className="w-full px-3 py-2 bg-[#0f172a] border border-amber-500/40 rounded-lg text-xs text-white placeholder:text-slate-400 outline-none focus:border-amber-400 font-mono text-[11px]"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isConnectingInline || !inlineKey.trim()}
                      className="w-full py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {isConnectingInline ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                      <span>Verify &amp; Connect {manifest.name}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Security Audit Badge */}
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2 text-xs text-accentIndigo">
              <ShieldCheck size={16} />
              <span>AES-256-CBC token encryption enforced for {user.email}.</span>
            </div>
          </>
        )}

        {/* TAB 2: CONFIGURE (Dynamic Manifest-Driven Form Generator) */}
        {activeTab === 'configure' && (
          <>
            {isScheduleNode ? (
              <div className="flex flex-col gap-4">
                <div className="text-xs font-semibold text-white">AutoFlow Schedule Configuration:</div>
                <div className="grid grid-cols-3 gap-1.5 bg-bgPrimary p-1 rounded-xl border border-borderColor">
                  {[
                    { id: 'hourly', label: 'Hourly' },
                    { id: 'daily', label: 'Daily' },
                    { id: 'interval', label: 'Every X Mins' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'date', label: 'Specific Date' },
                    { id: 'webhook', label: 'Webhook URL' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setScheduleMode(m.id as any);
                        handleFieldChange('frequency', m.id);
                      }}
                      className={`py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                        scheduleMode === m.id
                          ? 'bg-accentPurple text-white shadow font-semibold'
                          : 'text-textMuted hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {scheduleMode === 'hourly' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <div>
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Repeat Interval (Hours)</label>
                      <select
                        value={configValues.intervalHours || '1'}
                        onChange={(e) => {
                          handleFieldChange('intervalHours', e.target.value);
                          handleFieldChange('frequency', 'hourly');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none mb-2"
                      >
                        <option value="1">Every 1 Hour (60 mins)</option>
                        <option value="2">Every 2 Hours</option>
                        <option value="3">Every 3 Hours</option>
                        <option value="4">Every 4 Hours</option>
                        <option value="6">Every 6 Hours</option>
                        <option value="12">Every 12 Hours</option>
                      </select>

                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Start Time / Time of Day</label>
                      <input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => {
                          setDailyTime(e.target.value);
                          handleFieldChange('time', e.target.value);
                          handleFieldChange('frequency', 'hourly');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {scheduleMode === 'daily' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <div>
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Trigger Time of Day</label>
                      <input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => {
                          setDailyTime(e.target.value);
                          handleFieldChange('time', e.target.value);
                          handleFieldChange('frequency', 'daily');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}
                {scheduleMode === 'interval' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <div>
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">
                        Preset Execution Interval
                      </label>
                      <select
                        value={['1', '2', '3', '5', '10', '15', '20', '30', '40', '45', '60'].includes(configValues.intervalMinutes || '2') ? (configValues.intervalMinutes || '2') : 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== 'custom') {
                            handleScheduleIntervalChange(val);
                          }
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none mb-2.5 font-medium"
                      >
                        <option value="1">Every 1 Minute (Ultra Fast)</option>
                        <option value="2">Every 2 Minutes (Real-Time Fast)</option>
                        <option value="3">Every 3 Minutes</option>
                        <option value="5">Every 5 Minutes</option>
                        <option value="10">Every 10 Minutes</option>
                        <option value="15">Every 15 Minutes</option>
                        <option value="20">Every 20 Minutes</option>
                        <option value="30">Every 30 Minutes</option>
                        <option value="40">Every 40 Minutes</option>
                        <option value="45">Every 45 Minutes</option>
                        <option value="60">Every 60 Minutes (1 Hour)</option>
                        <option value="custom">⚙️ Custom Minutes (Enter Below)</option>
                      </select>

                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">
                        Quick Minute Selection / Custom Entry:
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        {['1', '2', '5', '10', '15', '30', '40', '60'].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleIntervalChange(mins);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border cursor-pointer ${
                              (configValues.intervalMinutes || '2') === mins
                                ? 'bg-accentPurple text-white border-accentPurple font-bold shadow-md ring-2 ring-purple-400/30'
                                : 'bg-white/5 text-textMuted border-white/10 hover:text-white hover:bg-white/10 hover:border-white/30'
                            }`}
                          >
                            {mins} Mins
                          </button>
                        ))}
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={configValues.intervalMinutes || '2'}
                          onChange={(e) => {
                            handleScheduleIntervalChange(e.target.value);
                          }}
                          placeholder="e.g. 1, 2, 5, 10, 40, 90"
                          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                          className="w-full bg-[#0f172a] border border-borderColor rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-accentPurple"
                        />
                        <span className="absolute right-3 top-2 text-[10px] text-textMuted font-mono pointer-events-none">
                          mins
                        </span>
                      </div>
                      <p className="text-[10px] text-textMuted mt-1.5 leading-relaxed">
                        Workflow will automatically trigger every <strong>{configValues.intervalMinutes || '2'} minutes</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {scheduleMode === 'weekly' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <div>
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Day of Week</label>
                      <select
                        value={configValues.dayOfWeek || 'monday'}
                        onChange={(e) => {
                          handleFieldChange('dayOfWeek', e.target.value);
                          handleFieldChange('frequency', 'weekly');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none mb-2"
                      >
                        <option value="monday">Every Monday</option>
                        <option value="tuesday">Every Tuesday</option>
                        <option value="wednesday">Every Wednesday</option>
                        <option value="thursday">Every Thursday</option>
                        <option value="friday">Every Friday</option>
                        <option value="saturday">Every Saturday</option>
                        <option value="sunday">Every Sunday</option>
                      </select>

                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Trigger Time</label>
                      <input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => {
                          setDailyTime(e.target.value);
                          handleFieldChange('time', e.target.value);
                          handleFieldChange('frequency', 'weekly');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {scheduleMode === 'date' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <div>
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Target Date & Time</label>
                      <input
                        type="datetime-local"
                        value={configValues.targetDate || ''}
                        onChange={(e) => {
                          handleFieldChange('targetDate', e.target.value);
                          handleFieldChange('frequency', 'date');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {scheduleMode === 'webhook' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <label className="text-[11px] text-textMuted font-semibold block">Inbound Webhook Payload URL:</label>
                    <div className="flex items-center gap-1 bg-black/40 border border-borderColor rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] font-mono text-accentIndigo truncate flex-1">
                        https://api.autoflow.ai/v1/webhooks/wh_{selectedNode.id}
                      </span>
                      <button onClick={copyWebhookUrl} className="p-1 text-textMuted hover:text-white">
                        {webhookCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    Configure {manifest.name} ({currentOperation?.label})
                  </span>
                  <Badge variant="active">DYNAMIC FIELDS</Badge>
                </div>

                {currentOperation && currentOperation.fields.length > 0 ? (
                  currentOperation.fields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      <label className="text-xs text-textSecondary font-semibold flex items-center justify-between">
                        <span>{field.label}</span>
                        {activeFieldId === field.id && (
                          <span className="text-[10px] text-accentPurple font-normal">Active Field</span>
                        )}
                      </label>

                      {field.type === 'select' ? (
                        <div className="relative">
                          <select
                            value={configValues[field.id] || field.defaultValue || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            onFocus={() => setActiveFieldId(field.id)}
                            className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2 text-xs text-white outline-none appearance-none font-medium focus:border-accentPurple"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-3 text-textMuted pointer-events-none" />
                        </div>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={configValues[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          onFocus={() => setActiveFieldId(field.id)}
                          rows={3}
                          placeholder={field.placeholder}
                          className="w-full bg-bgPrimary border border-borderColor rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-accentPurple"
                        />
                      ) : (
                        <input
                          type="text"
                          value={configValues[field.id] || ''}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          onFocus={() => setActiveFieldId(field.id)}
                          placeholder={field.placeholder}
                          className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-accentPurple"
                        />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-3 bg-white/[0.02] border border-borderColor rounded-xl text-xs text-textMuted text-center">
                    No custom fields required for this step.
                  </div>
                )}

                {/* Clickable Upstream Variables Pill Inserter */}
                <div className="mt-2 pt-3 border-t border-borderColor/60">
                  <div className="text-[11px] text-textMuted font-semibold mb-2 flex items-center justify-between">
                    <span>Insert Upstream Dynamic Variables:</span>
                    <Sparkles size={12} className="text-accentPurple" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleVariables.map((v) => (
                      <button
                        key={v.var}
                        onClick={() => handleInsertVariable(v.var)}
                        className="px-2.5 py-1 bg-white/5 border border-white/10 hover:border-accentPurple rounded-lg text-[10px] text-accentIndigo font-mono transition-all"
                      >
                        + {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 3: TEST (Single App Step Execution & Live Response Viewer) */}
        {activeTab === 'test' && (
          <div className="flex flex-col gap-4">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Play size={15} className="text-accentPurple animate-pulse" />
                <span>Test Single App Step: {manifest.name}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Test executing <strong>{currentOperation?.label}</strong> independently via the real {manifest.name} API driver.
              </p>
            </div>

            <button
              onClick={handleRunTest}
              disabled={isExecuting || !isAccountConnected}
              className="glow-button w-full py-3 text-xs flex items-center justify-center gap-2 font-bold shadow-xl disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span>Executing {manifest.name} Test Ping...</span>
                </>
              ) : (
                <>
                  <Play size={15} />
                  <span>⚡ Test {manifest.name} Step Only</span>
                </>
              )}
            </button>

            {!isAccountConnected && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>Authentication required in Step 1 before testing this app.</span>
              </div>
            )}

            {testResult && (
              <div
                className={`p-4 rounded-xl flex flex-col gap-2.5 font-mono text-[11px] shadow-lg border ${
                  testResult.status === 'success'
                    ? 'bg-[#090d16] border-emerald-500/30'
                    : 'bg-red-950/20 border-red-500/40'
                }`}
              >
                <div
                  className={`flex justify-between items-center font-bold border-b pb-2 ${
                    testResult.status === 'success'
                      ? 'text-emerald-400 border-emerald-500/20'
                      : 'text-red-400 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {testResult.status === 'success' ? (
                      <>
                        <CheckCircle2 size={14} />
                        <span>STATUS: 200 OK — STEP VERIFIED</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} />
                        <span>STATUS: {testResult.statusCode || 400} FAILED — EXECUTION ERROR</span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-textMuted font-mono">
                    {testResult.timestamp ? testResult.timestamp.slice(11, 19) : ''}
                  </span>
                </div>
                <pre className={`overflow-x-auto p-2 text-[10px] rounded-lg ${testResult.status === 'success' ? 'text-slate-200 bg-black/30' : 'text-red-200 bg-red-950/40'}`}>
                  {JSON.stringify(
                    testResult.status === 'success'
                      ? testResult.outputData || { success: true, message: `${manifest.name} operation verified successfully!` }
                      : { success: false, error: testResult.error || 'Step execution failed.', connectorId, operationId: selectedOperationId },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
