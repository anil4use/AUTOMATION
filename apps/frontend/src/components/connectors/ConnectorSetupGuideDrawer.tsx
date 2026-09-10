'use client';
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, BookOpen, ShieldCheck, Key, HelpCircle, ChevronRight, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
              {connectorName?.[0] || connectorId[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {connector?.displayName || connectorName || connectorId} Setup Guide
                <Badge variant="info" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  {connector?.categoryId || 'Integration'}
                </Badge>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Authentication instructions & developer portal setup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs">Loading developer guide metadata...</p>
            </div>
          ) : (
            <>
              {/* Direct Provider Redirect Console Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Developer Portal Access
                  </div>
                  <div className="text-sm font-medium text-white mt-1">
                    Need Client ID or API Tokens?
                  </div>
                </div>
                <a
                  href={consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 transition"
                >
                  <span>Open Provider Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Step-by-Step Setup Instructions
                </h3>

                <div className="space-y-2.5">
                  {(setupGuide?.steps || [
                    `1. Click 'Open Provider Console' to access ${connectorName || connectorId} developer dashboard.`,
                    `2. Register a new OAuth application or generate an API key token.`,
                    `3. Set Redirect URI to the requirement below if using OAuth 2.0.`,
                    `4. Copy Client ID and Client Secret, then paste into AutoFlow connection settings.`
                  ]).map((step: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-800/60 border border-slate-800 text-xs leading-relaxed text-slate-200">
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Redirect URI Box */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Authorized Redirect URI
                  </span>
                  <span className="text-[10px] text-slate-400">Copy for OAuth App Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2.5 bg-black/60 rounded-lg text-emerald-400 text-xs font-mono break-all border border-slate-800">
                    {redirectUri}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={copyRedirectUri}
                    className="shrink-0 bg-slate-700 hover:bg-slate-600 border-slate-600 text-white"
                  >
                    {copiedRedirect ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Input Fields Help Matrix */}
              {authSpec?.fields && authSpec.fields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" />
                    Required Credentials & Fields
                  </h3>
                  <div className="space-y-2">
                    {authSpec.fields.map((field: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{field.label}</span>
                          {field.required ? (
                            <Badge variant="failed" className="text-[10px] text-amber-400 border-amber-500/20 bg-amber-500/10">Required</Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px] text-slate-400 border-slate-700">Optional</Badge>
                          )}
                        </div>
                        {field.help && <p className="text-slate-400 text-[11px]">{field.help}</p>}
                        {field.docUrl && (
                          <a
                            href={field.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline mt-1"
                          >
                            <span>Field Documentation</span>
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
            Close Guide
          </Button>
          {onConnectClick && (
            <Button
              onClick={() => {
                onClose();
                onConnectClick();
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2"
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
