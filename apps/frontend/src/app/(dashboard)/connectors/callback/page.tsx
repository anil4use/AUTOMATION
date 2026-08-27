'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SectionCard, Heading, Text } from '@/components/ui';
import { CheckCircle2, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectorName, setConnectorName] = useState<string>('OAuth Account');

  useEffect(() => {
    const code = searchParams.get('code');
    const stateStr = searchParams.get('state');

    let connectorId = 'oauth';
    if (stateStr) {
      try {
        const decoded = JSON.parse(atob(stateStr));
        if (decoded.connectorId) {
          connectorId = decoded.connectorId;
          setConnectorName(connectorId.toUpperCase());
        }
      } catch (e) {
        console.warn('Could not parse OAuth state:', e);
      }
    }

    if (code) {
      apiClient.post(`/v1/connectors/oauth/callback/${connectorId}`, { code, state: stateStr })
        .then((res) => {
          setStatus('success');
          toast.success(`${connectorId.toUpperCase()} Connected!`, {
            description: 'Exchanged OAuth authorization code & stored encrypted tokens in MongoDB Atlas via AES-256.',
          });
          setTimeout(() => {
            router.push('/connectors');
          }, 1500);
        })
        .catch((err) => {
          setStatus('error');
          const msg = err?.response?.data?.message || err?.message || 'OAuth authorization failed.';
          setErrorMessage(msg);
          toast.error('OAuth Callback Failed', { description: msg });
        });
    } else {
      setStatus('error');
      setErrorMessage('No OAuth code returned from authorization server.');
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <SectionCard className="w-full max-w-md text-center p-8 border-indigo-500/40">
        {status === 'processing' ? (
          <div className="flex flex-col items-center gap-4">
            <RefreshCw size={36} className="text-accentIndigo animate-spin" />
            <Heading as="h2">Exchanging {connectorName} Code...</Heading>
            <Text variant="secondary" className="text-xs">
              Verifying PKCE state parameter and encrypting OAuth tokens with AES-256-CBC.
            </Text>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/15 text-accentEmerald">
              <CheckCircle2 size={40} />
            </div>
            <Heading as="h2">{connectorName} Account Connected!</Heading>
            <Text variant="secondary" className="text-xs">
              Redirecting back to your authenticated connector workspace...
            </Text>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/15 text-red-400">
              <AlertCircle size={40} />
            </div>
            <Heading as="h2">OAuth Authorization Error</Heading>
            <Text variant="secondary" className="text-xs text-red-300">
              {errorMessage || 'Could not complete OAuth flow.'}
            </Text>
            <button
              onClick={() => router.push('/connectors')}
              className="mt-2 px-4 py-2 bg-white/10 rounded-lg text-xs font-semibold hover:bg-white/20 text-white"
            >
              Return to Integrations
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
