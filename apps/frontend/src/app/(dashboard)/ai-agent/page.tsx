'use client';
import React, { useState } from 'react';
import { AIPromptBar } from '@/components/ai/AIPromptBar';
import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AIAgentPage() {
  const [draft, setDraft] = useState<any>(null);

  const handleGenerate = (prompt: string) => {
    setDraft({
      name: `AI Draft: ${prompt.slice(0, 30)}...`,
      nodesCount: 3,
      connectors: ['Gmail', 'AI Processor Node', 'Slack'],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">AI Prompt-to-Workflow Agent</h1>
        <p className="text-textSecondary text-sm">
          Describe an automation requirement in plain English. The AI agent generates a DAG draft with field mapping.
        </p>
      </div>

      <AIPromptBar onGenerate={handleGenerate} />

      {draft && (
        <div className="glass-card p-6 border-accentPurple">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} className="text-accentPurple" />
            <h3 className="text-lg font-semibold text-white">{draft.name}</h3>
          </div>
          <p className="text-textSecondary text-sm mb-4">
            Generated draft containing {draft.nodesCount} DAG nodes across {draft.connectors.join(', ')}.
          </p>
          <div className="flex gap-3">
            <Link href="/workflows/new" className="glow-button inline-flex items-center gap-2 text-xs">
              <span>Open Canvas & Edit Draft</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
