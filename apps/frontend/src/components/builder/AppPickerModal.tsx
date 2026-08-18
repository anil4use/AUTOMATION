'use client';
import React, { useState } from 'react';
import { Search, Mail, MessageSquare, Table, Sparkles, HardDrive, FileText, CreditCard, Send, Globe, Clock, X, Home, Cpu, Sliders, Wrench, Layers } from 'lucide-react';
import { Heading, Text } from '@/components/ui';

export interface AppOption {
  id: string;
  name: string;
  category: string;
  type: string;
  icon: any;
  operation: string;
}

export const availableApps: AppOption[] = [
  { id: 'gmail', name: 'Gmail', category: 'Communication', type: 'action', icon: Mail, operation: 'send_email' },
  { id: 'slack', name: 'Slack', category: 'Communication', type: 'action', icon: MessageSquare, operation: 'send_message' },
  { id: 'google-sheets', name: 'Google Sheets', category: 'Productivity', type: 'action', icon: Table, operation: 'append_row' },
  { id: 'google-drive', name: 'Google Drive', category: 'Storage', type: 'action', icon: HardDrive, operation: 'upload_file' },
  { id: 'notion', name: 'Notion Workspace', category: 'Database', type: 'action', icon: FileText, operation: 'create_page' },
  { id: 'stripe', name: 'Stripe Payments', category: 'Finance', type: 'action', icon: CreditCard, operation: 'create_customer' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Messaging', type: 'action', icon: Send, operation: 'send_message' },
  { id: 'http-request', name: 'Webhook / REST API', category: 'Developer Tools', type: 'action', icon: Globe, operation: 'custom_api_call' },
  { id: 'ai-agent', name: 'AI Processor Node', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'summarize_text' },
];

export function AppPickerModal({
  isOpen,
  onClose,
  onSelectApp,
  title = 'Select Next Connected App Step',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (app: AppOption) => void;
  title?: string;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Home');

  if (!isOpen) return null;

  const categories = [
    { id: 'Home', icon: Home },
    { id: 'Apps', icon: Cpu },
    { id: 'AI', icon: Sparkles },
    { id: 'Flow controls', icon: Sliders },
    { id: 'Utilities', icon: Wrench },
    { id: 'Products', icon: Layers },
  ];

  const filteredApps = availableApps.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-4xl bg-bgSecondary border border-borderColor rounded-xl shadow-2xl overflow-hidden flex h-[620px]">
        {/* Left Category Sidebar */}
        <div className="w-48 bg-bgPrimary border-r border-borderColor p-4 flex flex-col gap-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accentPurple text-white shadow-glow'
                    : 'text-textSecondary hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span>{cat.id}</span>
              </button>
            );
          })}
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto relative">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 text-textMuted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Search Header */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-3.5 text-textMuted" size={18} />
            <input
              type="text"
              placeholder="Search 9,000+ apps and tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bgPrimary border border-borderColor rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-accentPurple shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-6">
            {/* Top Apps Section */}
            <div>
              <div className="text-xs font-bold uppercase text-textMuted tracking-wider mb-3">
                Your top apps
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filteredApps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      onClick={() => onSelectApp(app)}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-borderColor hover:border-accentPurple hover:bg-white/[0.08] text-left flex items-center gap-3.5 transition-all group shadow-sm"
                    >
                      <div className="p-2.5 rounded-lg bg-indigo-500/15 text-accentIndigo group-hover:scale-110 transition-transform">
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white group-hover:text-accentPurple transition-colors">
                          {app.name}
                        </div>
                        <div className="text-[10px] text-textMuted">{app.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Popular Built-in Tools Section */}
            <div>
              <div className="text-xs font-bold uppercase text-textMuted tracking-wider mb-3">
                Popular built-in tools
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    onSelectApp({
                      id: 'ai-agent',
                      name: 'AI by AutoFlow',
                      category: 'AI Native',
                      type: 'ai-agent',
                      icon: Sparkles,
                      operation: 'summarize_text',
                    })
                  }
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-borderColor hover:border-accentPurple hover:bg-white/[0.08] text-left flex items-center gap-3.5 transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-purple-500/15 text-accentPurple group-hover:scale-110 transition-transform">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white">AI by AutoFlow</div>
                    <div className="text-[10px] text-textMuted">LLM Summarizer & Extractor</div>
                  </div>
                </button>

                <button
                  onClick={() =>
                    onSelectApp({
                      id: 'http-request',
                      name: 'Webhooks by AutoFlow',
                      category: 'Developer Tools',
                      type: 'action',
                      icon: Globe,
                      operation: 'custom_api_call',
                    })
                  }
                  className="p-3.5 rounded-xl bg-white/[0.03] border border-borderColor hover:border-accentPurple hover:bg-white/[0.08] text-left flex items-center gap-3.5 transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 text-accentEmerald group-hover:scale-110 transition-transform">
                    <Globe size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-white">Webhooks by AutoFlow</div>
                    <div className="text-[10px] text-textMuted">Custom REST API HTTP Calls</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
