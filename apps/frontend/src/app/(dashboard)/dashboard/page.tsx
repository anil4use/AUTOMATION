'use client';
import React from 'react';
import { StatCards } from '@/components/dashboard/StatCards';
import { AIPromptBar } from '@/components/ai/AIPromptBar';
import Link from 'next/link';
import { Plus, ArrowUpRight } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Platform Overview</h1>
          <p className="text-textSecondary text-sm">Monitor active workflows and generate AI automations.</p>
        </div>
        <Link href="/workflows/new" className="glow-button flex items-center gap-2 text-sm">
          <Plus size={18} />
          <span>New Workflow</span>
        </Link>
      </div>

      <AIPromptBar onGenerate={(prompt) => console.log('Generate:', prompt)} />

      <StatCards />

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Recent Workflows</h3>
          <Link href="/workflows" className="text-accentIndigo text-xs flex items-center gap-1 hover:underline">
            <span>View All</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {[
            { name: 'Lead Email to Slack Alert', status: 'Active', trigger: 'Gmail', action: 'Slack', lastRun: '2 mins ago' },
            { name: 'WhatsApp Lead to Google Sheets', status: 'Active', trigger: 'WhatsApp', action: 'Google Sheets', lastRun: '15 mins ago' },
            { name: 'Customer Feedback AI Summarizer', status: 'Draft', trigger: 'Form', action: 'AI Processing', lastRun: 'Never' },
          ].map((wf, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 px-4 rounded-md bg-white/[0.02] border border-borderColor">
              <div>
                <div className="font-semibold text-sm text-white">{wf.name}</div>
                <div className="text-textSecondary text-xs">{wf.trigger} → {wf.action}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  wf.status === 'Active' ? 'bg-emerald-500/15 text-accentEmerald' : 'bg-gray-500/15 text-textMuted'
                }`}>
                  {wf.status}
                </span>
                <span className="text-textMuted text-xs">{wf.lastRun}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
