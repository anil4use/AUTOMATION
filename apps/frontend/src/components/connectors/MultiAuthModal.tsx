'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Key, Globe, AlertTriangle, ChevronDown, ChevronUp, Loader2, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getCookie } from '@/context/UserRoleContext';
import { getManifestById } from '@/lib/connector-manifests';

interface MultiAuthModalProps {
  connectorId: string;
  onSuccess: (newConnectionId: string) => void;
  onClose: () => void;
}

function extractCookieValue(inputStr: string, cookieName: string): string {
  const trimmed = inputStr.trim();
  if (!trimmed) return '';
  if (trimmed.includes(`${cookieName}=`)) {
    const regex = new RegExp(`${cookieName}=([^;\\s]+)`);
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1].replace(/^["']|["']$/g, '');
    }
  }
  return trimmed.replace(/^["']|["']$/g, '');
}

export function MultiAuthModal({ connectorId, onSuccess, onClose }: MultiAuthModalProps) {
  const manifest = getManifestById(connectorId) || { name: connectorId, category: 'Jobs & Recruitment' };
  const cookieName = connectorId === 'linkedin' ? 'li_at' : connectorId === 'indeed' ? 'CTK' : 'session_cookie';

  const [accountName, setAccountName] = useState(`${manifest.name} Account`);
  const [cookieValue, setCookieValue] = useState('');
  const [submittingCookie, setSubmittingCookie] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [isLaunchingOAuth, setIsLaunchingOAuth] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Accordion toggle states
  const [expandedOption, setExpandedOption] = useState<'oauth' | 'cookie' | 'apikey'>('oauth');

  // Input states for API Key / Access Token option
  const [apiKey, setApiKey] = useState('');
  const [submittingApiKey, setSubmittingApiKey] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for instant postMessage completion from backend popup callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && (event.data?.connectorId === connectorId || !event.data?.connectorId)) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setIsLaunchingOAuth(false);
        apiClient.get('/v1/connectors/connections').then((res) => {
          const conns = res.data.data || [];
          const match = conns.find((c: any) => c.connectorId === connectorId);
          onSuccess(match ? (match._id || match.id) : `conn_${connectorId}_${Date.now()}`);
          onClose();
        }).catch(() => {
          onSuccess(`conn_${connectorId}_${Date.now()}`);
          onClose();
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [connectorId, onSuccess, onClose]);

  // Launch Option 1: Official Zapier-style 1-Click OAuth Authorization Popup
  const handleLaunchZapierOAuth = () => {
    setIsLaunchingOAuth(true);
    setErrorMessage('');

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const apiBase = rawUrl.replace(/\/api\/?$/, '');
    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || getCookie('token') || '') : '';
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const authUrl = `${apiBase}/api/v1/connectors/oauth/authorize/${connectorId}?redirect=true${tokenParam}`;

    // Open official Zapier-style connection popup window directly to OAuth URL
    const popup = window.open(authUrl, 'ConnectOAuth', 'width=600,height=700');

    // Poll for window closure and automatic connection detection
    pollTimerRef.current = setInterval(async () => {
      if (popup?.closed) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setIsLaunchingOAuth(false);
        try {
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
    }, 1500);
  };

  // Submit Option 2: Instant Session Cookie (li_at / CTK)
  const handleSaveSessionCookie = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCookie(true);
    setErrorMessage('');

    try {
      const cleanCookie = extractCookieValue(cookieValue, cookieName);
      if (!cleanCookie) {
        setErrorMessage(`Please enter a valid ${cookieName} cookie value.`);
        setSubmittingCookie(false);
        return;
      }

      const cookiesObj: Record<string, string> = {};
      cookiesObj[cookieName] = cleanCookie;

      const res = await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId,
        name: accountName,
        apiKey: cleanCookie,
        credentials: {
          authMethod: 'browser_session',
          cookies: cookiesObj,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
      });

      const newConnection = res.data.data;
      onSuccess(newConnection._id || newConnection.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || `Failed to authenticate ${cookieName} session cookie.`);
    } finally {
      setSubmittingCookie(false);
    }
  };

  // Submit Option 3: API Key / Access Token
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApiKey(true);
    setErrorMessage('');

    try {
      const res = await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId,
        name: accountName,
        apiKey,
        credentials: {
          authMethod: 'access_token',
          apiKey,
          accessToken: apiKey,
        },
      });

      const newConnection = res.data.data;
      onSuccess(newConnection._id || newConnection.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Failed to authenticate API Key credentials');
    } finally {
      setSubmittingApiKey(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 text-xs font-sans">
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-[#0b0f19] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Connect {manifest.name}</h3>
              <p className="text-gray-400 text-[11px]">Select your connection authorization method</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Account Alias Name */}
          <div>
            <label className="block font-semibold text-gray-300 mb-1">Account Connection Name</label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. Primary Account"
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* OPTION 1: Zapier-Style 1-Click OAuth Popup (Recommended) */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="border border-indigo-500/40 rounded-xl bg-[#0d1322] overflow-hidden shadow-lg">
            <button
              onClick={() => setExpandedOption(expandedOption === 'oauth' ? 'oauth' : 'oauth')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-indigo-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Option 1: 1-Click Zapier-Style Connect</span>
                    <span className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-gray-400 text-[11px]">Direct 1-click authorization popup — 0 manual steps required</p>
                </div>
              </div>
              {expandedOption === 'oauth' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {expandedOption === 'oauth' && (
              <div className="p-5 border-t border-white/10 bg-[#0b0f19] space-y-4 text-center">
                <div className="py-2 space-y-1">
                  <p className="text-white text-xs font-semibold">Connect your active {manifest.name} account to AutoFlow</p>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    Opens a clean authorization popup window. Since you are logged in, simply click <strong className="text-indigo-300">"Connect"</strong> and it will authenticate instantly!
                  </p>
                </div>

                <button
                  onClick={handleLaunchZapierOAuth}
                  disabled={isLaunchingOAuth}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2.5 shadow-xl transition-all text-xs"
                >
                  {isLaunchingOAuth ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                  <span>{isLaunchingOAuth ? 'Waiting for Approval in Popup...' : `Connect ${manifest.name} Account`}</span>
                </button>

                {isLaunchingOAuth && (
                  <p className="text-indigo-300 text-[11px] animate-pulse">
                    Popup window opened! Click "Connect" or "Allow" in the opened window to complete setup.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* OPTION 2: Quick Session Cookie (li_at / CTK) */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="border border-white/10 rounded-xl bg-[#0d1322] overflow-hidden">
            <button
              onClick={() => setExpandedOption(expandedOption === 'cookie' ? 'oauth' : 'cookie')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-amber-400" />
                <div>
                  <span className="font-bold text-white">Option 2: Direct Session Cookie ({cookieName})</span>
                  <p className="text-gray-400 text-[11px]">Paste your active browser session cookie ({cookieName})</p>
                </div>
              </div>
              {expandedOption === 'cookie' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {expandedOption === 'cookie' && (
              <form onSubmit={handleSaveSessionCookie} className="p-4 border-t border-white/10 bg-[#0b0f19] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-gray-300">Paste <code className="text-amber-400 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">{cookieName}</code> Cookie Value</label>
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                  >
                    <HelpCircle size={12} />
                    <span>{showGuide ? 'Hide Guide' : 'How to find cookie?'}</span>
                  </button>
                </div>

                {showGuide && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-2 text-gray-300 text-[11px] leading-relaxed font-sans text-left">
                    <p className="font-semibold text-white">How to copy <code className="text-amber-300 font-mono">{cookieName}</code>:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300">
                      <li>Open <strong className="text-white font-medium">{connectorId === 'linkedin' ? 'LinkedIn' : 'Indeed'}</strong> in another tab (you are already logged in!).</li>
                      <li>Press <kbd className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20 text-white font-mono text-[10px]">F12</kbd> (Inspect) → click <strong className="text-white">Application</strong> tab → <strong className="text-white">Cookies</strong> → <strong className="text-white">{connectorId === 'linkedin' ? 'linkedin.com' : 'indeed.com'}</strong>.</li>
                      <li>Find <strong className="text-amber-300 font-mono">{cookieName}</strong>, copy its Value, and paste it below!</li>
                    </ol>
                  </div>
                )}

                <input
                  type="password"
                  value={cookieValue}
                  onChange={(e) => setCookieValue(e.target.value)}
                  placeholder={`Paste ${cookieName} cookie value here...`}
                  required
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500/60"
                />

                <button
                  type="submit"
                  disabled={submittingCookie}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {submittingCookie ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>{submittingCookie ? 'Connecting...' : 'Connect Session Cookie'}</span>
                </button>
              </form>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────────────── */}
          {/* OPTION 3: API Key / Access Token */}
          {/* ───────────────────────────────────────────────────────────────── */}
          <div className="border border-white/10 rounded-xl bg-[#0d1322] overflow-hidden">
            <button
              onClick={() => setExpandedOption(expandedOption === 'apikey' ? 'oauth' : 'apikey')}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <Key size={18} className="text-emerald-400" />
                <div>
                  <span className="font-bold text-white">Option 3: API Key / Personal Access Token</span>
                  <p className="text-gray-400 text-[11px]">For developers with an API Key or Access Token</p>
                </div>
              </div>
              {expandedOption === 'apikey' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {expandedOption === 'apikey' && (
              <form onSubmit={handleSaveApiKey} className="p-4 border-t border-white/10 bg-[#0b0f19] space-y-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">API Key / Personal Access Token</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste access token here..."
                    required
                    className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submittingApiKey}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    {submittingApiKey ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    <span>{submittingApiKey ? 'Authenticating...' : 'Connect with API Key'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
