'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserRole } from '@/context/UserRoleContext';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2, Zap, AlertCircle } from 'lucide-react';

function GoogleAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useUserRole();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code') || `demo_code_${Date.now()}`;

    async function exchangeCode() {
      try {
        const res = await apiClient.post('/v1/auth/google/callback', { code });
        const { user: authUser, token } = res.data.data;

        login(
          authUser.email,
          authUser.role || 'admin',
          authUser.name,
          authUser.id,
          authUser.organizationId,
          token
        );

        toast.success(`Signed in as ${authUser.email}`, {
          description: `Google Account authenticated successfully. Welcome to AutoFlow!`,
        });

        router.push('/dashboard');
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to exchange Google authorization code.';
        setError(msg);
        toast.error('Google Sign In Failed', { description: msg });
      }
    }

    exchangeCode();
  }, [searchParams, login, router]);

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

      <div className="w-full max-w-md bg-bgSecondary border border-borderColor/80 rounded-2xl shadow-2xl p-8 text-center">
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">Authentication Failed</h3>
            <p className="text-xs text-textMuted leading-relaxed">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all"
            >
              Return to Home
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-accentPurple/20 flex items-center justify-center text-accentPurple">
                <Loader2 className="animate-spin" size={24} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Completing Google Authentication</h3>
              <p className="text-xs text-textMuted mt-1">Exchanging security tokens with AutoFlow...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bgPrimary flex items-center justify-center p-4">
          <Loader2 className="animate-spin text-accentPurple" size={32} />
        </div>
      }
    >
      <GoogleAuthCallbackContent />
    </Suspense>
  );
}
