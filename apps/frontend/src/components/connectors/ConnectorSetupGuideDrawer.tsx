'use client';
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, BookOpen, ShieldCheck, Key, ChevronRight, Loader2, Compass, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { getConnectorBrandSpec } from '@/lib/connector-brand-utils';

interface ConnectorSetupGuideDrawerProps {
  connectorId: string;
  connectorName?: string;
  isOpen: boolean;
  onClose: () => void;
  onConnectClick?: () => void;
}

export const ConnectorSetupGuideDrawer: React.FC<ConnectorSetupGuideDrawerProps> = ({
  connectorId,
  connectorName,
  isOpen,
  onClose,
  onConnectClick,
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [copiedRedirect, setCopiedRedirect] = useState(false);

  useEffect(() => {
    if (isOpen && connectorId) {
      setDetails(null);
      setCopiedRedirect(false);
      fetchConnectorDetails();
    } else if (!isOpen) {
      setDetails(null);
    }
  }, [isOpen, connectorId]);

  const fetchConnectorDetails = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/v2/connectors/${connectorId}`);
      if (res.data?.data) {
        setDetails(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch v2 connector details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const connector = details?.connector;
  const authSpec = details?.authSpec;
  const setupGuide = authSpec?.setupGuide;
  const redirectUri = setupGuide?.redirectUriRequirement || `http://localhost:5000/api/v1/auth/${connectorId}/callback`;
  const consoleUrl = authSpec?.providerConsoleUrl || connector?.documentationUrl || `https://developer.${connectorId}.com`;

  const brand = getConnectorBrandSpec(connectorId, connector?.categoryId);
  const BrandIcon = brand.icon;

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    toast.success('Redirect URI copied to clipboard');
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-950/95 border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-32 bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-7 border-b border-white/[0.08] bg-slate-900/60 backdrop-blur-xl flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${brand.bgGlow} border ${brand.borderGlow} flex items-center justify-center ${brand.textColor} shadow-lg shadow-black/40`}>
              <BrandIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <span>{connector?.displayName || connectorName || connectorId}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${brand.badgeBg} ${brand.textColor} border ${brand.badgeBorder} uppercase`}>
                  {connector?.categoryId || 'INTEGRATION'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Official setup guide &amp; developer console credentials
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-7 space-y-7 text-slate-300 relative z-10">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs font-medium text-slate-400">Loading guide details...</p>
            </div>
          ) : (
            <>
              {/* Provider Console Hero Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-900/90 border border-indigo-500/30 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Developer Console Portal</span>
                  </div>
                  <div className="text-base font-extrabold text-white mt-1">
                    Get Credentials &amp; API Keys
                  </div>
                </div>
                <a
                  href={consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0 border border-indigo-400/20"
                >
                  <span>Open Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Step-by-Step Setup Guide</span>
                </h3>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/40 before:to-purple-500/10">
                  {(setupGuide?.steps || [
                    `1. Click 'Open Console' to access ${connectorName || connectorId} developer portal.`,
                    `2. Create a new OAuth application or API Key token.`,
                    `3. Set Authorized Redirect URI to the link below if using OAuth 2.0.`,
                    `4. Copy Client ID and Secret, then paste into AutoFlow connection fields.`
                  ]).map((step: string, idx: number) => (
                    <div key={idx} className="relative flex items-start gap-3.5 p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/30 transition-all shadow-md">
                      <div className="absolute -left-6 top-4 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-900 border border-indigo-500/50 text-indigo-400 font-extrabold text-xs flex items-center justify-center shadow-md">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-normal">
                        {step.replace(/^\d+\.\s*/, '')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean Redirect URI Box */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/[0.08] space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>OAuth Redirect URI</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Copy for provider configuration</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <code className="flex-1 p-3 bg-slate-950 rounded-xl text-emerald-400 text-xs font-mono break-all border border-emerald-500/20 shadow-inner">
                    {redirectUri}
                  </code>
                  <button
                    onClick={copyRedirectUri}
                    className="p-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-slate-700 shrink-0"
                    title="Copy Redirect URI"
                  >
                    {copiedRedirect ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-300" />}
                  </button>
                </div>
              </div>

              {/* Credentials Fields List */}
              {authSpec?.fields && authSpec.fields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>Required Fields Specification</span>
                  </h3>
                  <div className="space-y-2.5">
                    {authSpec.fields.map((field: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] text-xs space-y-1.5 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">{field.label}</span>
                          {field.required ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">REQUIRED</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400">OPTIONAL</span>
                          )}
                        </div>
                        {field.help && <p className="text-slate-400 text-xs leading-relaxed">{field.help}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/[0.08] bg-slate-950 flex items-center justify-between gap-4 relative z-10">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Close Guide
          </button>
          {onConnectClick && (
            <button
              onClick={() => {
                onClose();
                onConnectClick();
              }}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 transform hover:-translate-y-0.5 border border-indigo-400/20"
            >
              <span>Connect {connectorName || connectorId}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
