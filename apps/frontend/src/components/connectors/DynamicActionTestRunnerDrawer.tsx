'use client';
import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, CheckCircle2, AlertTriangle, Code, Clock, Copy, Check, ChevronDown, Layers, Terminal, Zap, Sparkles, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { getConnectorBrandSpec } from '@/lib/connector-brand-utils';

interface DynamicActionTestRunnerDrawerProps {
  connectorId: string;
  connectorName?: string;
  isOpen: boolean;
  onClose: () => void;
}

function getDefaultInputValue(propKey: string, propMeta: any, actionId: string = '', connectorId: string = ''): string {
  const k = propKey.toLowerCase();

  if (k === 'to' || k === 'recipient' || k === 'email') {
    return 'anil4use@gmail.com';
  }
  if (k === 'subject') {
    return 'AutoFlow Verification Test Email';
  }
  if (k === 'body' || k === 'html' || k === 'content') {
    return 'Hello! This is an automated test email executed live from AutoFlow Action Test Runner.';
  }
  if (k === 'channel') {
    return 'general';
  }
  if (k === 'text' || k === 'message') {
    return 'AutoFlow live connector action test verified!';
  }
  if (k === 'prompt') {
    return 'Explain AI automation in 1 sentence.';
  }
  if (k === 'query' || k === 'sql') {
    return 'SELECT 1 as live_test_connection;';
  }
  if (k === 'title' || k === 'summary') {
    return 'AutoFlow Live Verification Item';
  }
  if (k === 'description') {
    return 'Created automatically during live action test run.';
  }
  if (k === 'maxresults' || k === 'limit') {
    return '5';
  }
  if (propMeta?.default) {
    return String(propMeta.default);
  }
  return '';
}

export const DynamicActionTestRunnerDrawer: React.FC<DynamicActionTestRunnerDrawerProps> = ({
  connectorId,
  connectorName,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<any[]>([]);
  const [selectedActionId, setSelectedActionId] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && connectorId) {
      fetchConnectorActions();
    }
  }, [isOpen, connectorId]);

  const initializeDefaultsForAction = (act: any) => {
    if (!act) return {};
    const props = act.inputSchema?.properties || {};
    const defaults: Record<string, any> = {};
    Object.entries(props).forEach(([propKey, propMeta]: [string, any]) => {
      defaults[propKey] = getDefaultInputValue(propKey, propMeta, act.actionId, connectorId);
    });
    return defaults;
  };

  const fetchConnectorActions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/v2/connectors/${connectorId}`);
      if (res.data?.data?.actions) {
        const actionList = res.data.data.actions || [];
        setActions(actionList);
        if (actionList.length > 0) {
          const firstAct = actionList[0];
          setSelectedActionId(firstAct.actionId);
          setSelectedAction(firstAct);
          setInputValues(initializeDefaultsForAction(firstAct));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch connector actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionChange = (actionId: string) => {
    setSelectedActionId(actionId);
    const act = actions.find((a) => a.actionId === actionId);
    setSelectedAction(act || null);
    setInputValues(initializeDefaultsForAction(act));
    setTestResult(null);
  };

  const handleInputChange = (key: string, val: any) => {
    setInputValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleResetDefaults = () => {
    if (selectedAction) {
      setInputValues(initializeDefaultsForAction(selectedAction));
      toast.info('Reset input arguments to default test values');
    }
  };

  const handleRunTest = async () => {
    if (!selectedActionId) return;

    try {
      setTesting(true);
      setTestResult(null);

      // Clean empty string values for optional payload fields
      const cleanInput: Record<string, any> = {};
      Object.entries(inputValues).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) {
          cleanInput[k] = v;
        }
      });

      const res = await apiClient.post(`/v2/connectors/${connectorId}/test`, {
        actionId: selectedActionId,
        input: cleanInput,
      });

      setTestResult(res.data);
      if (res.data?.success) {
        toast.success(`Action test passed (${res.data.executionTimeMs || 0}ms)`, {
          description: `Successfully executed '${selectedAction?.name || selectedActionId}'.`,
        });
      } else {
        toast.error(`Action test failed`, {
          description: res.data?.error?.message || 'Execution failed.',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Live API test failed.';
      setTestResult({
        success: false,
        error: { code: 'PROVIDER_ERROR', message: msg },
      });
      toast.error('Action test failed', { description: msg });
    } finally {
      setTesting(false);
    }
  };

  const copyVariableTag = (keyPath: string) => {
    const tag = `{{step_1.output.${keyPath}}}`;
    navigator.clipboard.writeText(tag);
    setCopiedKey(keyPath);
    toast.success(`Copied Dynamic Tag`, { description: tag });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const brand = getConnectorBrandSpec(connectorId);
  const BrandIcon = brand.icon;

  const schemaProperties = selectedAction?.inputSchema?.properties || {};
  const requiredFields: string[] = selectedAction?.inputSchema?.required || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-slate-950/95 border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden relative">
        {/* Ambient Glow background */}
        <div className="absolute top-0 right-0 w-96 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="p-7 border-b border-white/[0.08] bg-slate-900/60 backdrop-blur-xl flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${brand.bgGlow} border ${brand.borderGlow} flex items-center justify-center ${brand.textColor} shadow-lg shadow-black/40`}>
              <BrandIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <span>{connectorName || connectorId} Action Testing</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  TEST RUNNER
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Execute actions with discrete field inputs &amp; inspect dynamic output payload
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
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs font-medium text-slate-400">Loading action operations...</p>
            </div>
          ) : (
            <>
              {/* Operation Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Select Operation ({actions.length} Available)</span>
                  </span>
                </label>

                {actions.length <= 4 && actions.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {actions.map((act) => {
                      const isSelected = act.actionId === selectedActionId;
                      return (
                        <button
                          key={act.actionId}
                          onClick={() => handleActionChange(act.actionId)}
                          className={`p-3.5 rounded-2xl text-left transition-all border ${
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white shadow-lg shadow-emerald-500/5'
                              : 'bg-slate-900/60 border-white/[0.08] text-slate-400 hover:text-white hover:bg-slate-900/90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-xs tracking-tight text-white">{act.name}</span>
                            <code className="text-[10px] font-mono text-emerald-400">{act.actionId}</code>
                          </div>
                          {act.description && (
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{act.description}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedActionId}
                      onChange={(e) => handleActionChange(e.target.value)}
                      className="w-full p-4 bg-slate-900 border border-white/10 rounded-2xl text-white text-sm font-semibold focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer pr-10 shadow-sm"
                    >
                      {actions.map((act) => (
                        <option key={act.actionId} value={act.actionId} className="bg-slate-900 text-white">
                          {act.name} ({act.actionId})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-4.5 pointer-events-none" />
                  </div>
                )}

                {selectedAction?.description && actions.length > 4 && (
                  <p className="text-xs text-slate-400 leading-relaxed pl-1 font-normal">
                    {selectedAction.description}
                  </p>
                )}
              </div>

              {/* Input Form Fields */}
              <div className="space-y-4 p-6 rounded-2xl bg-slate-900/60 border border-white/[0.08] shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    <span>Payload Input Parameters</span>
                  </h3>
                  <button
                    onClick={handleResetDefaults}
                    className="text-[10px] text-slate-400 hover:text-white font-mono bg-white/[0.04] hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span>Pre-fill Defaults</span>
                  </button>
                </div>

                {Object.keys(schemaProperties).length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 italic bg-slate-950/50 rounded-xl border border-white/[0.04]">
                    No input parameters required for this operation.
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    {Object.entries(schemaProperties).map(([propKey, propMeta]: [string, any]) => {
                      const isRequired = requiredFields.includes(propKey);
                      return (
                        <div key={propKey} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-bold text-white flex items-center gap-1.5">
                              <span>{propMeta.title || propKey}</span>
                              <code className="text-[11px] text-emerald-400 font-mono font-normal">({propKey})</code>
                            </label>
                            {isRequired ? (
                              <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">REQUIRED</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">OPTIONAL</span>
                            )}
                          </div>
                          {propMeta.description && (
                            <p className="text-[11px] text-slate-400 leading-tight">{propMeta.description}</p>
                          )}
                          {propMeta.enum ? (
                            <select
                              value={inputValues[propKey] ?? ''}
                              onChange={(e) => handleInputChange(propKey, e.target.value)}
                              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-emerald-500 outline-none"
                            >
                              <option value="">-- Select {propKey} --</option>
                              {propMeta.enum.map((opt: string) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : propMeta.type === 'string' && (propKey.toLowerCase().includes('body') || propKey.toLowerCase().includes('content') || propKey.toLowerCase().includes('query') || propKey.toLowerCase().includes('html')) ? (
                            <textarea
                              rows={3}
                              value={inputValues[propKey] ?? ''}
                              onChange={(e) => handleInputChange(propKey, e.target.value)}
                              placeholder={propMeta.description || `Enter ${propKey}...`}
                              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition-all font-sans"
                            />
                          ) : (
                            <input
                              type="text"
                              value={inputValues[propKey] ?? ''}
                              onChange={(e) => handleInputChange(propKey, e.target.value)}
                              placeholder={propMeta.description || `Enter ${propKey}...`}
                              className="w-full p-3 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none transition-all"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleRunTest}
                    disabled={testing}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 border border-emerald-400/20"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Executing Live Action Test...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Execute Live Action Test</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Console Output Inspection */}
              {testResult && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      {testResult.success ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">
                          {testResult.success ? 'Action Execution Succeeded' : 'Action Execution Failed'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Latency: {testResult.executionTimeMs || 0}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Output Inspection Box */}
                  {testResult.data && (
                    <div className="space-y-3 p-5 rounded-2xl bg-slate-950 border border-white/10 font-mono text-xs shadow-inner">
                      <div className="flex items-center justify-between text-emerald-400 pb-2 border-b border-white/[0.06] text-[11px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>DYNAMIC RESPONSE PAYLOAD (Click key to copy variable tag)</span>
                        </span>
                      </div>

                      {typeof testResult.data === 'object' ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                          {Object.entries(testResult.data).map(([key, val]) => (
                            <div key={key} className="flex items-start justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/[0.06] transition-all">
                              <div className="overflow-hidden">
                                <span className="text-purple-300 font-bold">{key}: </span>
                                <span className="text-emerald-400 break-all">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                              <button
                                onClick={() => copyVariableTag(key)}
                                className="ml-3 px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all shrink-0 flex items-center gap-1"
                                title="Click to copy dynamic variable tag"
                              >
                                {copiedKey === key ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{`{{${key}}}`}</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="p-4 bg-slate-900/80 rounded-xl text-emerald-400 leading-relaxed overflow-x-auto">
                          {String(testResult.data)}
                        </pre>
                      )}
                    </div>
                  )}

                  {testResult.error && (
                    <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-300 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-rose-200">
                        <AlertTriangle className="w-4 h-4" />
                        Error Code: {testResult.error.code || 'PROVIDER_ERROR'}
                      </div>
                      <p className="leading-relaxed font-mono">{testResult.error.message}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
