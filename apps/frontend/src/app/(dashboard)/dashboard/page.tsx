'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { StatCards, DashboardStatsData } from '@/components/dashboard/StatCards';
import { AIPromptBar } from '@/components/ai/AIPromptBar';
import Link from 'next/link';
import {
  Plus, ArrowUpRight, Workflow, RefreshCw, Activity,
  CheckCircle2, PauseCircle, Crown, User, Loader2,
} from 'lucide-react';
import { fetchDashboardStats } from '@/lib/api-client';
import { useUserRole } from '@/context/UserRoleContext';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUserRole();
  const [statsData, setStatsData] = useState<DashboardStatsData>({
    activeWorkflows: 0,
    totalExecutions: 0,
    successRate: '100%',
    failedJobs: 0,
  });
  const [recentWorkflows, setRecentWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchDashboardStats();
      setStatsData({
        activeWorkflows: data.activeWorkflows ?? 0,
        totalExecutions: data.totalExecutions ?? 0,
        successRate: data.successRate ?? '100%',
        failedJobs: data.failedJobs ?? 0,
      });
      setRecentWorkflows(data.recentWorkflows || []);
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      // Don't show fake numbers — just leave zeros
      setStatsData({ activeWorkflows: 0, totalExecutions: 0, successRate: '—', failedJobs: 0 });
      setRecentWorkflows([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = async () => {
    await loadStats();
    toast.info('Dashboard Refreshed', {
      description: `Latest metrics loaded from MongoDB Atlas for ${user.email}.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Platform Overview</span>
            <button
              onClick={handleRefresh}
              className={`p-1.5 rounded-lg text-textMuted hover:text-white hover:bg-white/5 transition-colors ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh Stats"
            >
              <RefreshCw size={16} />
            </button>
          </h1>
          <p className="text-textSecondary text-sm flex items-center gap-1.5 mt-0.5">
            {user.role === 'admin' ? (
              <span className="text-accentPurple font-semibold flex items-center gap-1">
                <Crown size={14} className="text-amber-400" />
                Administrator — Live metrics from MongoDB Atlas for {user.email}.
              </span>
            ) : (
              <span className="text-accentIndigo font-semibold flex items-center gap-1">
                <User size={14} />
                Member — Personal metrics for {user.email}.
              </span>
            )}
          </p>
        </div>
        <Link href="/workflows/new" className="glow-button flex items-center gap-2 text-sm">
          <Plus size={18} />
          <span>New Workflow</span>
        </Link>
      </div>

      <AIPromptBar onGenerate={(prompt) => router.push(`/ai-agent?prompt=${encodeURIComponent(prompt)}`)} />

      {/* Live Stat Cards from MongoDB */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-textMuted text-xs">
          <Loader2 size={18} className="animate-spin text-accentPurple" />
          <span>Loading live metrics...</span>
        </div>
      ) : (
        <StatCards statsData={statsData} />
      )}

      {/* Recent Workflows from MongoDB */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accentPurple" />
            <h3 className="text-base font-semibold text-white">
              Recent Workflows ({recentWorkflows.length})
            </h3>
          </div>
          <Link href="/workflows" className="text-accentIndigo text-xs flex items-center gap-1 hover:underline font-semibold">
            <span>Manage All →</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-textMuted text-xs">
            <Loader2 size={16} className="animate-spin text-accentPurple" />
            <span>Loading workflows...</span>
          </div>
        ) : recentWorkflows.length === 0 ? (
          <div className="text-center py-8 text-textMuted text-xs bg-white/[0.01] rounded-xl border border-dashed border-borderColor">
            No workflows yet for <strong className="text-white">{user.email}</strong>.<br />
            Click <strong className="text-accentPurple">+ New Workflow</strong> above to build your first automation.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentWorkflows.map((wf: any) => (
              <div
                key={wf._id || wf.id}
                className="flex items-center justify-between p-3 px-4 rounded-md bg-white/[0.02] border border-borderColor hover:border-accentPurple transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-accentIndigo">
                    <Workflow size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">{wf.name}</div>
                    <div className="text-[11px] text-textMuted mt-0.5">
                      {wf.description || 'No description'} · Updated {new Date(wf.updatedAt || wf.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                    wf.status === 'active'
                      ? 'bg-emerald-500/15 text-accentEmerald'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>
                    {wf.status === 'active' ? <CheckCircle2 size={12} /> : <PauseCircle size={12} />}
                    <span>{(wf.status || 'draft').toUpperCase()}</span>
                  </span>
                  <Link
                    href={`/workflows/${wf._id || wf.id}`}
                    className="text-xs text-accentPurple hover:text-white font-semibold"
                  >
                    Edit →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
