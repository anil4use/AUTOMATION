'use client';
import React, { useState } from 'react';
import { Heading, Text, SectionCard, Button, Badge } from '@/components/ui';
import { CreditCard, Check, ShieldCheck, Zap } from 'lucide-react';

export default function SettingsPage() {
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free');
  const [usage] = useState({
    tasks: 42,
    taskLimit: 1000,
    aiGenerations: 7,
    aiLimit: 50,
  });

  const handleUpgrade = () => {
    alert('Redirecting to Stripe Checkout (Test Mode)... Plan will upgrade upon webhook confirmation.');
    setCurrentPlan('pro');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Heading as="h1">Organization & Subscription Settings</Heading>
        <Text variant="secondary">
          Manage your organization plan, team members, and usage meters.
        </Text>
      </div>

      {/* Usage Metering Card */}
      <SectionCard>
        <div className="flex items-center justify-between mb-4">
          <Heading as="h3">Current Plan Usage (August 2026)</Heading>
          <Badge variant={currentPlan === 'pro' ? 'active' : 'info'}>
            {currentPlan.toUpperCase()} PLAN
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Task Executions Meter */}
          <div className="p-4 rounded-md bg-white/[0.02] border border-borderColor flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-textSecondary font-medium">Task Executions</span>
              <span className="text-white font-bold">{usage.tasks} / {usage.taskLimit}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-bgSecondary overflow-hidden">
              <div
                className="h-full bg-accentPurple rounded-full transition-all duration-300"
                style={{ width: `${(usage.tasks / usage.taskLimit) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-textMuted">{usage.taskLimit - usage.tasks} task runs remaining this month</span>
          </div>

          {/* AI Generations Meter */}
          <div className="p-4 rounded-md bg-white/[0.02] border border-borderColor flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-textSecondary font-medium">AI Prompt Generations</span>
              <span className="text-white font-bold">{usage.aiGenerations} / {usage.aiLimit}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-bgSecondary overflow-hidden">
              <div
                className="h-full bg-accentEmerald rounded-full transition-all duration-300"
                style={{ width: `${(usage.aiGenerations / usage.aiLimit) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-textMuted">{usage.aiLimit - usage.aiGenerations} AI generations remaining today</span>
          </div>
        </div>
      </SectionCard>

      {/* Stripe Test Mode Billing Card */}
      <SectionCard className="border-purple-500/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={20} className="text-accentPurple" />
              <Heading as="h3">Upgrade to Pro Plan</Heading>
            </div>
            <Text variant="secondary" className="text-xs">
              Unlock 50,000 monthly task executions, unlimited AI generations, and priority worker queue execution.
            </Text>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">$29</span>
            <span className="text-xs text-textMuted"> / month</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-xs text-textSecondary">
          <div className="flex items-center gap-2"><Check size={14} className="text-accentEmerald" /> 50,000 Task Executions</div>
          <div className="flex items-center gap-2"><Check size={14} className="text-accentEmerald" /> Unlimited AI Generations</div>
          <div className="flex items-center gap-2"><Check size={14} className="text-accentEmerald" /> Priority Queue & Support</div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="primary" onClick={handleUpgrade} className="inline-flex items-center gap-2">
            <CreditCard size={16} />
            <span>Pay $29 (Stripe Test Mode)</span>
          </Button>
        </div>
      </SectionCard>

      {/* Organization RBAC & Security Audit */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} className="text-accentEmerald" />
          <Heading as="h3">Security & Multi-Tenant Data Scoping</Heading>
        </div>
        <Text variant="secondary" className="text-xs">
          All MongoDB database queries and workflow logs are hard-isolated with organization-level scoping (`organizationId`).
        </Text>
      </SectionCard>
    </div>
  );
}
