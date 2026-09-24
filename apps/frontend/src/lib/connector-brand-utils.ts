import React from 'react';
import {
  Sparkles, Cpu, Database, Globe, Mail, MessageSquare, Code, CreditCard,
  HardDrive, FileText, Layers, Bot, Zap, PhoneCall, Send, Building, Cloud,
  Table, Flame, ShieldCheck, Terminal, Workflow, LucideIcon
} from 'lucide-react';

export interface BrandSpec {
  icon: LucideIcon;
  color: string;
  bgGlow: string;
  borderGlow: string;
  textColor: string;
  badgeBg: string;
  badgeBorder: string;
}

const COLOR_PALETTES: Record<string, Omit<BrandSpec, 'icon'>> = {
  emerald: {
    color: 'emerald',
    bgGlow: 'from-emerald-500/20 via-teal-500/10 to-slate-900',
    borderGlow: 'border-emerald-500/30 group-hover:border-emerald-500/60',
    textColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/20',
  },
  amber: {
    color: 'amber',
    bgGlow: 'from-amber-500/20 via-orange-500/10 to-slate-900',
    borderGlow: 'border-amber-500/30 group-hover:border-amber-500/60',
    textColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/20',
  },
  blue: {
    color: 'blue',
    bgGlow: 'from-blue-500/20 via-indigo-500/10 to-slate-900',
    borderGlow: 'border-blue-500/30 group-hover:border-blue-500/60',
    textColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/20',
  },
  purple: {
    color: 'purple',
    bgGlow: 'from-purple-500/20 via-indigo-500/10 to-slate-900',
    borderGlow: 'border-purple-500/30 group-hover:border-purple-500/60',
    textColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/20',
  },
  cyan: {
    color: 'cyan',
    bgGlow: 'from-cyan-500/20 via-teal-500/10 to-slate-900',
    borderGlow: 'border-cyan-500/30 group-hover:border-cyan-500/60',
    textColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/20',
  },
  fuchsia: {
    color: 'fuchsia',
    bgGlow: 'from-fuchsia-500/20 via-pink-500/10 to-slate-900',
    borderGlow: 'border-fuchsia-500/30 group-hover:border-fuchsia-500/60',
    textColor: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/10',
    badgeBorder: 'border-fuchsia-500/20',
  },
  rose: {
    color: 'rose',
    bgGlow: 'from-rose-500/20 via-red-500/10 to-slate-900',
    borderGlow: 'border-rose-500/30 group-hover:border-rose-500/60',
    textColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/20',
  },
  indigo: {
    color: 'indigo',
    bgGlow: 'from-indigo-500/20 via-purple-500/10 to-slate-900',
    borderGlow: 'border-indigo-500/30 group-hover:border-indigo-500/60',
    textColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/20',
  }
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  'ai': 'purple',
  'ai native': 'purple',
  'communication': 'fuchsia',
  'google suite': 'blue',
  'databases': 'cyan',
  'developer tools': 'indigo',
  'crm': 'amber',
  'project': 'emerald',
  'e-commerce': 'rose',
  'jobs & recruitment': 'amber',
  'utilities': 'cyan'
};

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'ai': Bot,
  'ai native': Sparkles,
  'communication': MessageSquare,
  'google suite': Globe,
  'databases': Database,
  'developer tools': Code,
  'crm': Building,
  'project': Workflow,
  'e-commerce': CreditCard,
  'jobs & recruitment': Building,
  'utilities': Zap
};

/**
 * Dynamic Connector Brand Spec Resolver
 * Reads connector UI metadata or computes dynamic brand styling from category hash.
 */
export function getConnectorBrandSpec(id: string = '', category: string = '', manifestBrand?: any): BrandSpec {
  const cid = id.toLowerCase();
  const cat = category.toLowerCase();

  let icon: LucideIcon = Zap;
  let colorKey = 'indigo';

  if (cat && CATEGORY_ICON_MAP[cat]) {
    icon = CATEGORY_ICON_MAP[cat];
  }

  if (cat && CATEGORY_COLOR_MAP[cat]) {
    colorKey = CATEGORY_COLOR_MAP[cat];
  }

  // Override specific connector icons
  if (cid.includes('openai') || cid.includes('gemini')) icon = Sparkles;
  else if (cid.includes('claude') || cid.includes('anthropic')) icon = Cpu;
  else if (cid.includes('mail') || cid.includes('gmail')) icon = Mail;
  else if (cid.includes('slack') || cid.includes('discord')) icon = MessageSquare;
  else if (cid.includes('github') || cid.includes('gitlab')) icon = Code;
  else if (cid.includes('drive') || cid.includes('s3')) icon = HardDrive;
  else if (cid.includes('sheet') || cid.includes('table')) icon = Table;
  else if (cid.includes('whatsapp') || cid.includes('phone')) icon = PhoneCall;

  // Use explicit brand color from manifest if available
  if (manifestBrand && manifestBrand.color && COLOR_PALETTES[manifestBrand.color]) {
    colorKey = manifestBrand.color;
  }

  const palette = COLOR_PALETTES[colorKey] || COLOR_PALETTES.indigo;

  return {
    icon,
    ...palette
  };
}
