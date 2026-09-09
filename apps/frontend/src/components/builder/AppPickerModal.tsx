'use client';
import React, { useState, useEffect } from 'react';
import {
  Search, Mail, MessageSquare, Table, Sparkles, HardDrive, FileText,
  CreditCard, Send, Globe, Clock, X, Home, Cpu, Sliders, Wrench, Layers,
  Database, Server, Cloud, Code, Phone, ShieldCheck, Box, BarChart, Calendar, CheckSquare
} from 'lucide-react';
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
  // Google Suite
  { id: 'gmail', name: 'Gmail', category: 'Google Suite', type: 'action', icon: Mail, operation: 'send_email' },
  { id: 'google-sheets', name: 'Google Sheets', category: 'Google Suite', type: 'action', icon: Table, operation: 'append_row' },
  { id: 'google-drive', name: 'Google Drive', category: 'Google Suite', type: 'action', icon: HardDrive, operation: 'upload_file' },
  { id: 'google-calendar', name: 'Google Calendar', category: 'Google Suite', type: 'action', icon: Calendar, operation: 'create_event' },
  { id: 'google-docs', name: 'Google Docs', category: 'Google Suite', type: 'action', icon: FileText, operation: 'create_doc' },

  // Communication & Messaging
  { id: 'slack', name: 'Slack', category: 'Communication', type: 'action', icon: MessageSquare, operation: 'send_message' },
  { id: 'discord', name: 'Discord Bot', category: 'Communication', type: 'action', icon: MessageSquare, operation: 'post_embed' },
  { id: 'telegram', name: 'Telegram Bot', category: 'Communication', type: 'action', icon: Send, operation: 'send_message' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Communication', type: 'action', icon: Send, operation: 'send_template' },
  { id: 'outlook', name: 'Microsoft Outlook', category: 'Communication', type: 'action', icon: Mail, operation: 'send_email' },
  { id: 'ms-teams', name: 'Microsoft Teams', category: 'Communication', type: 'action', icon: MessageSquare, operation: 'post_channel' },
  { id: 'twilio', name: 'Twilio SMS', category: 'Communication', type: 'action', icon: Phone, operation: 'send_sms' },
  { id: 'zoom', name: 'Zoom Meetings', category: 'Communication', type: 'action', icon: Calendar, operation: 'create_meeting' },

  // AI Suite
  { id: 'ai-agent', name: 'AutoFlow AI Analyst', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'summarize_text' },
  { id: 'openai', name: 'OpenAI GPT-4o', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'chat_completion' },
  { id: 'anthropic', name: 'Anthropic Claude 3.5', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'claude_prompt' },
  { id: 'gemini', name: 'Google Gemini 2.0', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'gemini_flash' },
  { id: 'groq', name: 'Groq Llama 3 (Sub-Second)', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'fast_chat' },
  { id: 'elevenlabs', name: 'ElevenLabs Speech AI', category: 'AI Native', type: 'action', icon: Sparkles, operation: 'text_to_speech' },
  { id: 'huggingface', name: 'Hugging Face Inference', category: 'AI Native', type: 'action', icon: Cpu, operation: 'model_predict' },

  // Developer Tools & Universal Protocols
  { id: 'web-browser', name: 'Web Browser Automation (Playwright)', category: 'Developer Tools', type: 'action', icon: Globe, operation: 'browser_navigate' },
  { id: 'web-search', name: 'Web Search & Scraper', category: 'Developer Tools', type: 'action', icon: Search, operation: 'search_web' },
  { id: 'http-request', name: 'HTTP Request Call', category: 'Developer Tools', type: 'action', icon: Globe, operation: 'custom_api_call' },
  { id: 'webhooks', name: 'Inbound Webhook', category: 'Developer Tools', type: 'trigger', icon: Code, operation: 'catch_hook' },
  { id: 'rest-api', name: 'REST API Connector', category: 'Developer Tools', type: 'action', icon: Globe, operation: 'execute_rest' },
  { id: 'graphql', name: 'GraphQL Query Client', category: 'Developer Tools', type: 'action', icon: Code, operation: 'query_graphql' },

  // Databases & Infrastructure
  { id: 'postgresql', name: 'PostgreSQL', category: 'Databases', type: 'action', icon: Database, operation: 'sql_query' },
  { id: 'mysql', name: 'MySQL Database', category: 'Databases', type: 'action', icon: Database, operation: 'sql_query' },
  { id: 'mongodb', name: 'MongoDB Atlas', category: 'Databases', type: 'action', icon: Database, operation: 'insert_document' },
  { id: 'redis', name: 'Redis Cache', category: 'Databases', type: 'action', icon: Server, operation: 'cache_get_set' },
  { id: 'supabase', name: 'Supabase Database', category: 'Databases', type: 'action', icon: Database, operation: 'query_table' },
  { id: 'firebase', name: 'Firebase Firestore', category: 'Databases', type: 'action', icon: Database, operation: 'store_doc' },
  { id: 'aws-s3', name: 'AWS S3 Storage', category: 'Databases', type: 'action', icon: Cloud, operation: 'put_object' },
  { id: 'bigquery', name: 'Google BigQuery', category: 'Databases', type: 'action', icon: BarChart, operation: 'run_query' },

  // CRM & Sales
  { id: 'hubspot', name: 'HubSpot CRM', category: 'CRM & Sales', type: 'action', icon: Layers, operation: 'create_contact' },
  { id: 'salesforce', name: 'Salesforce', category: 'CRM & Sales', type: 'action', icon: ShieldCheck, operation: 'create_lead' },

  // Finance & E-Commerce
  { id: 'stripe', name: 'Stripe Payments', category: 'Finance', type: 'action', icon: CreditCard, operation: 'create_customer' },
  { id: 'razorpay', name: 'Razorpay (India)', category: 'Finance', type: 'action', icon: CreditCard, operation: 'create_payment_link' },
  { id: 'shopify', name: 'Shopify Store', category: 'E-Commerce', type: 'action', icon: Box, operation: 'get_order' },
  { id: 'amazon-flipkart', name: 'Amazon & Flipkart', category: 'E-Commerce', type: 'action', icon: Box, operation: 'search_products' },

  // Code Repositories
  { id: 'github', name: 'GitHub Repositories', category: 'Developer Tools', type: 'action', icon: Code, operation: 'create_issue' },
  { id: 'gitlab', name: 'GitLab CI/CD', category: 'Developer Tools', type: 'action', icon: Code, operation: 'trigger_pipeline' },

  // Email Marketing
  { id: 'sendgrid', name: 'SendGrid Email API', category: 'Marketing', type: 'action', icon: Mail, operation: 'send_mail' },
  { id: 'mailchimp', name: 'Mailchimp', category: 'Marketing', type: 'action', icon: Mail, operation: 'add_subscriber' },
  { id: 'resend', name: 'Resend Email API', category: 'Marketing', type: 'action', icon: Mail, operation: 'send_transactional' },

  // Productivity & Project Management
  { id: 'notion', name: 'Notion Workspace', category: 'Productivity', type: 'action', icon: FileText, operation: 'create_page' },
  { id: 'airtable', name: 'Airtable Base', category: 'Productivity', type: 'action', icon: Table, operation: 'add_record' },
  { id: 'jira', name: 'Jira Software', category: 'Productivity', type: 'action', icon: CheckSquare, operation: 'create_issue' },
  { id: 'linear', name: 'Linear App', category: 'Productivity', type: 'action', icon: CheckSquare, operation: 'create_ticket' },
  { id: 'clickup', name: 'ClickUp Tasks', category: 'Productivity', type: 'action', icon: CheckSquare, operation: 'create_task' },
  { id: 'trello', name: 'Trello Boards', category: 'Productivity', type: 'action', icon: Layers, operation: 'create_card' },

  // Analytics & Forms
  { id: 'google-analytics', name: 'Google Analytics 4', category: 'Analytics', type: 'action', icon: BarChart, operation: 'get_metrics' },
  { id: 'calendly', name: 'Calendly Bookings', category: 'Productivity', type: 'trigger', icon: Calendar, operation: 'invitee_created' },
  { id: 'typeform', name: 'Typeform Forms', category: 'Productivity', type: 'trigger', icon: FileText, operation: 'form_submitted' },
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
    // Merge static 50-app suite with backend dynamic connector manifests
    async function fetchBackendConnectors() {
      try {
        const res = await apiClient.get('/v1/connectors/available');
        if (res.data?.data && Array.isArray(res.data.data)) {
          const manifests = res.data.data;
          const backendIds = new Set(manifests.map((m: any) => m.id));

          const merged: AppOption[] = [...availableApps];
          manifests.forEach((m: any) => {
            if (!availableApps.some((a) => a.id === m.id)) {
              merged.push({
                id: m.id,
                name: m.name,
                category: m.category || 'Integrations',
                type: m.id === 'ai-agent' ? 'ai-agent' : 'action',
                icon: Cpu,
                operation: m.actions?.[0]?.id || 'execute',
              });
            }
          });
          setAppsList(merged);
        }
      } catch (err) {
        setAppsList(availableApps);
      }
    }
    fetchBackendConnectors();
  }, []);

  if (!isOpen) return null;

  const categories = [
    { id: 'Home', icon: Home },
    { id: 'Google Suite', icon: Mail },
    { id: 'Communication', icon: MessageSquare },
    { id: 'AI Native', icon: Sparkles },
    { id: 'Developer Tools', icon: Code },
    { id: 'Databases', icon: Database },
    { id: 'Productivity', icon: FileText },
    { id: 'Finance', icon: CreditCard },
  ];

  const filteredApps = appsList.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase());
    if (activeCategory === 'Home') return matchesSearch;
    return matchesSearch && a.category === activeCategory;
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="w-full max-w-4xl bg-bgSecondary border border-borderColor rounded-xl shadow-2xl overflow-hidden flex h-[620px]">
        {/* Left Category Sidebar */}
        <div className="w-52 bg-bgPrimary border-r border-borderColor p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-textMuted font-mono mb-2 px-3">
            Categories ({categories.length})
          </div>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accentPurple text-white shadow-glow'
                    : 'text-textMuted hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span className="truncate">{cat.id}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content & App Grid */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Header & Search Bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <Heading as="h2" className="text-base">{title}</Heading>
              <Text variant="secondary" className="text-xs">
                Select from our <strong className="text-white">50+ Tier-1 Native Apps</strong> & Universal API Plugins.
              </Text>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-textMuted hover:text-white hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="relative mb-4">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              placeholder="Search 50+ integrations (e.g. Gmail, OpenAI, Stripe, Razorpay, GitHub, Postgres)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-bgPrimary border border-borderColor rounded-xl text-xs text-white outline-none focus:border-accentPurple"
              autoFocus
            />
          </div>

          {/* App Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              {filteredApps.map((app) => {
                const Icon = app.icon || Cpu;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      onSelectApp(app);
                      onClose();
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-borderColor/80 bg-white/[0.02] hover:bg-white/[0.08] hover:border-accentPurple/50 text-left transition-all group"
                  >
                    <div className="p-2.5 rounded-lg bg-bgPrimary border border-borderColor text-accentPurple group-hover:scale-110 transition-transform">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-white truncate group-hover:text-accentPurple transition-colors">
                        {app.name}
                      </div>
                      <div className="text-[10px] text-textMuted font-mono truncate">
                        {app.category}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredApps.length === 0 && (
              <div className="py-16 text-center text-textMuted text-xs">
                No app integrations found matching "{search}".<br />
                Use <strong className="text-accentPurple">HTTP Request Call</strong> to connect any REST API!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
