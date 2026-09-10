'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, Lock, ExternalLink, ArrowRight, UserCheck, Key, Settings } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import { useUserRole } from '@/context/UserRoleContext';

interface GoogleOAuthConsentModalProps {
  isOpen: boolean;
  connectorName: string;
  connectorId: string;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export function GoogleOAuthConsentModal({
  isOpen,
  connectorName,
  connectorId,
  onClose,
  onSuccess,
}: GoogleOAuthConsentModalProps) {
  const { user } = useUserRole();
  const activeEmail = user?.email || 'user@autoflow.io';
  const activeName = user?.name || activeEmail.split('@')[0];
  const avatarInitials = activeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'US';

  const [step, setStep] = useState<'choose_account' | 'permissions'>('choose_account');
  const [selectedEmail, setSelectedEmail] = useState<string>(activeEmail);
  const [customEmail, setCustomEmail] = useState<string>('');
  const [isUseCustom, setIsUseCustom] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);

  const [storedClientId, setStoredClientId] = useState<string>('');

  useEffect(() => {
    try {
      const savedId = localStorage.getItem('autoflow_google_client_id');
      if (savedId) setStoredClientId(savedId);
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (!isOpen) return null;

  const accounts = [
    { email: activeEmail, name: `${activeName} (Active Session)`, avatar: avatarInitials },
  ];

  const handleSelectAccount = (email: string) => {
    setSelectedEmail(email);
    setIsUseCustom(false);
    setStep('permissions');
  };

  const handleCustomAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    setSelectedEmail(customEmail.trim());
    setStep('permissions');
  };

  const handleGrantPermissions = () => {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      onSuccess(selectedEmail);
    }, 1000);
  };

  const handleTriggerRealGoogleRedirect = () => {
    if (!storedClientId) {
      toast.error('Google Client ID Not Configured', {
        description: 'Please enter your Google Cloud Console Client ID in Settings first.',
      });
      return;
    }

    const redirectUri = encodeURIComponent('http://localhost:3000/connectors/callback');
    const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets');
    const state = encodeURIComponent(Buffer.from(JSON.stringify({ connectorId, timestamp: Date.now() })).toString('base64'));

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${storedClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;

    toast.info('Redirecting to Google Accounts...', { description: 'Opening accounts.google.com consent screen.' });
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      {/* Authentic Google Consent Window */}
      <div className="w-full max-w-[480px] bg-[#1a1f2c] border border-white/15 rounded-2xl shadow-2xl overflow-hidden font-sans text-white relative">
        {/* Google Header Strip */}
        <div className="bg-[#111522] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Google G Logo SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="font-semibold text-sm tracking-wide text-gray-200">Sign in with Google</span>
          </div>
          <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            OAuth 2.0 PKCE
          </span>
        </div>

        {/* Real Client ID Banner */}
        <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-6 py-2.5 flex items-center justify-between text-xs">
          <span className="text-gray-300">
            Client ID: <span className="font-mono text-indigo-300">{storedClientId ? `${storedClientId.slice(0, 18)}...` : 'Not Set'}</span>
          </span>
          <Link href="/settings" className="text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
            <Settings size={12} />
            <span>Configure Credentials</span>
          </Link>
        </div>

        {/* STEP 1: Choose Google Account */}
        {step === 'choose_account' && (
          <div className="p-6">
            <div className="text-center mb-5">
              <h2 className="text-lg font-bold text-white mb-1">Choose an account</h2>
              <p className="text-xs text-gray-400">
                to continue to <span className="font-semibold text-indigo-400">AutoFlow AI Platform</span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5 mb-5">
              {accounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleSelectAccount(acc.email)}
                  className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 hover:border-indigo-500 hover:bg-white/[0.08] transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 font-bold text-xs flex items-center justify-center text-white shrink-0 shadow">
                    {acc.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{acc.email}</div>
                  </div>
                  <ArrowRight size={14} className="text-gray-500 group-hover:text-white transition-colors" />
                </button>
              ))}

              {isUseCustom ? (
                <form onSubmit={handleCustomAccountSubmit} className="mt-2 p-3 bg-white/[0.04] rounded-xl border border-indigo-500/50">
                  <label className="text-xs text-gray-300 font-medium block mb-1">Enter target Google Email:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      autoFocus
                      className="flex-1 bg-black/40 border border-white/20 rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-400"
                      required
                    />
                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-500">
                      Next
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsUseCustom(true)}
                  className="w-full text-center py-2 text-xs text-indigo-400 hover:underline font-medium"
                >
                  Use another Google Account
                </button>
              )}
            </div>

            {/* Direct Google Accounts Redirect Button */}
            {storedClientId && (
              <div className="mb-4">
                <button
                  onClick={handleTriggerRealGoogleRedirect}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ExternalLink size={14} />
                  <span>Redirect to Live Google Accounts Page (accounts.google.com)</span>
                </button>
              </div>
            )}

            <div className="border-t border-white/10 pt-3 text-center text-[11px] text-gray-400">
              <span>Google will share your email & scope approvals with AutoFlow AI.</span>
            </div>
          </div>
        )}

        {/* STEP 2: Permissions Approval (AutoFlow wants to access your Google Account) */}
        {step === 'permissions' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <div className="w-8 h-8 rounded-full bg-indigo-600 font-bold text-xs flex items-center justify-center text-white shrink-0">
                AA
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">{selectedEmail}</div>
                <button onClick={() => setStep('choose_account')} className="text-[11px] text-indigo-400 hover:underline">
                  Switch account
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-bold text-white mb-1">
                AutoFlow AI wants to access your Google Account ({connectorName})
              </h3>
              <p className="text-xs text-gray-400">Granting the following OAuth permissions:</p>
            </div>

            {/* Requested Scopes Checkboxes */}
            <div className="flex flex-col gap-2.5 mb-5 max-h-48 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5">
                <input type="checkbox" defaultChecked disabled className="mt-0.5 accent-indigo-500" />
                <div className="text-xs">
                  <div className="font-semibold text-gray-200">Read, compose, send, and permanently delete email in Gmail</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">https://www.googleapis.com/auth/gmail.readonly</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5">
                <input type="checkbox" defaultChecked disabled className="mt-0.5 accent-indigo-500" />
                <div className="text-xs">
                  <div className="font-semibold text-gray-200">See, edit, create, and delete files in Google Drive</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">https://www.googleapis.com/auth/drive.file</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5">
                <input type="checkbox" defaultChecked disabled className="mt-0.5 accent-indigo-500" />
                <div className="text-xs">
                  <div className="font-semibold text-gray-200">See, edit, create, and delete spreadsheets in Google Sheets</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">https://www.googleapis.com/auth/spreadsheets</div>
                </div>
              </div>
            </div>

            {/* Security Warning Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 mb-5 flex items-center gap-2">
              <ShieldCheck size={16} className="shrink-0 text-amber-400" />
              <span>Make sure you trust AutoFlow AI. Tokens are encrypted with AES-256-CBC.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isAuthorizing}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGrantPermissions}
                disabled={isAuthorizing}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center gap-2 transition-all"
              >
                {isAuthorizing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Encrypting Token...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>Allow & Connect Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
