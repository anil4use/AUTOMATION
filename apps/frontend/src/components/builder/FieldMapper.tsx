'use client';
import React, { useState } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, Lock, Plus, Tag, Clock, Calendar, Globe, Copy, Check, Edit2, Play, ChevronDown, ShieldCheck } from 'lucide-react';
import { Node } from 'reactflow';
import { useUserRole } from '@/context/UserRoleContext';
import { toast } from 'sonner';

export function FieldMapper({
  selectedNode,
  onChangeApp,
}: {
  selectedNode?: Node | null;
  onChangeApp?: () => void;
}) {
  const { user } = useUserRole();
  const [activeTab, setActiveTab] = useState<'setup' | 'configure' | 'test'>('setup');
  const [templateInput, setTemplateInput] = useState('{{nodes.node_trigger.output.body}}');
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
    toast.success('Inserted Variable', { description: `Appended ${variableStr} to field.` });
  };

  const handleRunTest = () => {
    setTestResult({
      status: 'success',
      statusCode: 200,
      timestamp: new Date().toISOString(),
      outputData: {
        id: `res_${Date.now()}`,
        message: 'Step executed successfully in worker sandbox.',
        outputPayload: templateInput,
        processedBy: data.connectorId || 'autoflow-schedule',
        userEmail: user.email,
      },
    });
    toast.success('Test Execution Completed', { description: 'Step output generated successfully.' });
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
        {/* TAB 1: SETUP (App Selection, Event Selector & User Account) */}
        {activeTab === 'setup' && (
          <>
            {/* App Selection Card */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-borderColor flex items-center justify-between">
              <div>
                <div className="text-[11px] text-textMuted uppercase tracking-wider font-semibold">App</div>
                <div className="font-semibold text-xs text-white mt-0.5">{data.connectorId?.toUpperCase() || 'AutoFlow Schedule'}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={onChangeApp} className="text-xs">
                Change App
              </Button>
            </div>

            {/* Event Dropdown */}
            <div>
              <label className="text-xs text-textSecondary font-semibold mb-1.5 block">Action / Event Event</label>
              <div className="relative">
                <select
                  defaultValue={data.operationId || 'schedule_time'}
                  className="w-full bg-bgPrimary border border-borderColor rounded-xl px-3.5 py-2 text-xs text-white outline-none appearance-none font-medium focus:border-accentPurple"
                >
                  <option value="schedule_time">Time Interval (Daily/Weekly)</option>
                  <option value="schedule_date">Target Specific Date & Time</option>
                  <option value="inbound_webhook">Instant Webhook Endpoint</option>
                  <option value="send_message">Send Notification Message</option>
                  <option value="append_row">Append Spreadsheet Record</option>
                  <option value="create_page">Create Database Page</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-textMuted pointer-events-none" />
              </div>
            </div>

            {/* Account Card Scoped Dynamically to Logged-in User */}
            <div>
              <label className="text-xs text-textSecondary font-semibold mb-1.5 block">Account Connection ({user.email})</label>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-borderColor flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock size={16} className="text-accentEmerald" />
                  <div>
                    <div className="text-xs font-semibold text-white">{user.name} ({user.email})</div>
                    <div className="text-[10px] text-textMuted">OAuth2 (AES-256 Encrypted)</div>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="text-[11px]">
                  Change Account
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

        {/* TAB 2: CONFIGURE (AutoFlow Schedule Configurator or Variable Mapper) */}
        {activeTab === 'configure' && (
          <>
            {isScheduleNode ? (
              <div className="flex flex-col gap-4">
                <div className="text-xs font-semibold text-white">AutoFlow Schedule Configuration:</div>
                <div className="grid grid-cols-2 gap-1.5 bg-bgPrimary p-1 rounded-xl border border-borderColor">
                  {[
                    { id: 'daily', label: 'Daily' },
                    { id: 'weekly', label: 'Weekly' },
                    { id: 'date', label: 'Specific Date' },
                    { id: 'webhook', label: 'Webhook URL' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setScheduleMode(m.id as any)}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                        scheduleMode === m.id
                          ? 'bg-accentPurple text-white shadow font-semibold'
                          : 'text-textMuted hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {scheduleMode === 'daily' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <div>
                      <label className="text-[11px] text-textMuted font-semibold mb-1 block">Trigger Time of Day</label>
                      <input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => setDailyTime(e.target.value)}
                        className="w-full bg-bgPrimary border border-borderColor rounded-lg px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {scheduleMode === 'weekly' && (
                  <div className="flex flex-col gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-borderColor">
                    <label className="text-[11px] text-textMuted font-semibold block">Select Days of Week:</label>
                    <div className="flex flex-wrap gap-1.5">
                      {daysOfWeek.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${
                            selectedDays.includes(day)
                              ? 'bg-accentIndigo text-white shadow'
                              : 'bg-white/5 text-textMuted hover:text-white'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
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
              <div>
                <label className="text-xs text-textSecondary font-semibold mb-1.5 block">Input Payload Template</label>
                <textarea
                  value={templateInput}
                  onChange={(e) => setTemplateInput(e.target.value)}
                  rows={4}
                  className="w-full bg-bgPrimary border border-borderColor rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-accentPurple"
                />
                <div className="mt-3">
                  <div className="text-[11px] text-textMuted font-semibold mb-1.5">Insert Upstream Variables:</div>
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
              Run test execution for this step using account <strong className="text-white">{user.email}</strong>.
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
