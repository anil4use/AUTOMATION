'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Crown, User } from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUserRole();

  const [email, setEmail] = useState('anil.anuragee@aripratech.com');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      login(email.trim(), role, email.split('@')[0].replace('.', ' ').toUpperCase());
      toast.success(`Welcome back! Logged in as ${role.toUpperCase()}`, {
        description: `Authenticated session created for ${email}.`,
      });
      router.push('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-bgPrimary flex flex-col items-center justify-center p-4">
      {/* Platform Branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-glow flex items-center justify-center shadow-glow">
          <Zap size={22} className="text-white" />
        </div>
        <span className="font-extrabold text-2xl tracking-tight text-white">
          AutoFlow <span className="text-accentPurple text-xs font-semibold">AI PLATFORM</span>
        </span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-bgSecondary border border-borderColor/80 rounded-2xl shadow-2xl p-7 relative">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white mb-1">Sign in to your Account</h1>
          <p className="text-xs text-textSecondary">
            Enter your credentials to access your organization dashboard & workflows.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email Input */}
          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1.5 flex items-center gap-1.5">
              <Mail size={14} className="text-accentIndigo" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@organization.com"
              className="w-full bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple transition-colors"
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1.5 flex items-center gap-1.5">
              <Lock size={14} className="text-accentIndigo" />
              <span>Password</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple transition-colors"
              required
            />
          </div>

          {/* Role Selector */}
          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1.5 block">Select Initial Login Role:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  role === 'admin'
                    ? 'bg-purple-500/20 border-accentPurple text-white shadow-glow'
                    : 'bg-white/5 border-borderColor text-textMuted hover:text-white'
                }`}
              >
                <Crown size={14} className={role === 'admin' ? 'text-amber-400' : ''} />
                <span>👑 Org Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('user')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  role === 'user'
                    ? 'bg-indigo-500/20 border-accentIndigo text-white shadow-glow'
                    : 'bg-white/5 border-borderColor text-textMuted hover:text-white'
                }`}
              >
                <User size={14} />
                <span>👤 Member</span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full glow-button py-3 text-sm flex items-center justify-center gap-2 mt-2 shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <UserCheck size={16} />
                <span>Sign In to AutoFlow →</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-borderColor/60 text-center text-xs text-textMuted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accentPurple font-semibold hover:underline">
            Create Organization →
          </Link>
        </div>
      </div>
    </div>
  );
}
