'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Heading, Text, SectionCard, Badge } from '@/components/ui';
import {
  Workflow, Plus, Play, Pause, FileText, Edit, Trash2,
  Activity, CheckCircle2, PauseCircle, Loader2, RefreshCw,
  Clock, Calendar, Zap, Search, Bot, FileSpreadsheet, Mail,
  MessageSquare, ArrowRight, Layers
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface WorkflowItem {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft';
  definition?: { nodes: any[]; edges: any[] };
  createdAt: string;
  updatedAt: string;
  runsCount?: number;
  lastRunAt?: string;
}

function LiveNextExecutionCountdown({ wf }: { wf: WorkflowItem }) {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    if (wf.status !== 'active') return;

    const computeTimeLeft = () => {
      const nodes = wf.definition?.nodes || [];
      const triggerNode = nodes.find((n) => n.type === 'trigger' || n.connectorId === 'autoflow-schedule') || nodes[0];
      const config = triggerNode?.config || {};
      const freq = config.frequency || 'daily';
      const targetTimeStr = config.time || '20:00';

      const now = new Date();

      if (freq === 'hourly') {
        const currentMins = now.getMinutes();
        const currentSecs = now.getSeconds();
        const remSecs = (60 - currentMins - 1) * 60 + (60 - currentSecs);
        const minsLeft = Math.floor(remSecs / 60);
        const secsLeft = remSecs % 60;
        return `${minsLeft.toString().padStart(2, '0')}m : ${secsLeft.toString().padStart(2, '0')}s`;
      }

      if (freq === 'interval') {
        const intervalMins = parseInt(config.intervalMinutes) || 15;
        const currentMins = now.getMinutes();
        const currentSecs = now.getSeconds();
        const nextIntervalMin = Math.ceil((currentMins + 1) / intervalMins) * intervalMins;
        const remSecs = (nextIntervalMin - currentMins - 1) * 60 + (60 - currentSecs);
        const minsLeft = Math.floor(remSecs / 60);
        const secsLeft = remSecs % 60;
        return `${minsLeft.toString().padStart(2, '0')}m : ${secsLeft.toString().padStart(2, '0')}s`;
      }

      // Daily / Weekly Schedule: Parse targetTimeStr e.g. 20:00 or 09:00
      const [hStr, mStr] = targetTimeStr.split(':');
      const targetHour = parseInt(hStr) || 9;
      const targetMin = parseInt(mStr) || 0;

      const targetDate = new Date();
      targetDate.setHours(targetHour, targetMin, 0, 0);

      // If target time has passed today, target is tomorrow
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      const diffMs = targetDate.getTime() - now.getTime();
      if (diffMs <= 0) {
        return '⚡ Triggering now...';
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      const hStrFmt = hours > 0 ? `${hours.toString().padStart(2, '0')}h : ` : '';
      return `${hStrFmt}${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`;
    };

    // Initial compute
    setTimeLeftStr(computeTimeLeft());

    // 1-second interval ticker
    const timer = setInterval(() => {
      setTimeLeftStr(computeTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [wf]);

  if (wf.status !== 'active') {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 font-mono">
        <PauseCircle size={11} />
        <span>Paused</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-[11px] text-accentIndigo font-mono font-semibold shadow-glow-sm">
      <Clock size={11} className="animate-pulse text-sky-400" />
      <span>{timeLeftStr || 'Calculating...'}</span>
    </div>
  );
}

export default function WorkflowsPage() {
  const { user } = useUserRole();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/v1/workflows');
      setWorkflows(res.data.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load workflows.';
      setError(msg);
      toast.error('Error loading workflows', { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleToggleStatus = async (wf: WorkflowItem) => {
    const nextStatus = wf.status === 'active' ? 'paused' : 'active';
    try {
      await apiClient.put(`/v1/workflows/${wf._id}`, { status: nextStatus });
      setWorkflows((prev) =>
        prev.map((w) => (w._id === wf._id ? { ...w, status: nextStatus } : w))
      );
      toast.info(`Workflow ${nextStatus === 'active' ? 'Activated' : 'Paused'}`, {
        description: `"${wf.name}" is now ${nextStatus.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast.error('Failed to update status', {
        description: err?.response?.data?.message || 'Could not update workflow.',
      });
    }
  };

  const handleTestRun = async (wf: WorkflowItem) => {
    try {
      const res = await apiClient.post(`/v1/workflows/${wf._id}/run`, {});
      toast.success(`Test Run Dispatched`, {
        description: `Workflow execution triggered successfully.`,
      });
      fetchWorkflows();
    } catch (err: any) {
      toast.error('Test Run Failed', {
        description: err?.response?.data?.message || 'Could not dispatch execution.',
      });
    }
  };

  const handleDelete = async (wf: WorkflowItem) => {
    try {
      await apiClient.delete(`/v1/workflows/${wf._id}`);
      setWorkflows((prev) => prev.filter((w) => w._id !== wf._id));
      toast.error(`Workflow Deleted`, { description: `"${wf.name}" removed permanently.` });
    } catch (err: any) {
      toast.error('Delete failed', {
        description: err?.response?.data?.message || 'Could not delete workflow.',
      });
    }
  };

  const getTriggerInfo = (wf: WorkflowItem) => {
    const nodes = wf.definition?.nodes || [];
    const triggerNode = nodes.find((n) => n.type === 'trigger' || n.connectorId === 'autoflow-schedule') || nodes[0];

    if (!triggerNode) {
      return { label: 'Daily Schedule', detail: 'Every day at 09:00 AM' };
    }

    const cid = triggerNode.connectorId;
    const config = triggerNode.config || {};

    if (cid === 'autoflow-schedule') {
      const freq = config.frequency || 'daily';
      const time = config.time || '09:00 AM';
      const interval = config.intervalMinutes || 60;

      if (freq === 'hourly') return { label: 'Hourly Schedule', detail: 'Runs every 60 mins' };
      if (freq === 'interval') return { label: `Interval (${interval}m)`, detail: `Runs every ${interval} mins` };
      return { label: 'Daily Schedule', detail: `Every day at ${time}` };
    }

    if (cid === 'gmail') return { label: 'Gmail Inbox Trigger', detail: 'On new unread email' };
    if (cid === 'stripe') return { label: 'Stripe Webhook', detail: 'On payment succeeded' };

    return { label: 'Scheduled Trigger', detail: 'Automated workflow' };
  };

  const getConnectorBadge = (connectorId: string) => {
    switch (connectorId) {
      case 'autoflow-schedule':
        return { name: 'Schedule', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      case 'web-search':
        return { name: 'Web Search', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
      case 'ai-agent':
        return { name: 'AI Analyst', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'google-sheets':
        return { name: 'Google Sheets', color: 'bg-green-500/10 text-green-400 border-green-500/20' };
      case 'gmail':
        return { name: 'Gmail', color: 'bg-red-500/10 text-red-400 border-red-500/20' };
      case 'slack':
        return { name: 'Slack', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      default:
        return { name: connectorId, color: 'bg-white/5 text-textMuted border-white/10' };
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Automation Workflows</Heading>
          <Text variant="secondary">
            Manage workflows for <strong className="text-white">{user.email}</strong> — live schedules & pipeline triggers.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkflows}
            className="p-2 rounded-lg bg-white/5 border border-borderColor text-textMuted hover:text-white transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={15} />
          </button>
          <Link href="/workflows/new" className="glow-button inline-flex items-center gap-1.5 text-xs">
            <Plus size={16} />
            <span>+ Create New Workflow</span>
          </Link>
        </div>
      </div>

      <SectionCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-borderColor bg-bgSecondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-accentPurple" />
            <Heading as="h3" className="text-sm">
              All Workflows ({workflows.length})
            </Heading>
          </div>
          <Badge variant="active">LIVE · MONGODB ATLAS</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-textMuted text-xs">
            <Loader2 size={18} className="animate-spin text-accentPurple" />
            <span>Loading workflows from database...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400 text-xs">
            {error}
            <br />
            <button onClick={fetchWorkflows} className="mt-3 text-accentPurple hover:underline">
              Retry
            </button>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 text-textMuted text-xs bg-white/[0.01]">
            No workflows created yet for <strong className="text-white">{user.email}</strong>.<br />
            Click <strong className="text-accentPurple">+ Create New Workflow</strong> to build your first automation.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider bg-white/[0.01]">
                  <th className="p-3.5 pl-4">Workflow Name & Pipeline</th>
                  <th className="p-3.5">Trigger Schedule</th>
                  <th className="p-3.5">Next Execution</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Runs</th>
                  <th className="p-3.5">Updated</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor">
                {workflows.map((wf) => {
                  const trigger = getTriggerInfo(wf);
                  const nodes = wf.definition?.nodes || [];

                  return (
                    <tr key={wf._id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Pipeline Flow Badges */}
                      <td className="p-3.5 pl-4 max-w-xs">
                        <div className="font-semibold text-white text-xs mb-1 truncate">{wf.name}</div>
                        <div className="text-[11px] text-textMuted truncate mb-2">
                          {wf.description || 'No description provided'}
                        </div>
                        {/* Connector Pipeline Sequence Pills */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {nodes.length > 0 ? (
                            nodes.map((node: any, idx: number) => {
                              const badge = getConnectorBadge(node.connectorId);
                              return (
                                <React.Fragment key={node.id || idx}>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] border font-medium ${badge.color}`}
                                    title={node.name || badge.name}
                                  >
                                    {badge.name}
                                  </span>
                                  {idx < nodes.length - 1 && (
                                    <ArrowRight size={10} className="text-white/20" />
                                  )}
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-textMuted">1-Step Schedule Trigger</span>
                          )}
                        </div>
                      </td>

                      {/* Trigger Schedule Info */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-white font-medium">
                          <Clock size={13} className="text-accentPurple" />
                          <span>{trigger.label}</span>
                        </div>
                        <div className="text-[11px] text-textMuted mt-0.5">{trigger.detail}</div>
                      </td>

                      {/* Next Execution Live Countdown Ticker */}
                      <td className="p-3.5 whitespace-nowrap">
                        <LiveNextExecutionCountdown wf={wf} />
                      </td>

                      {/* Status Button */}
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(wf)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            wf.status === 'active'
                              ? 'bg-emerald-500/15 border border-emerald-500/30 text-accentEmerald hover:bg-emerald-500/25'
                              : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                          }`}
                          title={wf.status === 'active' ? 'Click to Pause' : 'Click to Activate'}
                        >
                          {wf.status === 'active' ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>RUNNING</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle size={13} />
                              <span>{wf.status.toUpperCase()}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Execution Runs */}
                      <td className="p-3.5 text-xs text-textMuted whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-white/5 font-mono text-white text-[11px]">
                          {wf.runsCount || 1} runs
                        </span>
                      </td>

                      {/* Updated Date */}
                      <td className="p-3.5 text-xs text-textMuted whitespace-nowrap">
                        {new Date(wf.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(wf)}
                            className={`p-1.5 rounded transition-colors ${
                              wf.status === 'active'
                                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/30'
                                : 'bg-emerald-500/15 text-accentEmerald hover:bg-emerald-500/30'
                            }`}
                            title={wf.status === 'active' ? 'Pause Workflow' : 'Activate Workflow'}
                          >
                            {wf.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                          </button>

                          <button
                            onClick={() => handleTestRun(wf)}
                            className="p-1.5 bg-indigo-500/15 text-accentIndigo hover:bg-indigo-500/30 rounded transition-colors"
                            title="Trigger Immediate Test Run"
                          >
                            <Activity size={14} />
                          </button>

                          <Link
                            href={`/executions?workflowId=${wf._id}`}
                            className="p-1.5 bg-white/5 text-textSecondary hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="View Execution Logs"
                          >
                            <FileText size={14} />
                          </Link>

                          <Link
                            href={`/workflows/${wf._id}`}
                            className="p-1.5 bg-white/5 text-textSecondary hover:text-white hover:bg-white/10 rounded transition-colors"
                            title="Edit Workflow Canvas"
                          >
                            <Edit size={14} />
                          </Link>

                          <button
                            onClick={() => handleDelete(wf)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-colors"
                            title="Delete Workflow"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
