'use client';
import React, { useState, useEffect } from 'react';
import { Search, Mail, MessageSquare, Table, Sparkles, HardDrive, FileText, CreditCard, Send, Globe, Clock, X, Home, Cpu, Sliders, Wrench, Layers } from 'lucide-react';
import { Heading, Text } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export interface AppOption {
  id: string;
  name: string;
  category: string;
  type: string;
  icon: any;
  operation: string;
}

export const availableApps: AppOption[] = [
  { id: 'web-search', name: 'Web Search & Scraper', category: 'Data & Search', type: 'action', icon: Search, operation: 'search_web' },
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
  const [appsList, setAppsList] = useState<AppOption[]>(availableApps);

  useEffect(() => {
    // Dynamically query backend Express API for registered connector manifests
    async function fetchBackendConnectors() {
      try {
        const res = await apiClient.get('/v1/connectors/available');
        if (res.data?.data && Array.isArray(res.data.data)) {
          const manifests = res.data.data;
          const mapped: AppOption[] = manifests.map((m: any) => ({
            id: m.id,
            name: m.name,
            category: m.category || 'General',
            type: m.id === 'ai-agent' ? 'ai-agent' : 'action',
            icon: m.id === 'web-search' ? Search : m.id === 'gmail' ? Mail : m.id === 'slack' ? MessageSquare : m.id === 'google-sheets' ? Table : m.id === 'ai-agent' ? Sparkles : Cpu,
            operation: m.actions?.[0]?.id || 'execute',
          }));
          setAppsList(mapped);
        }
      } catch (err) {
        // Fallback to static array
        setAppsList(availableApps);
      }
    }
    fetchBackendConnectors();
  }, []);

  if (!isOpen) return null;

  const categories = [
    { id: 'Home', icon: Home },
    { id: 'Apps', icon: Cpu },
    { id: 'AI', icon: Sparkles },
    { id: 'Flow controls', icon: Sliders },
    { id: 'Utilities', icon: Wrench },
    { id: 'Products', icon: Layers },
  ];

  const filteredApps = appsList.filter((a) =>
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
                    : 'text-textMuted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                <span>{cat.id}</span>
              </button>
            );
          })}
        </div>

        {/* Right App Grid Area */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-4">
            <Heading as="h3">{title}</Heading>
            <button onClick={onClose} className="text-textMuted hover:text-white p-1 rounded-md transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="relative mb-6">
            <Search size={18} className="absolute left-3.5 top-3 text-textMuted" />
            <input
              type="text"
              placeholder="Search 9,000+ apps and tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bgPrimary border border-borderColor rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple transition-colors"
            />
          </div>

          {/* App Cards Section */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="text-xs text-textMuted font-semibold tracking-wider uppercase mb-3">YOUR TOP APPS ({filteredApps.length})</div>
            <div className="grid grid-cols-2 gap-3.5 mb-6">
              {filteredApps.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      onSelectApp(app);
                      onClose();
                    }}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-borderColor hover:border-accentPurple hover:bg-purple-500/10 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-accentIndigo group-hover:scale-105 transition-transform">
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-white group-hover:text-accentPurple transition-colors">{app.name}</div>
                      <div className="text-xs text-textMuted">{app.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
