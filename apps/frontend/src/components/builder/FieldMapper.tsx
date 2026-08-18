'use client';
import React, { useState } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, Lock, Plus, Tag, Clock, Calendar, Globe, Copy, Check, Edit2, Play, ChevronDown, ShieldCheck } from 'lucide-react';
import { Node } from 'reactflow';
import { toast } from 'sonner';

export function FieldMapper({
  selectedNode,
  onChangeApp,
}: {
  selectedNode?: Node | null;
  onChangeApp?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'setup' | 'configure' | 'test'>('setup');
  const [templateInput, setTemplateInput] = useState('{{nodes.node_trigger.output.body}}');
  const [selectedAccount, setSelectedAccount] = useState('account_1');
  const [testResult, setTestResult] = useState<any>(null);

  // Schedule Trigger Modes & Fields
  const [scheduleMode, setScheduleMode] = useState<'daily' | 'weekly' | 'date' | 'cron' | 'webhook'>('daily');
  const [dailyTime, setDailyTime] = useState('09:00');
  const [dailyInterval, setDailyInterval] = useState('1');
  const [targetDate, setTargetDate] = useState('2026-09-01');
  const [targetTime, setTargetTime] = useState('10:00');
  const [cronExp, setCronExp] = useState('0 9 * * 1-5');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [webhookCopied, setWebhookCopied] = useState(false);

  if (!selectedNode) {
    return (
      <div className="w-96 border-l border-borderColor bg-bgSecondary flex flex-col p-6 justify-center items-center text-center">
        <Sliders className="text-textMuted mb-3" size={28} />
        <Heading as="h4" className="mb-1">Select a Workflow Step</Heading>
        <Text variant="muted">Click any step card in the vertical flow to setup app, event, account, and field parameters.</Text>
      </div>
    );
  }

  const { data } = selectedNode;
  const isScheduleNode = data.connectorId === 'autoflow-schedule';
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const sampleVariables = [
    { label: 'Trigger Time', var: '{{nodes.node_trigger.output.triggeredAt}}' },
    { label: 'Run ID', var: '{{nodes.node_trigger.output.runId}}' },
    { label: 'Body Text', var: '{{nodes.node_trigger.output.body}}' },
    { label: 'AI Result', var: '{{nodes.node_ai.output.result}}' },
  ];

  const handleInsertVariable = (variableStr: string) => {
    setTemplateInput((prev) => `${prev} ${variableStr}`);
    toast.info('Variable Appended', { description: `Inserted ${variableStr} into input template.` });
  };

  const handleRunTestStep = () => {
    setTestResult({
      status: 'success',
      statusCode: 200,
      executionTimeMs: 142,
      output: {
        id: `exec_${Date.now()}`,
        status: 'completed',
        data: { messageId: 'msg_99812', sender: 'user@example.com', response: 'Step executed successfully.' },
      },
    });
    toast.success('Test Step Succeeded!', { description: 'Verified app credentials and payload payload schema.' });
  };

  const handleCopyWebhook = () => {
    const url = 'http://localhost:5000/api/v1/workflows/wh_101/webhook';
    navigator.clipboard.writeText(url);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
    toast.success('Webhook URL Copied to Clipboard!', { description: url });
  };

  return (
    <div className="w-96 border-l border-borderColor bg-bgSecondary flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="p-4 border-b border-borderColor bg-bgPrimary flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heading as="h4" className="text-sm font-bold flex items-center gap-1.5">
              <span>{data.stepNumber || 1}. {data.label || data.name}</span>
              <Edit2 size={13} className="text-textMuted cursor-pointer hover:text-white" />
            </Heading>
          </div>
          <Badge variant={data.type === 'trigger' ? 'active' : 'info'}>
            {data.type?.toUpperCase() || 'STEP'}
          </Badge>
        </div>

        {/* Zapier-Style 3 Stepper Tabs (Setup / Configure / Test) */}
        <div className="flex border-b border-borderColor text-xs font-semibold text-textMuted -mb-4">
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'setup'
                ? 'border-accentPurple text-white font-bold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <span>Setup</span>
            <span className="w-2 h-2 rounded-full bg-accentEmerald inline-block" />
          </button>
          <button
            onClick={() => setActiveTab('configure')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'configure'
                ? 'border-accentPurple text-white font-bold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <span>Configure</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'test'
                ? 'border-accentPurple text-white font-bold'
                : 'border-transparent hover:text-white'
            }`}
          >
            <span>Test</span>
            <Clock size={12} />
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {/* TAB 1: SETUP */}
        {activeTab === 'setup' && (
          <div className="flex flex-col gap-4">
            {/* App Selection Card */}
            <div>
              <label className="text-xs font-semibold text-textSecondary mb-1.5 flex items-center justify-between">
                <span>App <span className="text-red-400">*</span></span>
              </label>
              <div className="p-3 rounded-lg bg-bgPrimary border border-borderColor flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded bg-indigo-500/15 flex items-center justify-center text-accentIndigo font-bold text-xs uppercase">
                    {data.connectorId?.substring(0, 2) || 'APP'}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white">{data.connectorId?.toUpperCase()}</div>
                    <div className="text-[10px] text-textMuted">Integration App</div>
                  </div>
                </div>
                {onChangeApp && (
                  <button
                    onClick={onChangeApp}
                    className="px-3 py-1 rounded bg-accentIndigo text-white text-xs font-semibold hover:bg-indigo-600 transition-colors shadow"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>

            {/* Action Event Selector */}
            <div>
              <label className="text-xs font-semibold text-textSecondary mb-1.5 block">
                Action Event <span className="text-red-400">*</span>
              </label>
              <select className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-accentPurple font-semibold">
                <option>{data.operationId || 'send_message'}</option>
                <option>custom_action_event</option>
              </select>
            </div>

            {/* Connected Account Card */}
            <div>
              <label className="text-xs font-semibold text-textSecondary mb-1.5 flex items-center justify-between">
                <span>Account <span className="text-red-400">*</span></span>
              </label>
              <div className="p-3 rounded-lg bg-bgPrimary border border-borderColor flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                    <span>anil.anuragee@aripratech.com</span>
                    <ShieldCheck size={14} className="text-accentEmerald" />
                  </div>
                  <div className="text-[10px] text-textMuted">Used in 1 Active Workflow</div>
                </div>
                <button
                  onClick={() => toast.info('Managing OAuth Credentials')}
                  className="px-3 py-1 rounded bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  Change
                </button>
              </div>

              <div className="text-[11px] text-textMuted bg-white/[0.02] p-2.5 rounded-lg border border-white/5 leading-relaxed">
                {data.connectorId?.toUpperCase()} is a secure partner with AutoFlow. Credentials are encrypted with AES-256 and can be removed anytime.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURE */}
        {activeTab === 'configure' && (
          <div className="flex flex-col gap-4">
            {/* AutoFlow Schedule Trigger Configurator */}
            {isScheduleNode && (
              <div className="p-3.5 rounded-lg bg-white/[0.02] border border-accentPurple/40 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-accentPurple" />
                  <span className="font-semibold text-xs text-white">AutoFlow Schedule Configurator</span>
                </div>

                {/* Schedule Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-1 bg-bgPrimary p-1 rounded border border-borderColor text-[10px]">
                  <button
                    onClick={() => setScheduleMode('daily')}
                    className={`py-1 rounded font-semibold ${scheduleMode === 'daily' ? 'bg-accentPurple text-white' : 'text-textMuted'}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setScheduleMode('weekly')}
                    className={`py-1 rounded font-semibold ${scheduleMode === 'weekly' ? 'bg-accentPurple text-white' : 'text-textMuted'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setScheduleMode('date')}
                    className={`py-1 rounded font-semibold ${scheduleMode === 'date' ? 'bg-accentPurple text-white' : 'text-textMuted'}`}
                  >
                    Exact Date
                  </button>
                </div>

                {/* Daily Mode */}
                {scheduleMode === 'daily' && (
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <label className="text-[11px] text-textSecondary font-medium block mb-1">Execution Time (Daily)</label>
                      <input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => setDailyTime(e.target.value)}
                        className="w-full bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-accentPurple"
                      />
                    </div>
                  </div>
                )}

                {/* Weekly Mode */}
                {scheduleMode === 'weekly' && (
                  <div className="flex flex-col gap-2.5">
                    <label className="text-[11px] text-textSecondary font-medium block">Select Days of Week</label>
                    <div className="flex flex-wrap gap-1">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                            selectedDays.includes(day)
                              ? 'bg-accentPurple text-white border-accentPurple'
                              : 'bg-white/5 text-textMuted border-borderColor'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive Output Variable Picker */}
            <div>
              <label className="text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1">
                <Tag size={12} className="text-accentPurple" />
                <span>Available Upstream Variables</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {sampleVariables.map((v) => (
                  <button
                    key={v.var}
                    onClick={() => handleInsertVariable(v.var)}
                    className="px-2 py-1 rounded bg-white/[0.04] hover:bg-indigo-500/20 border border-white/10 text-[10px] text-accentIndigo hover:text-white transition-colors"
                  >
                    + {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Field Mapping Template Input */}
            <div>
              <label className="text-xs font-semibold text-textSecondary mb-1 block">Input Payload Template <span className="text-red-400">*</span></label>
              <textarea
                rows={4}
                value={templateInput}
                onChange={(e) => setTemplateInput(e.target.value)}
                className="w-full bg-bgPrimary border border-borderColor rounded-lg p-2.5 text-xs font-mono text-white outline-none focus:border-accentPurple resize-none"
              />
            </div>
          </div>
        )}

        {/* TAB 3: TEST */}
        {activeTab === 'test' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-borderColor flex flex-col gap-3">
              <Heading as="h4" className="text-xs">Test Step Execution</Heading>
              <Text variant="muted" className="text-xs">
                Send test payload through connector SDK to verify API connectivity and handle output responses.
              </Text>
              <Button variant="primary" size="sm" onClick={handleRunTestStep} className="w-full flex items-center justify-center gap-2">
                <Play size={14} /> Test Step
              </Button>
            </div>

            {testResult && (
              <div className="p-3 rounded-lg bg-bgPrimary border border-accentEmerald/40 font-mono text-xs text-white">
                <div className="flex items-center justify-between text-accentEmerald font-bold mb-2 text-[11px]">
                  <span>✅ Execution Success (200 OK)</span>
                  <span>{testResult.executionTimeMs}ms</span>
                </div>
                <pre className="text-[10px] text-textMuted overflow-x-auto p-2 bg-black/40 rounded">
                  {JSON.stringify(testResult.output, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="p-4 border-t border-borderColor bg-bgPrimary">
        <Button
          variant="primary"
          size="sm"
          className="w-full font-bold shadow-glow"
          onClick={() => toast.success('Step Configuration Saved', { description: 'Updated step parameters.' })}
        >
          Save & Continue
        </Button>
      </div>
    </div>
  );
}
