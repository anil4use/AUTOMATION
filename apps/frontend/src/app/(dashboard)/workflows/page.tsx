'use client';
import React from 'react';
import Link from 'next/link';
import { Plus, Workflow, Play } from 'lucide-react';

export default function WorkflowsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Workflows</h1>
          <p className="text-textSecondary text-sm">Manage and trigger your platform automations.</p>
        </div>
        <Link href="/workflows/new" className="glow-button flex items-center gap-2 text-sm">
          <Plus size={18} />
          <span>Create Workflow</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { id: '1', name: 'Gmail to Slack Notifications', status: 'active', desc: 'Triggers on new emails and posts formatted alert to Slack #general.' },
          { id: '2', name: 'Sheet Row AI Extractor', status: 'active', desc: 'Summarizes new Google Sheet rows using AI Processing Node.' },
          { id: '3', name: 'Support Email Escalation', status: 'draft', desc: 'Draft workflow for auto-reply and Slack escalation.' },
        ].map((wf) => (
          <div key={wf.id} className="glass-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Workflow size={20} className="text-accentPurple" />
                <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                  wf.status === 'active' ? 'bg-emerald-500/15 text-accentEmerald' : 'bg-amber-500/15 text-accentAmber'
                }`}>
                  {wf.status}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{wf.name}</h3>
              <p className="text-textSecondary text-xs mb-4">{wf.desc}</p>
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              <Link href={`/workflows/${wf.id}`} className="glow-button flex-1 text-center py-2 text-xs">
                Edit Builder
              </Link>
              <button className="glass-card p-2 bg-white/5 hover:bg-white/10">
                <Play size={14} className="text-accentEmerald" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
