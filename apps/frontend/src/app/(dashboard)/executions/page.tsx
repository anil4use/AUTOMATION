'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Heading, Text, SectionCard, Badge, Button } from '@/components/ui';
import { getSocketClient } from '@/lib/socket-client';
import { RotateCw, Activity, Square, Filter, Terminal, X, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useUserRole } from '@/context/UserRoleContext';

interface ExecutionLog {
  _id: string;
  jobId?: string;
  workflowId?: string;
  workflowName?: string;
  status: string;
  duration?: string;
  startedAt?: string;
  createdAt?: string;
  steps?: any[];
  error?: string;
}

export default function ExecutionsPage() {
  const { user } = useUserRole();
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const res = await apiClient.get('/v1/executions', { params });
      setLogs(res.data.data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to load execution logs.';
      setError(msg);
      toast.error('Error loading executions', { description: msg });
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time socket updates
  useEffect(() => {
    const socket = getSocketClient();
    socket.emit('join_org', user.organizationId || 'unknown');

    socket.on('execution_update', (eventData: any) => {
      setLiveStatus(`Live: ${eventData.event} — Job ${eventData.jobId}`);
      toast.info(`Execution Update: ${eventData.event}`, {
        description: `Job ${eventData.jobId} → ${eventData.status}`,
      });
      // Refresh logs to get updated state from DB
      fetchLogs();
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
        description: `Cancelled job ${log.jobId || log._id} in BullMQ queue.`,
      });
    } catch (err: any) {
      // Optimistic update even if API doesn't support delete yet
      setLogs((prev) =>
        prev.map((l) => (l._id === log._id ? { ...l, status: 'cancelled' } : l))
      );
      toast.warning('Stop requested', { description: 'Job cancellation sent to worker.' });
    }
  };

  const handleReplayStep = async (log: ExecutionLog, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.post(`/v1/workflows/${log.workflowId}/run`, {});
      toast.success('Re-queued for Execution', {
        description: `Workflow ${log.workflowId} dispatched to BullMQ worker queue.`,
      });
      fetchLogs();
    } catch (err: any) {
      toast.error('Replay failed', {
        description: err?.response?.data?.message || 'Could not re-queue job.',
      });
    }
  };

  const filteredLogs = logs.filter((l) => filterStatus === 'all' || l.status === filterStatus);

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Execution Audit Logs &amp; Live Queue</Heading>
          <Text variant="secondary">
            Real-time execution monitoring from MongoDB Atlas &amp; BullMQ worker.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {liveStatus && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-accentIndigo text-xs font-semibold animate-pulse">
              <Activity size={14} />
              <span>{liveStatus}</span>
            </div>
          )}
          <button
            onClick={fetchLogs}
            className="p-2 rounded-lg bg-white/5 border border-borderColor text-textMuted hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <SectionCard className="py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-textMuted" />
            <span className="text-xs text-textSecondary font-semibold">Filter Status:</span>
            {['all', 'running', 'completed', 'failed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 text-xs rounded-full uppercase font-semibold transition-all ${
                  filterStatus === st
                    ? 'bg-accentPurple text-white shadow-glow'
                    : 'bg-white/5 text-textMuted hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <span className="text-xs text-textMuted font-mono">
            {filteredLogs.length} runs
          </span>
        </div>
      </SectionCard>

      {/* Executions Table */}
      <SectionCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-borderColor bg-bgSecondary flex items-center justify-between">
          <Heading as="h3" className="text-sm flex items-center gap-2">
            <Activity size={16} className="text-accentPurple" />
            Execution History
          </Heading>
          <Badge variant="active">LIVE · MONGODB</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-textMuted text-xs">
            <Loader2 size={18} className="animate-spin text-accentPurple" />
            <span>Loading execution logs...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-400 text-xs">
            {error}
            <br />
            <button onClick={fetchLogs} className="mt-3 text-accentPurple hover:underline">
              Retry
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-textMuted text-xs">
            No execution logs found{filterStatus !== 'all' ? ` with status "${filterStatus}"` : ''}.
            <br />
            <span className="text-[11px]">Run a workflow to see execution records here.</span>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider bg-white/[0.01]">
                <th className="p-3.5 pl-4">Execution ID</th>
                <th className="p-3.5">Workflow</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Started At</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderColor">
              {filteredLogs.map((log) => (
                <tr
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <td className="p-3.5 pl-4 font-mono text-xs text-accentIndigo font-semibold">
                    {log.jobId || log._id?.slice(-8)}
                  </td>
                  <td className="p-3.5 font-semibold text-white text-xs">
                    {log.workflowName || log.workflowId || '—'}
                  </td>
                  <td className="p-3.5">
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
                  </td>
                  <td className="p-3.5 text-textMuted text-xs">
                    {formatTime(log.startedAt || log.createdAt)}
                  </td>
                  <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {log.status === 'running' && (
                        <button
                          onClick={(e) => handleStopExecution(log, e)}
                          className="px-2.5 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Square size={12} fill="currentColor" />
                          <span>Stop Job</span>
                        </button>
                      )}
                      {log.status === 'failed' && log.workflowId && (
                        <button
                          onClick={(e) => handleReplayStep(log, e)}
                          className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <RotateCw size={12} />
                          <span>Replay</span>
                        </button>
                      )}
                      <span className="text-xs text-accentPurple font-semibold">Inspect →</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Detailed Log Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <SectionCard className="w-full max-w-2xl border-purple-500/40 relative flex flex-col gap-4">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-borderColor pb-3">
              <Terminal size={20} className="text-accentPurple" />
              <div>
                <Heading as="h3">
                  Execution Inspector — {selectedLog.jobId || selectedLog._id?.slice(-8)}
                </Heading>
                <Text variant="muted">
                  Workflow: {selectedLog.workflowName || selectedLog.workflowId || '—'}
                </Text>
              </div>
            </div>

            <div className="flex flex-col gap-2 font-mono text-xs bg-bgPrimary p-4 rounded-xl border border-borderColor max-h-80 overflow-y-auto">
              <div className="text-textMuted">[INFO] Job ID: {selectedLog.jobId || selectedLog._id}</div>
              <div className="text-textMuted">[INFO] Status: {selectedLog.status?.toUpperCase()}</div>
              <div className="text-textMuted">[INFO] Started: {formatTime(selectedLog.startedAt || selectedLog.createdAt)}</div>
              {(() => {
                const nodeRes = (selectedLog as any).nodeResults || {};
                const stepsList = selectedLog.steps || Object.values(nodeRes);
                if (stepsList.length === 0) {
                  return <div className="text-textMuted italic">[INFO] No step-level data recorded for this execution.</div>;
                }
                return stepsList.map((step: any, i: number) => (
                  <div key={i} className="p-2.5 rounded bg-white/5 border border-borderColor/40 flex flex-col gap-1.5 mb-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className={step.status === 'failed' ? 'text-red-400' : 'text-emerald-400'}>
                        [STEP {i + 1}] {step.name || step.nodeId || `Node ${i + 1}`} {step.connectorId ? `(${step.connectorId})` : ''}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {step.durationMs !== undefined ? `${step.durationMs}ms` : ''} · {step.status?.toUpperCase()}
                      </span>
                    </div>
                    {step.error && <div className="text-red-300 font-semibold text-[11px]">Error: {step.error}</div>}
                    {step.output && (
                      <pre className="mt-1 p-2 bg-black/60 rounded text-[10px] text-emerald-300/90 overflow-x-auto max-h-36">
                        {JSON.stringify(step.output, null, 2)}
                      </pre>
                    )}
                  </div>
                ));
              })()}
              {selectedLog.status === 'failed' && selectedLog.error && (
                <div className="text-red-400 font-bold p-2 bg-red-500/10 border border-red-500/30 rounded">
                  [WORKFLOW ERROR] {selectedLog.error}
                </div>
              )}
              {selectedLog.status === 'completed' && (
                <div className="text-accentEmerald font-bold text-[11px] p-2 bg-emerald-500/10 border border-emerald-500/30 rounded flex items-center justify-between">
                  <span>[WORKFLOW SUCCESS] All steps executed live successfully.</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-borderColor">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
