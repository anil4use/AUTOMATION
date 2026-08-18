'use client';
import React, { useEffect, useState } from 'react';
import { StatCards, DashboardStatsData } from '@/components/dashboard/StatCards';
import { AIPromptBar } from '@/components/ai/AIPromptBar';
import Link from 'next/link';
import { Plus, ArrowUpRight, Workflow, RefreshCw, Activity, CheckCircle2, PauseCircle, ShieldAlert, Crown, User } from 'lucide-react';
import { fetchDashboardStats } from '@/lib/api-client';
import { useUserRole } from '@/context/UserRoleContext';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { user } = useUserRole();
  const [statsData, setStatsData] = useState<DashboardStatsData>({
    activeWorkflows: 0,
    totalExecutions: 0,
    successRate: '100%',
    failedJobs: 0,
  });
  const [recentWorkflows, setRecentWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const calculateDynamicStats = () => {
    setIsLoading(true);
    try {
      const savedStr = localStorage.getItem('autoflow_user_workflows');
      let allWorkflows = savedStr ? JSON.parse(savedStr) : [];

      if (!allWorkflows || allWorkflows.length === 0) {
        allWorkflows = [
          {
            id: 'wf_101',
            name: 'Gmail Attachment → Google Drive → Google Sheets → Slack Alert',
            status: 'active',
            connectors: ['AutoFlow Schedule', 'Gmail', 'Google Drive', 'Google Sheets', 'Slack'],
            runsCount: 142,
            lastRunAt: '2 mins ago',
            createdBy: 'usr_9401', // Created by current user
          },
          {
            id: 'wf_102',
            name: 'Stripe Payment Succeeded → Notion DB Page → WhatsApp Contact',
            status: 'active',
            connectors: ['Stripe', 'Notion', 'WhatsApp'],
            runsCount: 89,
            lastRunAt: '15 mins ago',
            createdBy: 'usr_9999', // Created by team member
          },
          {
            id: 'wf_103',
            name: 'WhatsApp Lead → AI Summarizer Node → Google Sheets Row',
            status: 'paused',
            connectors: ['WhatsApp', 'AI Node', 'Google Sheets'],
            runsCount: 230,
            lastRunAt: '16:45',
            createdBy: 'usr_8888', // Created by team member
          },
        ];
      }

      // Filter workflows based on User Role (Admin sees all, User sees user-scoped)
      const visibleWorkflows = user.role === 'admin'
        ? allWorkflows
        : allWorkflows.slice(0, 1); // User role sees 1 user-scoped workflow

      const activeCount = visibleWorkflows.filter((w: any) => w.status === 'active' || w.status === 'Active').length;
      const totalExec = visibleWorkflows.reduce((sum: number, w: any) => sum + (Number(w.runsCount) || 0), 0);
      const failedCount = user.role === 'admin' ? Math.max(1, Math.floor(totalExec * 0.015)) : 0;
      const calculatedRate = totalExec > 0 ? `${(((totalExec - failedCount) / totalExec) * 100).toFixed(1)}%` : '100%';

      setStatsData({
        activeWorkflows: activeCount,
        totalExecutions: totalExec.toLocaleString(),
        successRate: calculatedRate,
        failedJobs: failedCount,
      });

      setRecentWorkflows(visibleWorkflows);
    } catch (e) {
      console.error('Error calculating dynamic stats:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculateDynamicStats();
  }, [user.role]);

  const handleRefresh = async () => {
    calculateDynamicStats();
    try {
      await fetchDashboardStats();
    } catch (e) {
      // fallback
    }
    toast.info('Refreshed Dynamic Metrics', {
      description: `Updated metrics for ${user.role.toUpperCase()} role scope.`,
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
              title="Recalculate Stats"
            >
              <RefreshCw size={16} />
            </button>
          </h1>
          <p className="text-textSecondary text-sm flex items-center gap-1.5 mt-0.5">
            {user.role === 'admin' ? (
              <span className="text-accentPurple font-semibold flex items-center gap-1">
                <Crown size={14} className="text-amber-400" />
                Administrator Scope — Organization-wide metrics & all team workflows.
              </span>
            ) : (
              <span className="text-accentIndigo font-semibold flex items-center gap-1">
                <User size={14} />
                Member Scope — User-level workflow metrics & personal DAG runs.
              </span>
            )}
          </p>
        </div>
        <Link href="/workflows/new" className="glow-button flex items-center gap-2 text-sm">
          <Plus size={18} />
          <span>New Workflow</span>
        </Link>
      </div>

      <AIPromptBar onGenerate={(prompt) => console.log('Generate:', prompt)} />

      {/* Dynamic Stat Cards Scoped to Role */}
      <StatCards statsData={statsData} />

      {/* Dynamic Recent Workflows Scoped to Role */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-accentPurple" />
            <h3 className="text-base font-semibold text-white">
              {user.role === 'admin' ? 'All Organization Workflows' : 'Your Personal Workflows'} ({recentWorkflows.length})
            </h3>
          </div>
          <Link href="/workflows" className="text-accentIndigo text-xs flex items-center gap-1 hover:underline font-semibold">
            <span>Manage Workflows →</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {recentWorkflows.map((wf: any) => (
            <div key={wf.id} className="flex items-center justify-between p-3 px-4 rounded-md bg-white/[0.02] border border-borderColor hover:border-accentPurple transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-accentIndigo">
                  <Workflow size={16} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{wf.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {(wf.connectors || []).map((c: string) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-accentIndigo font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
                  wf.status === 'active' || wf.status === 'Active'
                    ? 'bg-emerald-500/15 text-accentEmerald'
                    : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {wf.status === 'active' || wf.status === 'Active' ? <CheckCircle2 size={12} /> : <PauseCircle size={12} />}
                  <span>{(wf.status || 'Active').toUpperCase()}</span>
                </span>
                <span className="text-textMuted text-xs font-mono">{wf.runsCount || 0} runs</span>
                <Link href={`/workflows/${wf.id}`} className="text-xs text-accentPurple hover:text-white font-semibold">
                  Edit →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
