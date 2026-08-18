'use client';
import React, { useState } from 'react';
import { AIPromptBar } from '@/components/ai/AIPromptBar';
import { Heading, Text, SectionCard, Button, Badge } from '@/components/ui';
import { Sparkles, ArrowRight, AlertTriangle, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function AIAgentPage() {
  const [draft, setDraft] = useState<any>(null);
  const [clarification, setClarification] = useState<string | null>(null);
  const [missingConnectors, setMissingConnectors] = useState<string[]>([]);
  const [clarificationInput, setClarificationInput] = useState('');

  const handleGenerate = (promptText: string) => {
    const isAmbiguous = promptText.toLowerCase().includes('notify me') && !promptText.toLowerCase().includes('slack') && !promptText.toLowerCase().includes('email');
    
    if (isAmbiguous) {
      setClarification('Which channel or app would you like to receive notifications on? (e.g., Slack channel or Email address)');
      setDraft(null);
      return;
    }

    setClarification(null);
    setMissingConnectors(['slack', 'gmail']);
    setDraft({
      name: `AI Draft: ${promptText.slice(0, 35)}...`,
      nodesCount: 3,
      connectors: ['Gmail Trigger', 'AI Processor Node', 'Slack Action'],
    });
  };

  const handleAnswerClarification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationInput) return;
    handleGenerate(`Notify me on ${clarificationInput}`);
    setClarificationInput('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading as="h1">AI Prompt-to-Workflow Agent</Heading>
        <Text variant="secondary">
          Describe an automation requirement in plain English. The AI agent generates a DAG draft with field mapping.
        </Text>
      </div>

      <AIPromptBar onGenerate={handleGenerate} />

      {/* Ambiguity Clarification Chat Loop */}
      {clarification && (
        <SectionCard className="border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={18} className="text-accentAmber" />
            <Heading as="h4" className="text-accentAmber">AI Follow-Up Clarification Needed</Heading>
          </div>
          <Text variant="secondary" className="mb-4">{clarification}</Text>
          <form onSubmit={handleAnswerClarification} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Post to Slack #leads channel"
              value={clarificationInput}
              onChange={(e) => setClarificationInput(e.target.value)}
              className="flex-1 bg-bgSecondary border border-borderColor rounded px-3 py-2 text-sm text-white outline-none focus:border-accentAmber"
            />
            <Button type="submit">Submit Answer</Button>
          </form>
        </SectionCard>
      )}

      {/* Generated Draft Result */}
      {draft && (
        <SectionCard className="border-accentPurple">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-accentPurple" />
              <Heading as="h3">{draft.name}</Heading>
            </div>
            <Badge variant="info">Generated Draft</Badge>
          </div>

          <Text variant="secondary" className="mb-4">
            Generated draft containing {draft.nodesCount} DAG nodes across {draft.connectors.join(' → ')}.
          </Text>

          {/* Missing Accounts Connection Alert */}
          {missingConnectors.length > 0 && (
            <div className="p-3.5 rounded-md bg-amber-500/10 border border-amber-500/30 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-accentAmber">
                <AlertTriangle size={16} />
                <span>Unauthenticated Connectors Flagged: {missingConnectors.join(', ').toUpperCase()}</span>
              </div>
              <Link href="/connectors" className="text-xs font-semibold text-accentAmber underline hover:text-white">
                Connect Accounts Now →
              </Link>
            </div>
          )}

          <div className="flex gap-3">
            <Link href="/workflows/new" className="glow-button inline-flex items-center gap-2 text-xs">
              <span>Open Canvas & Activate Draft</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
