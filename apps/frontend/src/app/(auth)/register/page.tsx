'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, Mail, User, Building, UserCheck } from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useUserRole();

  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      login(email.trim(), 'admin', name.trim());
      toast.success('Organization Created!', {
        description: `Registered organization "${orgName || 'Dev Org'}" and logged in as Admin.`,
      });
      router.push('/dashboard');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-bgPrimary flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-glow flex items-center justify-center shadow-glow">
          <Zap size={22} className="text-white" />
        </div>
        <span className="font-extrabold text-2xl tracking-tight text-white">
          AutoFlow <span className="text-accentPurple text-xs font-semibold">AI PLATFORM</span>
        </span>
      </div>

      <div className="w-full max-w-md bg-bgSecondary border border-borderColor/80 rounded-2xl shadow-2xl p-7 relative">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white mb-1">Create an Organization Account</h1>
          <p className="text-xs text-textSecondary">
            Set up your workflow automation platform for your team.
          </p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Anil Anuragee"
              className="w-full bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple"
              required
            />
          </div>

          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Aripratech Automations"
              className="w-full bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple"
              required
            />
          </div>

          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anil@aripratech.com"
              className="w-full bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple"
              required
            />
          </div>

          <div>
            <label className="text-xs text-textSecondary font-semibold mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-accentPurple"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full glow-button py-3 text-sm flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? 'Creating Organization...' : 'Create Account & Start Automating →'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-borderColor/60 text-center text-xs text-textMuted">
          Already have an account?{' '}
          <Link href="/login" className="text-accentPurple font-semibold hover:underline">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
