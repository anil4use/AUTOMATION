'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Workflow, Cpu, Activity, Sparkles, Settings } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/ai-agent', label: 'AI Agent Generator', icon: Sparkles },
  { href: '/connectors', label: 'Integrations SDK', icon: Cpu },
  { href: '/executions', label: 'Execution Logs', icon: Activity },
  { href: '/settings', label: 'Settings & Plans', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-bgSecondary border-r border-borderColor p-6 flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm transition-all duration-150 ${
              isActive
                ? 'text-white bg-indigo-500/15 border border-indigo-500/30 font-semibold'
                : 'text-textSecondary hover:text-white hover:bg-white/5 border border-transparent font-normal'
            }`}
          >
            <Icon size={18} className={isActive ? 'text-accentIndigo' : 'text-textSecondary'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
