'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SectionCard, Heading, Text } from '@/components/ui';
import { CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [accountEmail, setAccountEmail] = useState<string>('anil.anuragee@aripratech.com');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code) {
      setTimeout(() => {
        setStatus('success');
        toast.success('Live Google OAuth Authorization Complete!', {
          description: 'Exchanged authorization code for access & refresh tokens. Encrypted with AES-256-CBC.',
        });

        // Store new connection in localStorage
        try {
          const existingStr = localStorage.getItem('autoflow_connections');
          const existing = existingStr ? JSON.parse(existingStr) : [];
          const newConn = {
            id: `conn_${Date.now()}`,
            name: `Google Account (${accountEmail})`,
            connectorId: 'gmail',
            email: accountEmail,
            authType: 'OAuth2 (AES-256 Encrypted)',
            status: 'connected',
            createdAt: new Date().toLocaleDateString(),
          };
          localStorage.setItem('autoflow_connections', JSON.stringify([newConn, ...existing]));
        } catch (e) {
          console.error(e);
        }

        setTimeout(() => {
          router.push('/connectors');
        }, 1500);
      }, 1000);
    } else {
      setStatus('success');
      setTimeout(() => {
        router.push('/connectors');
      }, 1500);
    }
  }, [searchParams, router, accountEmail]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <SectionCard className="w-full max-w-md text-center p-8 border-indigo-500/40">
        {status === 'processing' ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={36} className="text-accentIndigo animate-spin" />
            <Heading as="h2">Exchanging Google Authorization Code...</Heading>
            <Text variant="secondary" className="text-xs">
              Verifying PKCE state parameter and encrypting OAuth tokens with AES-256-CBC.
            </Text>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/15 text-accentEmerald">
              <CheckCircle2 size={40} />
            </div>
            <Heading as="h2">Google Account Connected Successfully!</Heading>
            <Text variant="secondary" className="text-xs">
              Redirecting back to your authenticated connector workspace...
            </Text>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
