'use client';
import React, { useState } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, Lock, Plus, Tag, Clock, Calendar, Globe, Copy, Check } from 'lucide-react';
import { Node } from 'reactflow';
import { toast } from 'sonner';

export function FieldMapper({ selectedNode }: { selectedNode?: Node | null }) {
  const [templateInput, setTemplateInput] = useState('{{nodes.node_trigger.output.body}}');
  const [selectedAccount, setSelectedAccount] = useState('account_1');

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
      <div className="w-80 border-l border-borderColor bg-bgSecondary flex flex-col p-4 justify-center items-center text-center">
        <Sliders className="text-textMuted mb-2" size={24} />
        <Heading as="h4" className="mb-1">Field Mapper Config</Heading>
        <Text variant="muted">Select any node on the React Flow canvas to configure field mappings & dynamic parameters.</Text>
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
    { label: 'Payload', var: '{{nodes.node_trigger.output.payload}}' },
    { label: 'AI Result', var: '{{nodes.node_ai.output.result}}' },
  ];

  const handleInsertVariable = (variableStr: string) => {
    setTemplateInput((prev) => `${prev} ${variableStr}`);
    toast.info('Variable Appended', { description: `Inserted ${variableStr} into input template.` });
  };

  const handleConnectNewAccount = () => {
    toast.info(`Connecting Account for ${data.connectorId?.toUpperCase()}`, {
      description: 'Redirecting to OAuth authorization with AES-256 token encryption.',
    });
  };

  const handleCopyWebhook = () => {
    const url = 'http://localhost:5000/api/v1/workflows/wh_101/webhook';
    navigator.clipboard.writeText(url);
    setWebhookCopied(true);
    setTimeout(() => setWebhookCopied(false), 2000);
    toast.success('Webhook URL Copied to Clipboard!', { description: url });
  };

  return (
    <div className="w-80 border-l border-borderColor bg-bgSecondary flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3 border-b border-borderColor pb-3">
        <div>
          <Heading as="h4">{data.label || data.name}</Heading>
          <Text variant="muted">ID: {selectedNode.id}</Text>
        </div>
        <Badge variant={data.type === 'trigger' ? 'active' : 'info'}>
          {data.type?.toUpperCase() || 'NODE'}
        </Badge>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        {/* Connected Account Selector */}
        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1 flex items-center gap-1">
            <Lock size={12} className="text-accentEmerald" />
            <span>Connected Account</span>
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="flex-1 bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-accentPurple"
            >
              <option value="account_1">{data.connectorId?.toUpperCase()} Work Account (AES-256)</option>
              <option value="account_2">{data.connectorId?.toUpperCase()} Personal (AES-256)</option>
            </select>
            <button
              onClick={handleConnectNewAccount}
              className="p-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded text-accentIndigo hover:bg-indigo-500/25 transition-colors"
              title="Connect New Account"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Dedicated AutoFlow Schedule Trigger Configurator */}
        {isScheduleNode && (
          <div className="p-3.5 rounded-md bg-white/[0.02] border border-accentPurple/40 flex flex-col gap-3">
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

            <div className="grid grid-cols-2 gap-1 bg-bgPrimary p-1 rounded border border-borderColor text-[10px] -mt-1">
              <button
                onClick={() => setScheduleMode('cron')}
                className={`py-1 rounded font-semibold ${scheduleMode === 'cron' ? 'bg-accentPurple text-white' : 'text-textMuted'}`}
              >
                Cron Rule
              </button>
              <button
                onClick={() => setScheduleMode('webhook')}
                className={`py-1 rounded font-semibold ${scheduleMode === 'webhook' ? 'bg-accentPurple text-white' : 'text-textMuted'}`}
              >
                Webhook URL
              </button>
            </div>

            {/* Mode 1: Daily / Interval */}
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
                <div>
                  <label className="text-[11px] text-textSecondary font-medium block mb-1">Repeat Every (Days)</label>
                  <select
                    value={dailyInterval}
                    onChange={(e) => setDailyInterval(e.target.value)}
                    className="w-full bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="1">Every 1 Day (Daily)</option>
                    <option value="2">Every 2 Days</option>
                    <option value="7">Every 7 Days</option>
                  </select>
                </div>
              </div>
            )}

            {/* Mode 2: Weekly Schedule */}
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
                <div>
                  <label className="text-[11px] text-textSecondary font-medium block mb-1">Execution Time</label>
                  <input
                    type="time"
                    value={dailyTime}
                    onChange={(e) => setDailyTime(e.target.value)}
                    className="w-full bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* Mode 3: Specific Date & Time */}
            {scheduleMode === 'date' && (
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="text-[11px] text-textSecondary font-medium block mb-1">Target Execution Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-textSecondary font-medium block mb-1">Target Time</label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    className="w-full bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* Mode 4: Cron Expression */}
            {scheduleMode === 'cron' && (
              <div>
                <label className="text-[11px] text-textSecondary font-medium block mb-1">5-Field Cron Expression</label>
                <input
                  type="text"
                  value={cronExp}
                  onChange={(e) => setCronExp(e.target.value)}
                  className="w-full bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-accentPurple mb-1"
                />
                <span className="text-[10px] text-textMuted">Example: 0 9 * * 1-5 (At 09:00 AM, Mon through Fri)</span>
              </div>
            )}

            {/* Mode 5: Instant Webhook URL */}
            {scheduleMode === 'webhook' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-textSecondary font-medium block">Unique Webhook Endpoint URL</label>
                <div className="p-2 rounded bg-bgPrimary border border-borderColor text-[10px] font-mono text-accentEmerald break-all flex items-center justify-between gap-1">
                  <span>http://localhost:5000/api/v1/workflows/wh_101/webhook</span>
                  <button onClick={handleCopyWebhook} className="p-1 hover:text-white transition-colors">
                    {webhookCopied ? <Check size={12} className="text-accentEmerald" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Operation Selection (if not schedule) */}
        {!isScheduleNode && (
          <div>
            <label className="text-xs font-semibold text-textSecondary mb-1 block">Operation Action</label>
            <select className="w-full bg-bgPrimary border border-borderColor rounded px-3 py-1.5 text-xs text-white outline-none">
              <option>{data.operationId || 'send_message'}</option>
              <option>custom_action</option>
            </select>
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
          <label className="text-xs font-semibold text-textSecondary mb-1 block">Input Payload Template</label>
          <textarea
            rows={3}
            value={templateInput}
            onChange={(e) => setTemplateInput(e.target.value)}
            className="w-full bg-bgPrimary border border-borderColor rounded p-2.5 text-xs font-mono text-white outline-none focus:border-accentPurple resize-none"
          />
          <Text variant="muted" className="text-[11px] mt-1">
            Output variables from upstream nodes are interpolated dynamically at step execution time.
          </Text>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="mt-4 w-full"
        onClick={() => toast.success('Node Saved', { description: 'Updated node parameters and credentials.' })}
      >
        Save Node Configuration
      </Button>
    </div>
  );
}
