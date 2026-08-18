'use client';
import React, { useState, useEffect } from 'react';
import { Heading, Text, SectionCard, Button, Badge } from '@/components/ui';
import { Workflow, Plus, ArrowRight, Play, Pause, FileText, Edit, Trash2, Clock, Activity, CheckCircle2, PauseCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export interface WorkflowItem {
  id: string;
  name: string;
  desc: string;
  status: 'active' | 'paused';
  connectors: string[];
  runsCount: number;
  createdAt: string;
  lastRunAt: string;
}

const defaultUserWorkflows: WorkflowItem[] = [
  {
    id: 'wf_101',
    name: 'Gmail Attachment → Google Drive → Google Sheets → Slack Alert',
    desc: 'Save incoming email attachments to Drive, log record to Sheets, and notify Slack.',
    status: 'active',
    connectors: ['AutoFlow Schedule', 'Gmail', 'Google Drive', 'Google Sheets', 'Slack'],
    runsCount: 142,
    createdAt: '2026-08-18 14:30',
    lastRunAt: '2026-08-18 18:10',
  },
  {
    id: 'wf_102',
    name: 'Stripe Payment Succeeded → Notion DB Page → WhatsApp Contact',
    desc: 'Create Notion record on successful payment and dispatch WhatsApp receipt.',
    status: 'active',
    connectors: ['Stripe', 'Notion', 'WhatsApp'],
    runsCount: 89,
    createdAt: '2026-08-18 15:45',
    lastRunAt: '2026-08-18 17:55',
  },
  {
    id: 'wf_103',
    name: 'WhatsApp Lead → AI Summarizer Node → Google Sheets Row',
    desc: 'Extract key info from WhatsApp inbound chat using AI Node and record to Sheets.',
    status: 'paused',
    connectors: ['WhatsApp', 'AI Node', 'Google Sheets'],
    runsCount: 230,
    createdAt: '2026-08-18 16:20',
    lastRunAt: '2026-08-18 16:45',
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>(defaultUserWorkflows);

  // Synchronize from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autoflow_user_workflows');
      if (saved) {
        setWorkflows(JSON.parse(saved));
      } else {
        localStorage.setItem('autoflow_user_workflows', JSON.stringify(defaultUserWorkflows));
      }
    } catch (e) {
      console.error('LocalStorage sync error:', e);
    }
  }, []);

  const saveWorkflowsToStorage = (updated: WorkflowItem[]) => {
    setWorkflows(updated);
    try {
      localStorage.setItem('autoflow_user_workflows', JSON.stringify(updated));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  };

  const handleToggleStatus = (id: string) => {
    const updated = workflows.map((wf) => {
      if (wf.id === id) {
        const nextStatus: 'active' | 'paused' = wf.status === 'active' ? 'paused' : 'active';
        toast.info(`Workflow ${nextStatus === 'active' ? 'Activated & Running' : 'Stopped & Paused'}`, {
          description: `Workflow #${id} status changed to ${nextStatus.toUpperCase()}.`,
        });
        return { ...wf, status: nextStatus };
      }
      return wf;
    });
    saveWorkflowsToStorage(updated);
  };

  const handleTestRun = (wf: WorkflowItem) => {
    toast.success(`Triggered Test Run for ${wf.name}`, {
      description: `Dispatched execution job to Upstash Redis BullMQ worker queue.`,
    });
    const updated = workflows.map((item) =>
      item.id === wf.id
        ? { ...item, runsCount: item.runsCount + 1, lastRunAt: 'Just now' }
        : item
    );
    saveWorkflowsToStorage(updated);
  };

  const handleDelete = (id: string) => {
    const updated = workflows.filter((wf) => wf.id !== id);
    saveWorkflowsToStorage(updated);
    toast.error(`Workflow Removed`, { description: `Deleted workflow #${id} permanently.` });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Automation Workflows & Management</Heading>
          <Text variant="secondary">
            Manage your created automation DAGs, monitor execution status, and toggle workflow start/stop rules.
          </Text>
        </div>
        <Link href="/workflows/new" className="glow-button inline-flex items-center gap-1.5 text-xs">
          <Plus size={16} />
          <span>+ Create New Workflow</span>
        </Link>
      </div>

      {/* User Created Workflows Management Section */}
      <SectionCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-borderColor bg-bgSecondary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-accentPurple" />
            <Heading as="h3" className="text-sm">Your Created Workflows ({workflows.length})</Heading>
          </div>
          <Badge variant="active">LIVE WORKFLOW ENGINE</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-borderColor text-textMuted text-xs uppercase tracking-wider bg-white/[0.01]">
                <th className="p-3.5 pl-4">Workflow Name & Details</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Integrations</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5">Runs</th>
                <th className="p-3.5 text-right pr-4">Actions & Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderColor">
              {workflows.map((wf) => (
                <tr key={wf.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3.5 pl-4">
                    <div className="font-semibold text-white text-xs mb-0.5">{wf.name}</div>
                    <div className="text-[11px] text-textMuted max-w-md truncate">{wf.desc}</div>
                  </td>

                  {/* Status Toggle Switch */}
                  <td className="p-3.5">
                    <button
                      onClick={() => handleToggleStatus(wf.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        wf.status === 'active'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-accentEmerald hover:bg-emerald-500/25'
                          : 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                      }`}
                      title={wf.status === 'active' ? 'Click to Stop / Pause Workflow' : 'Click to Activate Workflow'}
                    >
                      {wf.status === 'active' ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>RUNNING</span>
                        </>
                      ) : (
                        <>
                          <PauseCircle size={13} />
                          <span>PAUSED</span>
                        </>
                      )}
                    </button>
                  </td>

                  {/* Connected Integrations Badges */}
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {wf.connectors.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-accentIndigo">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-3.5 text-xs text-textMuted whitespace-nowrap">
                    <div>{wf.createdAt}</div>
                    <div className="text-[10px] text-textMuted">Last: {wf.lastRunAt}</div>
                  </td>

                  <td className="p-3.5 text-xs font-mono text-textSecondary whitespace-nowrap">
                    {wf.runsCount} runs
                  </td>

                  {/* Action Controls */}
                  <td className="p-3.5 text-right pr-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Start / Stop Toggle Icon */}
                      <button
                        onClick={() => handleToggleStatus(wf.id)}
                        className={`p-1.5 rounded transition-colors ${
                          wf.status === 'active'
                            ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/30'
                            : 'bg-emerald-500/15 text-accentEmerald hover:bg-emerald-500/30'
                        }`}
                        title={wf.status === 'active' ? 'Stop Workflow' : 'Start Workflow'}
                      >
                        {wf.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                      </button>

                      {/* Test Run Trigger */}
                      <button
                        onClick={() => handleTestRun(wf)}
                        className="p-1.5 bg-indigo-500/15 text-accentIndigo hover:bg-indigo-500/30 rounded transition-colors"
                        title="Test Execution Run"
                      >
                        <Activity size={14} />
                      </button>

                      {/* View Logs Link */}
                      <Link
                        href={`/executions?workflowId=${wf.id}`}
                        className="p-1.5 bg-white/5 text-textSecondary hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="View Execution Logs"
                      >
                        <FileText size={14} />
                      </Link>

                      {/* Edit Builder Link */}
                      <Link
                        href={`/workflows/${wf.id}`}
                        className="p-1.5 bg-white/5 text-textSecondary hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Edit Workflow Canvas"
                      >
                        <Edit size={14} />
                      </Link>

                      {/* Delete Workflow */}
                      <button
                        onClick={() => handleDelete(wf.id)}
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
      </SectionCard>
    </div>
  );
}
