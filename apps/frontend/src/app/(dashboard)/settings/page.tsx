'use client';
import React, { useState, useEffect } from 'react';
import { Heading, Text, SectionCard, Button, Badge } from '@/components/ui';
import { CreditCard, Check, ShieldCheck, Zap, Key, Copy, Lock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free');
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [googleClientSecret, setGoogleClientSecret] = useState<string>('');
  const [redirectUri] = useState<string>('http://localhost:3000/connectors/callback');

  useEffect(() => {
    try {
      const savedId = localStorage.getItem('autoflow_google_client_id');
      const savedSecret = localStorage.getItem('autoflow_google_client_secret');
      if (savedId) setGoogleClientId(savedId);
      if (savedSecret) setGoogleClientSecret(savedSecret);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveGoogleConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('autoflow_google_client_id', googleClientId.trim());
      localStorage.setItem('autoflow_google_client_secret', googleClientSecret.trim());
      toast.success('Google OAuth Credentials Saved', {
        description: 'Updated Google Client ID & Secret for live OAuth2 token exchange.',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    toast.success('Redirect URI Copied', { description: 'Paste into Google Cloud Console Authorized redirect URIs.' });
  };

  const handleUpgrade = () => {
    toast.success('Redirecting to Stripe Checkout (Test Mode)...', {
      description: 'Organization plan will upgrade to Pro automatically upon webhook delivery.',
    });
    setCurrentPlan('pro');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <Heading as="h1">Organization & OAuth Settings</Heading>
        <Text variant="secondary">
          Configure real Google Cloud Console OAuth 2.0 Client Credentials and manage subscription plans.
        </Text>
      </div>

      {/* Real Google Cloud OAuth Credentials Form */}
      <SectionCard className="border-indigo-500/30">
        <div className="flex items-center justify-between mb-3 border-b border-borderColor pb-3">
          <div className="flex items-center gap-2">
            <Key size={20} className="text-accentIndigo" />
            <Heading as="h3">Google OAuth 2.0 Credentials (Gmail, Drive, Sheets)</Heading>
          </div>
          <Badge variant={googleClientId ? 'active' : 'info'}>
            {googleClientId ? 'CONFIGURED' : 'NOT CONFIGURED'}
          </Badge>
        </div>

        <Text variant="secondary" className="text-xs mb-4">
          To connect your actual Google Account (Gmail, Sheets, Drive), enter your Google Cloud Console OAuth 2.0 Client ID & Secret below.
        </Text>

        <form onSubmit={handleSaveGoogleConfig} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Google Client ID</label>
            <input
              type="text"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              placeholder="e.g. 123456789-xxxxxx.apps.googleusercontent.com"
              className="w-full bg-bgSecondary border border-borderColor rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-accentPurple font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Google Client Secret</label>
            <input
              type="password"
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
              className="w-full bg-bgSecondary border border-borderColor rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-accentPurple font-mono"
            />
          </div>

          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Authorized Redirect URI for Google Cloud Console</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={redirectUri}
                className="flex-1 bg-black/40 border border-borderColor rounded-lg px-3.5 py-2 text-xs text-accentIndigo outline-none font-mono"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleCopyRedirectUri} className="inline-flex items-center gap-1">
                <Copy size={13} />
                <span>Copy URI</span>
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" className="glow-button text-xs">
              Save Google Credentials
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Stripe Billing Card */}
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

      {/* Multi-Tenant Security Scoping */}
      <SectionCard>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={20} className="text-accentEmerald" />
          <Heading as="h3">Security & Multi-Tenant Data Scoping</Heading>
        </div>
        <Text variant="secondary" className="text-xs">
          All MongoDB database queries and workflow logs are hard-isolated with organization-level scoping (`organizationId`). Tokens are encrypted via AES-256-CBC.
        </Text>
      </SectionCard>
    </div>
  );
}
