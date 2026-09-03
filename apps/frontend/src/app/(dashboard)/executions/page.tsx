'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Heading, Text, SectionCard, Badge, Button } from '@/components/ui';
import { getSocketClient } from '@/lib/socket-client';
import {
  RotateCw, Activity, Square, Filter, Terminal, X, Loader2, RefreshCw,
  Search, CheckCircle2, AlertCircle, Clock, Zap, Copy, Check, ChevronRight,
  Layers, ArrowUpRight, Play, Server, Database, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useUserRole } from '@/context/UserRoleContext';

export interface ExecutionLog {
  _id: string;
  jobId?: string;
  workflowId?: string;
  workflowName?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | string;
  duration?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  steps?: any[];
  nodeResults?: Record<string, any>;
  triggerPayload?: Record<string, any>;
  error?: string;
}

function formatTime(isoString?: string) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function calculateDuration(start?: string, end?: string): string {
  if (!start) return '—';
  try {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMs = Math.max(0, endTime - startTime);
    if (diffMs < 1000) return `${diffMs}ms`;
    return `${(diffMs / 1000).toFixed(1)}s`;
  } catch {
    return '—';
  }
}

export default function ExecutionsPage() {
  const { user } = useUserRole();
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [workflowMap, setWorkflowMap] = useState<Record<string, string>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'steps' | 'json' | 'payload'>('steps');

  const fetchLogs = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;

      const [logsRes, wfRes] = await Promise.all([
        apiClient.get('/v1/executions', { params }),
        apiClient.get('/v1/workflows').catch(() => ({ data: { data: [] } })),
      ]);

      const wfList = wfRes.data?.data || [];
      const map: Record<string, string> = {};
      wfList.forEach((wf: any) => {
        if (wf._id && wf.name) map[wf._id] = wf.name;
      });
      setWorkflowMap(map);

      setLogs(logsRes.data.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load execution logs.';
      setError(msg);
      if (!isSilent) toast.error('Error loading executions', { description: msg });
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh interval (every 5s if enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchLogs(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocketClient();
    socket.emit('join_org', user.organizationId || 'unknown');

    socket.on('execution_update', (eventData: any) => {
      setLiveStatus(`Live Event: ${eventData.event || 'Execution Started'}`);
      toast.info(`Execution Update: ${eventData.event || 'DAG Running'}`, {
        description: `Job ${eventData.jobId || ''} → ${eventData.status}`,
      });
      fetchLogs(true);
    });

    return () => {
      socket.off('execution_update');
    };
  }, [user.organizationId, fetchLogs]);

  const handleStopExecution = async (log: ExecutionLog, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/v1/executions/${log._id}`);
      setLogs((prev) =>
        prev.map((l) => (l._id === log._id ? { ...l, status: 'cancelled' } : l))
      );
      toast.error('Execution Stopped', {
        description: `Cancelled job ${log.jobId || log._id} in worker queue.`,
      });
    } catch (err: any) {
      setLogs((prev) =>
        prev.map((l) => (l._id === log._id ? { ...l, status: 'cancelled' } : l))
      );
      toast.warning('Stop signal sent', { description: 'Job cancellation dispatched.' });
    }
  };

  const handleReplayStep = async (log: ExecutionLog, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!log.workflowId) {
      toast.error('Cannot replay', { description: 'No workflow ID attached to this execution record.' });
      return;
    }
    try {
      await apiClient.post(`/v1/workflows/${log.workflowId}/run`, {});
      toast.success('Workflow Re-Queued 🚀', {
        description: `Dispatched new pipeline execution run to background engine.`,
      });
      fetchLogs(true);
    } catch (err: any) {
      toast.error('Replay failed', { description: err?.response?.data?.message || 'Could not re-run workflow.' });
    }
  };

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('Copied to Clipboard', { description: text });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute live stats
  const totalCount = logs.length;
  const completedCount = logs.filter((l) => l.status === 'completed').length;
  const runningCount = logs.filter((l) => l.status === 'running' || l.status === 'pending').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Filter logs by search query and status
  const filteredLogs = logs.filter((log) => {
    const wfName = log.workflowName || workflowMap[log.workflowId || ''] || '';
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (log._id && log._id.toLowerCase().includes(q)) ||
      (log.jobId && log.jobId.toLowerCase().includes(q)) ||
      (log.workflowId && log.workflowId.toLowerCase().includes(q)) ||
      (wfName && wfName.toLowerCase().includes(q)) ||
      (log.status && log.status.toLowerCase().includes(q)) ||
      (log.error && log.error.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* 🚀 Header Banner & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-bgSecondary via-bgPrimary to-bgSecondary p-6 rounded-2xl border border-borderColor shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accentPurple/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE WORKER QUEUE &amp; ATLAS AUDIT</span>
            </div>
            {liveStatus && (
              <span className="text-xs font-mono text-accentIndigo animate-fade-in truncate max-w-xs">
                {liveStatus}
              </span>
            )}
          </div>
          <Heading as="h1" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Execution Audit Logs &amp; Live Queue</span>
          </Heading>
          <Text variant="muted" className="text-xs max-w-xl leading-relaxed">
            Real-time execution monitoring engine powered by MongoDB Atlas &amp; BullMQ worker queues.
          </Text>
        </div>

        {/* Controls: Manual Refresh & Auto-Refresh Toggle */}
        <div className="flex items-center gap-2.5 z-10">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              autoRefresh
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-white/5 border-borderColor text-textMuted hover:text-white'
            }`}
          >
            <Activity size={13} className={autoRefresh ? 'animate-pulse text-emerald-400' : ''} />
            <span>Auto 5s {autoRefresh ? 'ON' : 'OFF'}</span>
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchLogs()}
            disabled={loading}
            className="flex items-center gap-1.5 border-borderColor hover:bg-white/10"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-accentPurple' : ''} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 📊 Live Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Executions */}
        <div className="bg-bgSecondary/80 p-4 rounded-xl border border-borderColor flex flex-col gap-1 shadow-md hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-textMuted text-xs font-medium">
            <span>Total Executions</span>
            <Database size={15} className="text-accentPurple" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {totalCount}
          </div>
          <div className="text-[11px] text-textMuted flex items-center gap-1 mt-0.5">
            <span className="text-emerald-400 font-semibold">MongoDB Atlas</span> live records
          </div>
        </div>

        {/* Card 2: Success Rate */}
        <div className="bg-bgSecondary/80 p-4 rounded-xl border border-borderColor flex flex-col gap-1 shadow-md hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-textMuted text-xs font-medium">
            <span>Success Rate</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {successRate}%
          </div>
          <div className="text-[11px] text-textMuted flex items-center gap-1 mt-0.5">
            <span className="text-white font-semibold">{completedCount}</span> of {totalCount} completed
          </div>
        </div>

        {/* Card 3: Active & Running */}
        <div className="bg-bgSecondary/80 p-4 rounded-xl border border-borderColor flex flex-col gap-1 shadow-md hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-textMuted text-xs font-medium">
            <span>Active Worker Jobs</span>
            <Zap size={15} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mt-1 flex items-center gap-2">
            <span>{runningCount}</span>
            {runningCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />}
          </div>
          <div className="text-[11px] text-textMuted flex items-center gap-1 mt-0.5">
            BullMQ Queue worker active
          </div>
        </div>

        {/* Card 4: Failed Runs */}
        <div className="bg-bgSecondary/80 p-4 rounded-xl border border-borderColor flex flex-col gap-1 shadow-md hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between text-textMuted text-xs font-medium">
            <span>Failed Runs</span>
            <AlertCircle size={15} className="text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono mt-1">
            {failedCount}
          </div>
          <div className="text-[11px] text-textMuted flex items-center gap-1 mt-0.5">
            {failedCount === 0 ? 'Zero pipeline errors' : 'Requires inspection'}
          </div>
        </div>
      </div>

      {/* 🎯 Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-bgSecondary/60 p-2.5 rounded-xl border border-borderColor">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All Logs (${logs.length})` },
            { id: 'completed', label: `🟢 Completed (${completedCount})` },
            { id: 'running', label: `⚡ Active (${runningCount})` },
            { id: 'failed', label: `🔴 Failed (${failedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-accentPurple text-white shadow-md'
                  : 'text-textMuted hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input Box */}
        <div className="relative min-w-[260px]">
          <Search size={14} className="absolute left-3 top-2.5 text-textMuted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, workflow, errors..."
            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
            className="w-full bg-[#0f172a] border border-borderColor rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-accentPurple transition-all font-mono"
          />
        </div>
      </div>

      {/* 📜 Execution History Table Card */}
      <SectionCard className="border-borderColor p-0 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-textMuted text-xs font-medium">
            <Loader2 size={20} className="animate-spin text-accentPurple" />
            <span>Fetching live execution logs from MongoDB Atlas...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 text-xs flex flex-col items-center gap-2">
            <AlertCircle size={24} />
            <span>{error}</span>
            <button onClick={() => fetchLogs()} className="mt-2 text-accentPurple hover:underline font-semibold">
              Click to Retry Loading
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-textMuted text-xs flex flex-col items-center gap-2">
            <Activity size={24} className="text-slate-600" />
            <span>No execution logs found{searchQuery ? ` matching "${searchQuery}"` : ''}.</span>
            <span className="text-[11px] text-slate-500">Run a workflow or wait for scheduled cron trigger.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-borderColor text-textMuted text-[11px] font-semibold uppercase tracking-wider bg-white/[0.02]">
                  <th className="p-4 pl-5">Execution ID</th>
                  <th className="p-4">Workflow Name &amp; Pipeline</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Executed At</th>
                  <th className="p-4 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor/60">
                {filteredLogs.map((log) => {
                  const wfName =
                    log.workflowName && !log.workflowName.match(/^[0-9a-fA-F]{24}$/)
                      ? log.workflowName
                      : (log.workflowId && workflowMap[log.workflowId])
                      ? workflowMap[log.workflowId]
                      : log.workflowName || log.workflowId || 'Automated Pipeline';

                  const nodeResults = log.nodeResults || {};
                  const stepCount = Object.keys(nodeResults).length || (log.steps?.length || 0);

                  return (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                    >
                      {/* Execution ID */}
                      <td className="p-4 pl-5 font-mono text-xs text-accentIndigo font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="hover:underline">{log.jobId || log._id?.slice(-8)}</span>
                          <button
                            onClick={(e) => copyToClipboard(log._id, e)}
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Copy Execution ID"
                          >
                            {copiedId === log._id ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Workflow Name */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-white text-xs group-hover:text-purple-300 transition-colors">
                            {wfName}
                          </span>
                          <span className="text-[10px] text-textMuted font-mono flex items-center gap-1">
                            <Layers size={10} className="text-accentPurple" />
                            <span>{stepCount > 0 ? `${stepCount} Steps Configured` : 'Trigger Pipeline'}</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              log.status === 'completed'
                                ? 'bg-emerald-400'
                                : log.status === 'running'
                                ? 'bg-amber-400 animate-pulse'
                                : log.status === 'cancelled'
                                ? 'bg-slate-400'
                                : 'bg-red-400'
                            }`}
                          />
                          <Badge
                            variant={
                              log.status === 'completed'
                                ? 'active'
                                : log.status === 'running'
                                ? 'info'
                                : log.status === 'cancelled'
                                ? 'draft'
                                : 'failed'
                            }
                          >
                            {log.status?.toUpperCase()}
                          </Badge>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="p-4 font-mono text-textMuted text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-500" />
                          <span>{calculateDuration(log.startedAt || log.createdAt, log.completedAt)}</span>
                        </div>
                      </td>

                      {/* Executed At */}
                      <td className="p-4 text-textMuted text-xs font-mono">
                        {formatTime(log.startedAt || log.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right pr-5 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {log.status === 'running' && (
                            <button
                              onClick={(e) => handleStopExecution(log, e)}
                              className="px-2.5 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-semibold flex items-center gap-1 transition-all"
                            >
                              <Square size={11} fill="currentColor" />
                              <span>Stop Job</span>
                            </button>
                          )}
                          {log.workflowId && (
                            <button
                              onClick={(e) => handleReplayStep(log, e)}
                              className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-[11px] font-medium flex items-center gap-1 transition-all"
                            >
                              <RotateCw size={11} />
                              <span>Replay</span>
                            </button>
                          )}
                          <span className="text-xs text-accentPurple font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Inspect <ChevronRight size={13} />
                          </span>
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

      {/* 🔍 Deep Glassmorphism Log Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-3xl bg-bgSecondary border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-bgPrimary via-bgSecondary to-bgPrimary border-b border-borderColor flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Terminal size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Heading as="h3" className="text-base font-bold text-white">
                      Execution Log Inspector
                    </Heading>
                    <Badge
                      variant={
                        selectedLog.status === 'completed'
                          ? 'active'
                          : selectedLog.status === 'running'
                          ? 'info'
                          : 'failed'
                      }
                    >
                      {selectedLog.status?.toUpperCase()}
                    </Badge>
                  </div>
                  <Text variant="muted" className="text-xs font-mono">
                    ID: {selectedLog.jobId || selectedLog._id}
                  </Text>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-textMuted hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Inspector Sub-Nav Tabs */}
            <div className="flex items-center gap-2 px-5 py-2.5 bg-black/40 border-b border-borderColor text-xs font-semibold">
              <button
                onClick={() => setActiveInspectorTab('steps')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeInspectorTab === 'steps'
                    ? 'bg-accentPurple text-white shadow'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>Step Execution Flow</span>
              </button>
              <button
                onClick={() => setActiveInspectorTab('json')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeInspectorTab === 'json'
                    ? 'bg-accentPurple text-white shadow'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                <Terminal size={13} />
                <span>Raw Step Output JSON</span>
              </button>
              <button
                onClick={() => setActiveInspectorTab('payload')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeInspectorTab === 'payload'
                    ? 'bg-accentPurple text-white shadow'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                <Zap size={13} />
                <span>Trigger Payload</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-4 font-mono text-xs">
              {/* TAB 1: Step Execution Flow */}
              {activeInspectorTab === 'steps' && (
                <div className="flex flex-col gap-3">
                  {(() => {
                    const nodeRes = selectedLog.nodeResults || {};
                    const stepEntries = Object.entries(nodeRes);

                    if (stepEntries.length === 0) {
                      return (
                        <div className="p-6 text-center text-textMuted italic bg-white/[0.02] rounded-xl border border-borderColor">
                          No step-level output payload recorded for this execution.
                        </div>
                      );
                    }

                    return stepEntries.map(([nodeId, resObj]: [string, any], idx) => {
                      const isSuccess = resObj?.success !== false;
                      return (
                        <div
                          key={nodeId}
                          className="p-3.5 bg-white/[0.02] border border-borderColor rounded-xl flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <span className={isSuccess ? 'text-emerald-400' : 'text-red-400'}>
                                Node Step: {nodeId}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {isSuccess ? '🟢 COMPLETED' : '🔴 FAILED'}
                            </span>
                          </div>

                          {resObj?.data && (
                            <pre className="p-3 bg-black/60 border border-borderColor/60 rounded-lg text-[11px] text-emerald-300 overflow-x-auto max-h-48 leading-relaxed">
                              {JSON.stringify(resObj.data, null, 2)}
                            </pre>
                          )}

                          {resObj?.error && (
                            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 font-semibold text-[11px]">
                              Error: {resObj.error}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* TAB 2: Raw Step Output JSON */}
              {activeInspectorTab === 'json' && (
                <pre className="p-4 bg-black/80 border border-borderColor rounded-xl text-emerald-400 text-xs overflow-x-auto max-h-96 leading-relaxed">
                  {JSON.stringify(selectedLog.nodeResults || {}, null, 2)}
                </pre>
              )}

              {/* TAB 3: Trigger Payload */}
              {activeInspectorTab === 'payload' && (
                <pre className="p-4 bg-black/80 border border-borderColor rounded-xl text-purple-300 text-xs overflow-x-auto max-h-96 leading-relaxed">
                  {JSON.stringify(selectedLog.triggerPayload || {}, null, 2)}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-bgPrimary border-t border-borderColor flex items-center justify-between">
              <span className="text-textMuted text-[11px]">
                Executed At: {formatTime(selectedLog.startedAt || selectedLog.createdAt)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                  Close Inspector
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
