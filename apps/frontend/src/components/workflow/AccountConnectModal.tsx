'use client';
import React, { useState } from 'react';
import { X, Key, ShieldCheck, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getManifestById } from '@/lib/connector-manifests';

interface AccountConnectModalProps {
  connectorId: string;
  onSuccess: (newConnectionId: string) => void;
  onClose: () => void;
}

export function AccountConnectModal({ connectorId, onSuccess, onClose }: AccountConnectModalProps) {
  const manifest = getManifestById(connectorId);
  const isApiKey = manifest?.authType === 'api_key';

  const [accountName, setAccountName] = useState(`${manifest?.name || connectorId} Account`);
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreateApiKeyConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId,
        name: accountName,
        credentials: { apiKey, key: apiKey },
      });

      const newConnection = res.data.data;
      onSuccess(newConnection._id || newConnection.id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to authenticate connection credentials');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLaunchOAuth = () => {
    setSubmitting(true);
    setError('');

    // Open popup window for OAuth 2.0 flow
    const authUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/connectors/oauth/authorize/${connectorId}`;
    const popup = window.open(authUrl, 'OAuthAuthorize', 'width=600,height=700');

    // Poll popup window closure
    const timer = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(timer);
        setSubmitting(false);
        try {
          // Query recent connections to fetch newly added account
          const res = await apiClient.get('/v1/connectors/connections');
          const conns = res.data.data || [];
          const match = conns.find((c: any) => c.connectorId === connectorId);
          if (match) {
            onSuccess(match._id || match.id);
            onClose();
          }
        } catch {
          // ignore
        }
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/8 bg-[#0b0f19] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={16} />
            </div>
            <h3 className="font-bold text-white text-sm">
              Connect {manifest?.name || connectorId} Account
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-300 mb-1">Account Alias Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Work Account, Primary Store"
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {isApiKey ? (
            <form onSubmit={handleCreateApiKeyConnection} className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">API Key / Access Token</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste API Key secret here..."
                  required
                  className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-lg"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                  <span>{submitting ? 'Authenticating...' : 'Connect Account'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 pt-1">
              <p className="text-gray-300 text-xs leading-relaxed">
                Click below to launch official <strong>OAuth 2.0</strong> authorization for <strong className="text-white">{manifest?.name || connectorId}</strong> in a secure popup window.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLaunchOAuth}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-lg"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <ExternalLink size={13} />}
                  <span>{submitting ? 'Waiting for Auth...' : 'Authorize via OAuth 2.0'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
