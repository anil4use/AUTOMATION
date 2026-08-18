'use client';
import React from 'react';
import { Workflow, Play, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface DashboardStatsData {
  activeWorkflows?: number;
  totalExecutions?: number | string;
  successRate?: string;
  failedJobs?: number;
}

export function StatCards({ statsData }: { statsData?: DashboardStatsData }) {
  const stats = [
    { label: 'Active Workflows', value: statsData?.activeWorkflows ?? 14, icon: Workflow, colorClass: 'text-accentIndigo' },
    { label: 'Total Executions', value: statsData?.totalExecutions ?? '1,420', icon: Play, colorClass: 'text-accentPurple' },
    { label: 'Success Rate', value: statsData?.successRate ?? '99.4%', icon: CheckCircle2, colorClass: 'text-accentEmerald' },
    { label: 'Failed Jobs', value: statsData?.failedJobs ?? 8, icon: AlertTriangle, colorClass: 'text-accentRose' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <div key={i} className="glass-card p-5 flex flex-col justify-between hover:border-accentPurple transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-textSecondary text-xs font-medium">{stat.label}</span>
              <Icon size={20} className={stat.colorClass} />
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}
