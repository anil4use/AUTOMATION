'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, FileText, Settings2, Activity } from 'lucide-react';

const tabs = [
  { href: '/ai-control-plane/providers', label: 'Providers & Models', icon: Database },
  { href: '/ai-control-plane/prompts', label: 'Prompts & Templates', icon: FileText },
  { href: '/ai-control-plane/tasks', label: 'Task Configs & Routing', icon: Settings2 },
  { href: '/ai-control-plane/logs', label: 'Execution Logs', icon: Activity },
];

export default function AIControlPlaneLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0C10] relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative px-8 pt-8 pb-6 border-b border-white/10 z-10 bg-white/[0.02] backdrop-blur-xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Settings2 className="text-indigo-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              AI Control Plane
            </h1>
            <p className="text-textMuted text-sm mt-1 font-medium">
              Centralized orchestration, model routing, and prompt management across all AI features.
            </p>
          </div>
        </div>

        {/* Tabs as floating pills */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const isActive = pathname?.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-[0_4px_12px_rgba(99,102,241,0.1)]'
                    : 'text-textSecondary hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-textMuted'} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar p-8">
        {children}
      </div>
    </div>
  );
}
