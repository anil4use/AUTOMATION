'use client';
import React from 'react';

export default function ExecutionsPage() {
  const logs = [
    { id: 'run_9401', workflow: 'Gmail to Slack Notifications', status: 'Completed', duration: '1.2s', timestamp: '2 mins ago' },
    { id: 'run_9400', workflow: 'Sheet Row AI Extractor', status: 'Completed', duration: '3.4s', timestamp: '15 mins ago' },
    { id: 'run_9399', workflow: 'Gmail to Slack Notifications', status: 'Failed', duration: '0.5s', timestamp: '1 hour ago' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Execution Audit Logs</h1>
        <p className="text-textSecondary text-sm">Real-time execution status and BullMQ queue log details.</p>
      </div>

      <div className="glass-card p-6">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider">
              <th className="p-3">Execution ID</th>
              <th className="p-3">Workflow</th>
              <th className="p-3">Status</th>
              <th className="p-3">Duration</th>
              <th className="p-3">Started At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderColor">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/[0.02]">
                <td className="p-3 font-mono text-xs text-textSecondary">{log.id}</td>
                <td className="p-3 font-semibold text-white">{log.workflow}</td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    log.status === 'Completed' ? 'bg-emerald-500/15 text-accentEmerald' : 'bg-red-500/15 text-accentRose'
                  }`}>
                    {log.status}
                  </span>
                </td>
                <td className="p-3 text-textSecondary text-xs">{log.duration}</td>
                <td className="p-3 text-textMuted text-xs">{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
