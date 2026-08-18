'use client';
import React from 'react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Billing Plan</h1>
        <p className="text-textSecondary text-sm">Manage organization team members, usage limits, and subscriptions.</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Free Development Tier (Test Mode)</h3>
        <p className="text-textSecondary text-sm mb-5">
          Your platform is currently running on the zero-cost dev phase stack (MongoDB Atlas M0, Upstash Redis free tier, Groq/Gemini free LLM credits).
        </p>
        <button className="glow-button text-xs">Upgrade Plan (Stripe Test Mode)</button>
      </div>
    </div>
  );
}
