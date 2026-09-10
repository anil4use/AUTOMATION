'use client';
import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, CheckCircle2, AlertTriangle, Code, Clock, Copy, Check, ChevronDown, Layers, Terminal, Sparkles, Zap } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface DynamicActionTestRunnerDrawerProps {
  connectorId: string;
  connectorName?: string;
  isOpen: boolean;
  onClose: () => void;
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

  const fetchConnectorActions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/v2/connectors/${connectorId}`);
      if (res.data?.data?.actions) {
        const actionList = res.data.data.actions || [];
        setActions(actionList);
        if (actionList.length > 0) {
          setSelectedActionId(actionList[0].actionId);
          setSelectedAction(actionList[0]);
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
    setInputValues({});
    setTestResult(null);
  };

  const handleInputChange = (key: string, val: any) => {
    setInputValues((prev) => ({ ...prev, [key]: val }));
  };

  const handleRunTest = async () => {
    if (!selectedActionId) return;

    try {
      setTesting(true);
      setTestResult(null);

      const res = await apiClient.post(`/v2/connectors/${connectorId}/test`, {
        actionId: selectedActionId,
        input: inputValues,
      });

      setTestResult(res.data);
      if (res.data?.success) {
        toast.success(`Action Test Passed! (${res.data.executionTimeMs || 0}ms)`, {
          description: `Successfully executed '${selectedAction?.name || selectedActionId}' action.`,
        });
      } else {
        toast.error(`Action Test Failed`, {
          description: res.data?.error?.message || 'Execution failed.',
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Live API test failed.';
      setTestResult({
        success: false,
        error: { code: 'PROVIDER_ERROR', message: msg },
      });
      toast.error('Action Test Failed', { description: msg });
    } finally {
      setTesting(false);
    }
  };

  const copyVariableTag = (keyPath: string) => {
    const tag = `{{step_1.output.${keyPath}}}`;
    navigator.clipboard.writeText(tag);
    setCopiedKey(keyPath);
    toast.success(`Copied Variable Tag`, { description: tag });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const schemaProperties = selectedAction?.inputSchema?.properties || {};

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-slate-950/95 border-l border-emerald-500/20 h-full flex flex-col shadow-[0_0_60px_rgba(16,185,129,0.2)] overflow-hidden">
        {/* Futuristic Cyber Terminal Header */}
        <div className="p-6 border-b border-slate-800/80 bg-gradient-to-r from-emerald-950/70 via-teal-950/40 to-slate-950 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold shadow-lg shadow-emerald-500/10">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  <span>{connectorName || connectorId} Test Runner</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    LIVE ENGINE
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execute 410+ platform actions & inspect dynamic JSON output</span>
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-400" />
              <p className="text-xs font-mono text-emerald-300/80">Loading action schemas & endpoints...</p>
            </div>
          ) : (
            <>
              {/* Select Action Dropdown */}
              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Select Action Operation ({actions.length} available)</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedActionId}
                    onChange={(e) => handleActionChange(e.target.value)}
                    className="w-full p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer pr-10 shadow-inner"
                  >
                    {actions.map((act) => (
                      <option key={act.actionId} value={act.actionId} className="bg-slate-900 text-white">
                        {act.name} ({act.actionId})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-4 pointer-events-none" />
                </div>
                {selectedAction?.description && (
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    {selectedAction.description}
                  </div>
                )}
              </div>

              {/* Dynamic Input Form (Optional for testing) */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    <span>Action Payload Arguments</span>
                  </h3>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    OPTIONAL FOR TESTING
                  </span>
                </div>

                {Object.keys(schemaProperties).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                    No input parameters required for this action. Click run below!
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {Object.entries(schemaProperties).map(([propKey, propMeta]: [string, any]) => (
                      <div key={propKey} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-slate-200">
                            {propMeta.title || propKey} <code className="text-[10px] text-slate-400 font-mono">({propKey})</code>
                          </label>
                          <span className="text-[10px] text-emerald-400/80 font-mono">{propMeta.type || 'string'}</span>
                        </div>
                        {propMeta.enum ? (
                          <select
                            value={inputValues[propKey] || ''}
                            onChange={(e) => handleInputChange(propKey, e.target.value)}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500"
                          >
                            <option value="">-- Select {propKey} --</option>
                            {propMeta.enum.map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : propMeta.type === 'string' && propMeta.title?.toLowerCase().includes('body') ? (
                          <textarea
                            rows={3}
                            value={inputValues[propKey] || ''}
                            onChange={(e) => handleInputChange(propKey, e.target.value)}
                            placeholder={propMeta.description || `Enter ${propKey}...`}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={inputValues[propKey] || ''}
                            onChange={(e) => handleInputChange(propKey, e.target.value)}
                            placeholder={propMeta.description || `Enter ${propKey}...`}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    onClick={handleRunTest}
                    disabled={testing}
                    className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transform hover:-translate-y-0.5 transition-all"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Executing Live API Strategy...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Execute Live Action Test</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Cyber Console Output Inspector */}
              {testResult && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                    <div className="flex items-center gap-3">
                      {testResult.success ? (
                        <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-black text-white">
                          {testResult.success ? 'Action Execution Succeeded' : 'Action Execution Failed'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span className="flex items-center gap-1 text-emerald-300">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Latency: {testResult.executionTimeMs || 0}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Output Inspection Tree & Variable Click-to-Copy */}
                  {testResult.data && (
                    <div className="space-y-2 p-4 rounded-2xl bg-black/90 border border-emerald-500/30 font-mono text-xs shadow-inner">
                      <div className="flex items-center justify-between text-emerald-400/90 pb-2.5 border-b border-slate-800 text-[11px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>DYNAMIC RESPONSE PAYLOAD (Click to copy variable tag)</span>
                        </span>
                      </div>

                      {typeof testResult.data === 'object' ? (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto p-1">
                          {Object.entries(testResult.data).map(([key, val]) => (
                            <div key={key} className="flex items-start justify-between p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 transition-all group">
                              <div className="overflow-hidden">
                                <span className="text-purple-300 font-bold">{key}: </span>
                                <span className="text-emerald-400 break-all">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                              <button
                                onClick={() => copyVariableTag(key)}
                                className="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm"
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
                        <pre className="p-3.5 bg-black/80 rounded-xl text-emerald-400 leading-relaxed overflow-x-auto">
                          {String(testResult.data)}
                        </pre>
                      )}
                    </div>
                  )}

                  {testResult.error && (
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1.5 shadow-lg">
                      <div className="font-black flex items-center gap-1.5 text-rose-200">
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
