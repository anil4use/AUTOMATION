'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, Lock, Copy, Check, ChevronDown, ShieldCheck, Play, Sparkles } from 'lucide-react';
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

  'autoflow-schedule': {
    name: 'AutoFlow Schedule Trigger',
    operations: [
      {
        id: 'schedule_time',
        label: 'Time Interval (Daily/Weekly/Target Time)',
        type: 'trigger',
        fields: [],
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

      {/* Zapier 3-Tab Navigation Bar */}
      <div className="flex border-b border-borderColor bg-bgPrimary px-2 pt-2">
        {[
          { id: 'setup', label: '1. Setup' },
          { id: 'configure', label: '2. Configure' },
          { id: 'test', label: '3. Test' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-xs font-semibold rounded-t-lg transition-all border-t-2 ${
              activeTab === tab.id
                ? 'bg-bgSecondary text-white border-accentPurple shadow-glow'
                : 'text-textMuted hover:text-white border-transparent'
            }`}
          >
            {tab.label}
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

            {/* Account Card Scoped Dynamically to Logged-in User */}
            <div>
              <label className="text-xs text-textSecondary font-semibold mb-1.5 block">
                Account Connection ({user.email})
              </label>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-borderColor flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock size={16} className="text-accentEmerald" />
                  <div>
                    <div className="text-xs font-semibold text-white">{user.name} ({user.email})</div>
                    <div className="text-[10px] text-textMuted">OAuth2 (AES-256 Encrypted)</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="text-[11px]">
                  Connected
                </Button>
              </div>
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
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Execution Interval (Minutes)</label>
                      <select
                        value={configValues.intervalMinutes || '15'}
                        onChange={(e) => {
                          handleFieldChange('intervalMinutes', e.target.value);
                          handleFieldChange('frequency', 'interval');
                        }}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none"
                      >
                        <option value="5">Every 5 Minutes</option>
                        <option value="10">Every 10 Minutes</option>
                        <option value="15">Every 15 Minutes</option>
                        <option value="30">Every 30 Minutes</option>
                        <option value="45">Every 45 Minutes</option>
                        <option value="60">Every 60 Minutes (1 hour)</option>
                      </select>
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

        {/* TAB 3: TEST (Step Execution & Response Viewer) */}
        {activeTab === 'test' && (
          <div className="flex flex-col gap-4">
            <div className="text-xs text-textSecondary">
              Run test execution for <strong className="text-white">{manifest.name} ({currentOperation?.label})</strong>.
            </div>

            <Button onClick={handleRunTest} className="glow-button w-full text-xs py-2.5 flex items-center justify-center gap-2">
              <Play size={14} />
              <span>Test Step Execution</span>
            </Button>

            {testResult && (
              <div className="p-3 bg-bgPrimary border border-borderColor rounded-xl flex flex-col gap-2 font-mono text-[11px]">
                <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-borderColor/60 pb-1.5">
                  <span>STATUS: 200 OK</span>
                  <span className="text-[10px] text-textMuted">{testResult.timestamp.slice(11, 19)}</span>
                </div>
                <pre className="text-textSecondary overflow-x-auto p-1 text-[10px]">
                  {JSON.stringify(testResult.outputData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
