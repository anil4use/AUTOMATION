'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Heading, Text, SectionCard, Badge } from '@/components/ui';
import {
  Workflow, Plus, Play, Pause, FileText, Edit, Trash2,
  Activity, CheckCircle2, PauseCircle, Loader2, RefreshCw,
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
        description: `Job ${res.data.data?.jobId || ''} dispatched to BullMQ worker queue.`,
      });
    } catch (err: any) {
      toast.error('Test Run Failed', {
        description: err?.response?.data?.message || 'Could not dispatch job.',
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Automation Workflows</Heading>
          <Text variant="secondary">
            Manage workflows for <strong className="text-white">{user.email}</strong> — data from MongoDB Atlas.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkflows}
            className="p-2 rounded-lg bg-white/5 border border-borderColor text-textMuted hover:text-white transition-colors"
            title="Refresh"
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
          <Badge variant="active">LIVE · MONGODB</Badge>
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
                  <th className="p-3.5 pl-4">Workflow Name</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created At</th>
                  <th className="p-3.5">Updated</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderColor">
                {workflows.map((wf) => (
                  <tr key={wf._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-semibold text-white text-xs mb-0.5">{wf.name}</div>
                      <div className="text-[11px] text-textMuted max-w-md truncate">
                        {wf.description || 'No description'}
                      </div>
                    </td>

                    <td className="p-3.5">
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

                    <td className="p-3.5 text-xs text-textMuted whitespace-nowrap">
                      {new Date(wf.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5 text-xs text-textMuted whitespace-nowrap">
                      {new Date(wf.updatedAt).toLocaleDateString()}
                    </td>

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
                          title="Dispatch Test Run to BullMQ"
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
                          className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete Workflow"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
