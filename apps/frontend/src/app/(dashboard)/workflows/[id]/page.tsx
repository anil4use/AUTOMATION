'use client';
import React from 'react';
import { WorkflowCanvas } from '@/components/builder/WorkflowCanvas';
import { NodePalette } from '@/components/builder/NodePalette';
import { FieldMapper } from '@/components/builder/FieldMapper';
import { Play, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WorkflowBuilderPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col h-[calc(100vh-112px)] -m-6">
      {/* Builder Header */}
      <div className="h-14 border-b border-borderColor bg-bgSecondary flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Link href="/workflows" className="text-textSecondary hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <span className="font-semibold text-sm text-white">
            {params.id === 'new' ? 'New Automation Workflow' : `Workflow #${params.id}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="glass-card px-3.5 py-1.5 text-xs flex items-center gap-1.5 hover:bg-white/5">
            <Play size={14} className="text-accentEmerald" />
            <span>Test Run</span>
          </button>
          <button className="glow-button px-4 py-1.5 text-xs flex items-center gap-1.5">
            <Save size={14} />
            <span>Save Workflow</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <WorkflowCanvas />
        <FieldMapper />
      </div>
    </div>
  );
}
