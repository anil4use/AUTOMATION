'use client';
import React, { useEffect, useState } from 'react';
import { Heading, Text, SectionCard, Badge, Button } from '@/components/ui';
import { getSocketClient } from '@/lib/socket-client';
import { RotateCw, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function ExecutionsPage() {
  const [logs, setLogs] = useState([
    { id: 'run_9401', workflow: 'Gmail to Slack Notifications', status: 'completed', duration: '1.2s', timestamp: '2 mins ago', canReplay: false },
    { id: 'run_9400', workflow: 'Sheet Row AI Extractor', status: 'completed', duration: '3.4s', timestamp: '15 mins ago', canReplay: false },
    { id: 'run_9399', workflow: 'Gmail to Slack Notifications', status: 'failed', duration: '0.5s', timestamp: '1 hour ago', canReplay: true },
  ]);

  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocketClient();
    socket.emit('join_org', 'dev_org_123');

    socket.on('execution_update', (eventData: any) => {
      console.log('Real-time Socket.io Execution Update:', eventData);
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

  const handleReplayStep = (id: string) => {
    toast.success('Replaying Execution Step', {
      description: `Resuming execution ${id} starting from the failed step... Skipping previously completed nodes.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Execution Audit Logs & Live Queue</Heading>
          <Text variant="secondary">
            Real-time execution monitoring powered by Socket.io and Upstash Redis BullMQ worker.
          </Text>
        </div>
        {liveStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-accentIndigo text-xs font-semibold animate-pulse">
            <Activity size={14} />
            <span>{liveStatus}</span>
          </div>
        )}
      </div>

      <SectionCard>
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider">
              <th className="p-3">Execution ID</th>
              <th className="p-3">Workflow</th>
              <th className="p-3">Status</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Started At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderColor">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="p-3 font-mono text-xs text-textSecondary">{log.id}</td>
                <td className="p-3 font-semibold text-white">{log.workflow}</td>
                <td className="p-3">
                  <Badge variant={log.status === 'completed' ? 'active' : log.status === 'running' ? 'info' : 'failed'}>
                    {log.status}
                  </Badge>
                </td>
                <td className="p-3 text-textSecondary text-xs">{log.duration}</td>
                <td className="p-3 text-textMuted text-xs">{log.timestamp}</td>
                <td className="p-3 text-right">
                  {log.canReplay && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReplayStep(log.id)}
                      className="inline-flex items-center gap-1.5"
                    >
                      <RotateCw size={12} />
                      <span>Replay Step</span>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
