'use client';
import React, { useState } from 'react';
import { Search, Mail, MessageSquare, Table, Sparkles, Cpu } from 'lucide-react';
import { Heading, Text, Badge } from '@/components/ui';

export function NodePalette() {
  const [search, setSearch] = useState('');

  const connectors = [
    { id: 'gmail', name: 'Gmail', category: 'Communication', type: 'trigger', icon: Mail, operations: ['new_email', 'send_email'] },
    { id: 'slack', name: 'Slack', category: 'Communication', type: 'action', icon: MessageSquare, operations: ['send_message', 'post_channel'] },
    { id: 'google-sheets', name: 'Google Sheets', category: 'Productivity', type: 'trigger', icon: Table, operations: ['new_row', 'append_row'] },
    { id: 'ai-agent', name: 'AI Processor Node', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operations: ['summarize_text', 'extract_data'] },
  ];

  const filtered = connectors.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const onDragStart = (event: React.DragEvent, connector: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(connector));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 border-r border-borderColor bg-bgSecondary flex flex-col p-4">
      <div className="mb-4">
        <Heading as="h4" className="mb-1">Connector Palette</Heading>
        <Text variant="muted">Drag and drop onto canvas to extend workflow DAG.</Text>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 text-textMuted" size={14} />
        <input
          type="text"
          placeholder="Search connectors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-bgPrimary border border-borderColor rounded pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-accentPurple"
        />
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
        {filtered.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              draggable
              onDragStart={(e) => onDragStart(e, c)}
              className="p-3 rounded-md bg-white/[0.02] border border-borderColor hover:border-accentPurple hover:bg-white/[0.05] cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-indigo-500/15 text-accentIndigo">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">{c.name}</div>
                  <div className="text-[10px] text-textMuted">{c.category}</div>
                </div>
              </div>
              <Badge variant={c.type === 'trigger' ? 'active' : c.type === 'ai-agent' ? 'info' : 'draft'}>
                {c.type === 'trigger' ? 'TRIG' : c.type === 'ai-agent' ? 'AI' : 'ACT'}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
