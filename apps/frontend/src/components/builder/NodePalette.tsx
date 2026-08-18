'use client';
import React from 'react';
import { Mail, MessageSquare, Table, Sparkles } from 'lucide-react';

const availableNodes = [
  { id: 'gmail', name: 'Gmail', icon: Mail, type: 'Communication' },
  { id: 'slack', name: 'Slack', icon: MessageSquare, type: 'Communication' },
  { id: 'google-sheets', name: 'Google Sheets', icon: Table, type: 'Productivity' },
  { id: 'ai-agent', name: 'AI Processor', icon: Sparkles, type: 'AI' },
];

export function NodePalette() {
  return (
    <div className="w-64 border-r border-borderColor bg-bgSecondary p-4">
      <h4 className="text-xs uppercase text-textMuted font-semibold mb-4 tracking-wider">
        Connector SDK Palette
      </h4>
      <div className="flex flex-col gap-2.5">
        {availableNodes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.id}
              className="glass-card p-3 flex items-center gap-3 cursor-grab hover:scale-[1.02] transition-transform"
            >
              <div className="p-2 rounded bg-indigo-500/10">
                <Icon size={18} className="text-accentPurple" />
              </div>
              <div>
                <div className="text-sm font-semibold text-textPrimary">{node.name}</div>
                <div className="text-xs text-textSecondary">{node.type}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
