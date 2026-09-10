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

export function getConnectorBrandSpec(id: string = '', category: string = ''): BrandSpec {
  const cid = id.toLowerCase();
  const cat = category.toLowerCase();

  // OpenAI
  if (cid.includes('openai')) {
    return {
      icon: Sparkles,
      color: 'emerald',
      bgGlow: 'from-emerald-500/20 via-teal-500/10 to-slate-900',
      borderGlow: 'border-emerald-500/30 group-hover:border-emerald-500/60',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-500/20',
    };
  }

  // Anthropic / Claude
  if (cid.includes('anthropic') || cid.includes('claude')) {
    return {
      icon: Cpu,
      color: 'amber',
      bgGlow: 'from-amber-500/20 via-orange-500/10 to-slate-900',
      borderGlow: 'border-amber-500/30 group-hover:border-amber-500/60',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/20',
    };
  }

  // Google Suite / Gemini
  if (cid.includes('gemini') || cid.includes('google')) {
    return {
      icon: Globe,
      color: 'blue',
      bgGlow: 'from-blue-500/20 via-indigo-500/10 to-slate-900',
      borderGlow: 'border-blue-500/30 group-hover:border-blue-500/60',
      textColor: 'text-blue-400',
      badgeBg: 'bg-blue-500/10',
      badgeBorder: 'border-blue-500/20',
    };
  }

  // AI OCR / Documents
  if (cid.includes('ocr') || cid.includes('document')) {
    return {
      icon: FileText,
      color: 'purple',
      bgGlow: 'from-purple-500/20 via-indigo-500/10 to-slate-900',
      borderGlow: 'border-purple-500/30 group-hover:border-purple-500/60',
      textColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10',
      badgeBorder: 'border-purple-500/20',
    };
  }

  // Vector DB / RAG / Pinecone
  if (cid.includes('rag') || cid.includes('vector') || cid.includes('pinecone') || cid.includes('qdrant')) {
    return {
      icon: Layers,
      color: 'cyan',
      bgGlow: 'from-cyan-500/20 via-blue-500/10 to-slate-900',
      borderGlow: 'border-cyan-500/30 group-hover:border-cyan-500/60',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10',
      badgeBorder: 'border-cyan-500/20',
    };
  }

  // Messaging & Slack / Discord / WhatsApp / Telegram
  if (cid.includes('slack')) {
    return {
      icon: MessageSquare,
      color: 'fuchsia',
      bgGlow: 'from-fuchsia-500/20 via-pink-500/10 to-slate-900',
      borderGlow: 'border-fuchsia-500/30 group-hover:border-fuchsia-500/60',
      textColor: 'text-fuchsia-400',
      badgeBg: 'bg-fuchsia-500/10',
      badgeBorder: 'border-fuchsia-500/20',
    };
  }
  if (cid.includes('discord')) {
    return {
      icon: MessageSquare,
      color: 'indigo',
      bgGlow: 'from-indigo-500/20 via-purple-500/10 to-slate-900',
      borderGlow: 'border-indigo-500/30 group-hover:border-indigo-500/60',
      textColor: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10',
      badgeBorder: 'border-indigo-500/20',
    };
  }
  if (cid.includes('telegram')) {
    return {
      icon: Send,
      color: 'sky',
      bgGlow: 'from-sky-500/20 via-blue-500/10 to-slate-900',
      borderGlow: 'border-sky-500/30 group-hover:border-sky-500/60',
      textColor: 'text-sky-400',
      badgeBg: 'bg-sky-500/10',
      badgeBorder: 'border-sky-500/20',
    };
  }
  if (cid.includes('whatsapp')) {
    return {
      icon: PhoneCall,
      color: 'emerald',
      bgGlow: 'from-emerald-500/20 via-green-500/10 to-slate-900',
      borderGlow: 'border-emerald-500/30 group-hover:border-emerald-500/60',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-500/20',
    };
  }

  // Code / Repos (GitHub / GitLab)
  if (cid.includes('github') || cid.includes('gitlab')) {
    return {
      icon: Code,
      color: 'slate',
      bgGlow: 'from-slate-400/20 via-slate-600/10 to-slate-900',
      borderGlow: 'border-slate-400/30 group-hover:border-slate-400/60',
      textColor: 'text-slate-200',
      badgeBg: 'bg-slate-400/10',
      badgeBorder: 'border-slate-400/20',
    };
  }

  // Payments (Stripe / Razorpay)
  if (cid.includes('stripe') || cid.includes('razorpay')) {
    return {
      icon: CreditCard,
      color: 'violet',
      bgGlow: 'from-violet-500/20 via-purple-500/10 to-slate-900',
      borderGlow: 'border-violet-500/30 group-hover:border-violet-500/60',
      textColor: 'text-violet-400',
      badgeBg: 'bg-violet-500/10',
      badgeBorder: 'border-violet-500/20',
    };
  }

  // Databases (Postgres / MySQL / Mongo / Redis / Supabase)
  if (cid.includes('postgres') || cid.includes('mysql') || cid.includes('mongo') || cid.includes('redis') || cid.includes('db') || cat.includes('database')) {
    return {
      icon: Database,
      color: 'cyan',
      bgGlow: 'from-cyan-500/20 via-teal-500/10 to-slate-900',
      borderGlow: 'border-cyan-500/30 group-hover:border-cyan-500/60',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10',
      badgeBorder: 'border-cyan-500/20',
    };
  }

  // Storage / AWS / Cloud
  if (cid.includes('s3') || cid.includes('aws') || cid.includes('cloud')) {
    return {
      icon: HardDrive,
      color: 'orange',
      bgGlow: 'from-orange-500/20 via-amber-500/10 to-slate-900',
      borderGlow: 'border-orange-500/30 group-hover:border-orange-500/60',
      textColor: 'text-orange-400',
      badgeBg: 'bg-orange-500/10',
      badgeBorder: 'border-orange-500/20',
    };
  }

  // Email (Gmail / SendGrid / Resend)
  if (cid.includes('mail') || cid.includes('sendgrid') || cid.includes('resend')) {
    return {
      icon: Mail,
      color: 'rose',
      bgGlow: 'from-rose-500/20 via-red-500/10 to-slate-900',
      borderGlow: 'border-rose-500/30 group-hover:border-rose-500/60',
      textColor: 'text-rose-400',
      badgeBg: 'bg-rose-500/10',
      badgeBorder: 'border-rose-500/20',
    };
  }

  // CRM & Sales (HubSpot / Salesforce)
  if (cid.includes('hubspot') || cid.includes('salesforce')) {
    return {
      icon: Building,
      color: 'amber',
      bgGlow: 'from-amber-500/20 via-yellow-500/10 to-slate-900',
      borderGlow: 'border-amber-500/30 group-hover:border-amber-500/60',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/20',
    };
  }

  // AI Agent & Nodes
  if (cid.includes('agent') || cid.includes('ai') || cat.includes('ai')) {
    return {
      icon: Bot,
      color: 'purple',
      bgGlow: 'from-purple-500/20 via-indigo-500/10 to-slate-900',
      borderGlow: 'border-purple-500/30 group-hover:border-purple-500/60',
      textColor: 'text-purple-400',
      badgeBg: 'bg-purple-500/10',
      badgeBorder: 'border-purple-500/20',
    };
  }

  // Default fallback
  return {
    icon: Zap,
    color: 'indigo',
    bgGlow: 'from-indigo-500/20 via-purple-500/10 to-slate-900',
    borderGlow: 'border-indigo-500/30 group-hover:border-indigo-500/60',
    textColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10',
    badgeBorder: 'border-indigo-500/20',
  };
}
