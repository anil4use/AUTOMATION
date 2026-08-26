'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserRole } from '@/context/UserRoleContext';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Loader2, Zap, AlertCircle } from 'lucide-react';

export default function GoogleAuthCallbackPage() {
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
            <AlertCircle size={32} className="text-red-400" />
            <h2 className="text-lg font-bold text-white">Google Sign-In Error</h2>
            <p className="text-xs text-red-300">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-accentPurple text-white rounded-xl text-xs font-semibold"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-accentPurple animate-spin" />
            <h2 className="text-lg font-bold text-white">Authenticating with Google...</h2>
            <p className="text-xs text-textSecondary">
              Exchanging OAuth tokens &amp; setting up your workspace in MongoDB Atlas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
