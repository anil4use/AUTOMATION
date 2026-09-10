'use client';
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, BookOpen, ShieldCheck, Key, ChevronRight, Loader2, Sparkles, Compass } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

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
      fetchConnectorDetails();
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

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    toast.success('Redirect URI Copied to Clipboard!');
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-slate-950/95 border-l border-indigo-500/20 h-full flex flex-col shadow-[0_0_60px_rgba(99,102,241,0.2)] overflow-hidden">
        {/* Futuristic Glowing Header */}
        <div className="p-6 border-b border-slate-800/80 bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-950 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-extrabold text-xl shadow-lg shadow-indigo-500/10">
                  {connectorName?.[0] || connectorId[0]?.toUpperCase() || 'C'}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950"></span>
                </span>
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  <span>{connector?.displayName || connectorName || connectorId}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {connector?.categoryId?.toUpperCase() || 'INTEGRATION'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Developer portal link & setup guide</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-9 h-9 animate-spin text-indigo-400" />
              <p className="text-xs font-mono text-indigo-300/80">Fetching developer guide metadata...</p>
            </div>
          ) : (
            <>
              {/* Floating Provider Console Hero Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/90 border border-indigo-500/30 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" />
                      <span>Developer Console Access</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1">
                      Obtain Official Keys & Client Credentials
                    </div>
                  </div>
                  <a
                    href={consoleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shrink-0"
                  >
                    <span>Open Provider Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Futuristic Cyber Timeline Step Instructions */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Step-by-Step Integration Guide</span>
                </h3>

                <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/50 before:via-purple-500/30 before:to-transparent">
                  {(setupGuide?.steps || [
                    `1. Click 'Open Provider Console' to access ${connectorName || connectorId} developer dashboard.`,
                    `2. Register a new OAuth application or generate an API key token.`,
                    `3. Set Redirect URI to the requirement below if using OAuth 2.0.`,
                    `4. Copy Client ID and Client Secret, then paste into AutoFlow connection settings.`
                  ]).map((step: string, idx: number) => (
                    <div key={idx} className="relative pl-10">
                      <div className="absolute left-1.5 top-2.5 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border border-indigo-400/50 text-indigo-300 font-extrabold text-[11px] flex items-center justify-center shadow-md shadow-indigo-500/20">
                        {idx + 1}
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 text-xs leading-relaxed text-slate-200 hover:border-indigo-500/30 transition-all shadow-sm">
                        {step.replace(/^\d+\.\s*/, '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Futuristic Redirect URI Copy Container */}
              <div className="p-4.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 space-y-2.5 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Authorized OAuth Redirect URI</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Required in app settings</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-black/80 rounded-xl text-emerald-400 text-xs font-mono break-all border border-emerald-500/30 shadow-inner">
                    {redirectUri}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyRedirectUri}
                    className="shrink-0 bg-slate-800 hover:bg-slate-700 border-slate-700 text-white rounded-xl py-5"
                  >
                    {copiedRedirect ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Required Credentials Matrix */}
              {authSpec?.fields && authSpec.fields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    <span>Required Credentials Spec</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {authSpec.fields.map((field: any, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1 hover:border-purple-500/30 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white tracking-wide">{field.label}</span>
                          {field.required ? (
                            <Badge variant="failed" className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30 font-mono">REQUIRED</Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px] bg-slate-800 text-slate-400 border-slate-700 font-mono">OPTIONAL</Badge>
                          )}
                        </div>
                        {field.help && <p className="text-slate-400 text-[11px] leading-relaxed">{field.help}</p>}
                        {field.docUrl && (
                          <a
                            href={field.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold mt-1 transition-all"
                          >
                            <span>View Field Spec Docs</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800/90 bg-slate-950/95 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white rounded-xl">
            Close Guide
          </Button>
          {onConnectClick && (
            <Button
              onClick={() => {
                onClose();
                onConnectClick();
              }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Connect {connectorName || connectorId}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
