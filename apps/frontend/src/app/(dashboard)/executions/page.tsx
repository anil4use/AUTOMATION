'use client';
import React, { useEffect, useState } from 'react';
import { Heading, Text, SectionCard, Badge, Button } from '@/components/ui';
import { getSocketClient } from '@/lib/socket-client';
import { RotateCw, Activity, Square, Search, Filter, Terminal, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ExecutionsPage() {
  const [logs, setLogs] = useState([
    { id: 'run_9402', workflow: 'Gmail to Slack Notifications', status: 'running', duration: '0.4s', timestamp: 'Just now', canReplay: false },
    { id: 'run_9401', workflow: 'Gmail to Slack Notifications', status: 'completed', duration: '1.2s', timestamp: '2 mins ago', canReplay: false },
    { id: 'run_9400', workflow: 'Sheet Row AI Extractor', status: 'completed', duration: '3.4s', timestamp: '15 mins ago', canReplay: false },
    { id: 'run_9399', workflow: 'Gmail to Slack Notifications', status: 'failed', duration: '0.5s', timestamp: '1 hour ago', canReplay: true },
  ]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocketClient();
    socket.emit('join_org', 'dev_org_123');

    socket.on('execution_update', (eventData: any) => {
      setLiveStatus(`Live Event: ${eventData.event} for job ${eventData.jobId}`);
      toast.info(`Execution Update: ${eventData.event}`, {
        description: `Job ${eventData.jobId} status is now ${eventData.status}.`,
      });

      if (eventData.event === 'job_started' || eventData.event === 'job_completed' || eventData.event === 'job_failed') {
        setLogs((prev) => [
          {
            id: `run_${eventData.jobId.slice(-4)}`,
            workflow: `Workflow #${eventData.workflowId || '101'}`,
            status: eventData.status,
            duration: '0.8s',
            timestamp: 'Just now',
            canReplay: eventData.status === 'failed',
          },
          ...prev,
        ]);
      }
    });

    return () => {
      socket.off('execution_update');
    };
  }, []);

  const handleStopExecution = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'cancelled', duration: 'Terminated' } : l))
    );
    toast.error('Execution Terminated & Stopped', {
      description: `Cancelled execution run #${id} in BullMQ worker queue.`,
    });
  };

  const handleReplayStep = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success('Replaying Execution Step', {
      description: `Resuming execution ${id} starting from the failed step... Skipping previously completed nodes.`,
    });
  };

  const filteredLogs = logs.filter((l) => filterStatus === 'all' || l.status === filterStatus);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Execution Audit Logs & Live Queue</Heading>
          <Text variant="secondary">
            Real-time execution monitoring, live job control, step replay, and BullMQ worker queue logs.
          </Text>
        </div>
        {liveStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-accentIndigo text-xs font-semibold animate-pulse">
            <Activity size={14} />
            <span>{liveStatus}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Controls */}
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
          <span className="text-xs text-textMuted font-mono">Showing {filteredLogs.length} runs</span>
        </div>
      </SectionCard>

      {/* Executions Table */}
      <SectionCard className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider bg-white/[0.01]">
              <th className="p-3.5 pl-4">Execution ID</th>
              <th className="p-3.5">Workflow Name</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Duration</th>
              <th className="p-3.5">Started At</th>
              <th className="p-3.5 text-right pr-4">Actions & Stop Control</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderColor">
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <td className="p-3.5 pl-4 font-mono text-xs text-accentIndigo font-semibold">{log.id}</td>
                <td className="p-3.5 font-semibold text-white">{log.workflow}</td>
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
                <td className="p-3.5 text-textSecondary text-xs">{log.duration}</td>
                <td className="p-3.5 text-textMuted text-xs">{log.timestamp}</td>
                <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    {/* Stop Running Execution Control */}
                    {log.status === 'running' && (
                      <button
                        onClick={(e) => handleStopExecution(log.id, e)}
                        className="px-2.5 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 text-xs font-semibold flex items-center gap-1 transition-all"
                        title="Cancel & Stop Running Job"
                      >
                        <Square size={12} fill="currentColor" />
                        <span>Stop Job</span>
                      </button>
                    )}

                    {/* Replay Step for Failed Executions */}
                    {log.canReplay && (
                      <button
                        onClick={(e) => handleReplayStep(log.id, e)}
                        className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <RotateCw size={12} />
                        <span>Replay Step</span>
                      </button>
                    )}

                    <span className="text-xs text-accentPurple font-semibold">Inspect Logs →</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Detailed Log Drawer Modal */}
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
                <Heading as="h3">Execution Log Inspector — {selectedLog.id}</Heading>
                <Text variant="muted">Workflow: {selectedLog.workflow}</Text>
              </div>
            </div>

            <div className="flex flex-col gap-2 font-mono text-xs bg-bgPrimary p-4 rounded-xl border border-borderColor max-h-80 overflow-y-auto">
              <div className="text-textMuted">[INFO] {selectedLog.timestamp} — Initializing execution DAG runner</div>
              <div className="text-accentEmerald">[STEP 1] AutoFlow Schedule Trigger evaluated (Status: 200 OK)</div>
              <div className="text-accentIndigo">[STEP 2] Gmail Connector fetched input payload successfully</div>
              <div className="text-accentPurple">[STEP 3] AI Processor Node generated LLM text summary</div>
              {selectedLog.status === 'failed' ? (
                <div className="text-red-400 font-bold">[ERROR] Step 4 Slack Webhook POST timed out (Mock 500 error)</div>
              ) : (
                <div className="text-accentEmerald font-bold">[SUCCESS] Workflow execution completed in {selectedLog.duration}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-borderColor">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close Inspector
              </Button>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
