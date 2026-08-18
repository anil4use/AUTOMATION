'use client';
import React, { useState } from 'react';
import { Heading, Text, SectionCard, Button, Badge } from '@/components/ui';
import { Workflow, Plus, ArrowRight, Mail, HardDrive, Table, MessageSquare, CreditCard, FileText, Send } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const [workflows] = useState([
    {
      id: 'wf_101',
      name: 'Gmail Attachment → Google Drive → Google Sheets → Slack Alert',
      desc: 'Save incoming email attachments to Drive, log record to Sheets, and notify Slack.',
      status: 'active',
      connectors: ['Gmail', 'Drive', 'Sheets', 'Slack'],
      runs: 142,
    },
    {
      id: 'wf_102',
      name: 'Stripe Payment Succeeded → Notion DB Page → WhatsApp Contact',
      desc: 'Create Notion record on successful payment and dispatch WhatsApp receipt.',
      status: 'active',
      connectors: ['Stripe', 'Notion', 'WhatsApp'],
      runs: 89,
    },
    {
      id: 'wf_103',
      name: 'WhatsApp Lead → AI Summarizer Node → Google Sheets Row',
      desc: 'Extract key info from WhatsApp inbound chat using AI Node and record to Sheets.',
      status: 'active',
      connectors: ['WhatsApp', 'AI Node', 'Sheets'],
      runs: 230,
    },
  ]);

  const handleUseTemplate = (name: string) => {
    toast.success('Template Loaded into Canvas', {
      description: `Opened multi-app template "${name}" in builder.`,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1">Automation Workflows & Templates</Heading>
          <Text variant="secondary">
            Build multi-app DAG workflows chaining 5+ integrations with AI processing nodes.
          </Text>
        </div>
        <Link href="/workflows/new" className="glow-button inline-flex items-center gap-1.5 text-xs">
          <Plus size={16} />
          <span>+ Create New Workflow</span>
        </Link>
      </div>

      {/* Multi-App Templates Section */}
      <SectionCard className="border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading as="h3">Pre-Built Multi-App Templates</Heading>
            <Text variant="secondary" className="text-xs">
              Instant multi-connector DAG templates with pre-linked field mappings.
            </Text>
          </div>
          <Badge variant="info">4 READY TEMPLATES</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div key={wf.id} className="p-4 rounded-md bg-white/[0.02] border border-borderColor hover:border-accentPurple transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Workflow size={18} className="text-accentPurple" />
                  <span className="font-semibold text-sm text-white">{wf.name}</span>
                </div>
                <Text variant="secondary" className="text-xs mb-3">{wf.desc}</Text>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {wf.connectors.map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-accentIndigo">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-borderColor/60">
                <span className="text-[11px] text-textMuted">{wf.runs} runs executed</span>
                <Link
                  href={`/workflows/${wf.id}`}
                  onClick={() => handleUseTemplate(wf.name)}
                  className="text-xs font-semibold text-accentPurple hover:text-white flex items-center gap-1"
                >
                  <span>Open Template</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
