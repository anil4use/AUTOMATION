'use client';
import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, CheckCircle2, AlertTriangle, Code, Clock, Copy, Check, ChevronDown, Layers, Terminal } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {connectorName || connectorId} Action Test Runner
                <Badge variant="info" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  Testing Center
                </Badge>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Execute live actions with optional test inputs & inspect output variables
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Loading connector action schemas...</p>
            </div>
          ) : (
            <>
              {/* Select Action Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Select Connector Action
                </label>
                <div className="relative">
                  <select
                    value={selectedActionId}
                    onChange={(e) => handleActionChange(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer pr-10"
                  >
                    {actions.map((act) => (
                      <option key={act.actionId} value={act.actionId}>
                        {act.name} ({act.actionId})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
                {selectedAction?.description && (
                  <p className="text-xs text-slate-400 leading-relaxed pl-1">
                    {selectedAction.description}
                  </p>
                )}
              </div>

              {/* Dynamic Input Form (Optional for testing) */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    Test Input Fields
                  </h3>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    All inputs optional for testing
                  </span>
                </div>

                {Object.keys(schemaProperties).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No input arguments required for this action.</p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {Object.entries(schemaProperties).map(([propKey, propMeta]: [string, any]) => (
                      <div key={propKey} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-medium text-slate-200">
                            {propMeta.title || propKey} <code className="text-[11px] text-slate-400">({propKey})</code>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">{propMeta.type || 'string'}</span>
                        </div>
                        {propMeta.enum ? (
                          <select
                            value={inputValues[propKey] || ''}
                            onChange={(e) => handleInputChange(propKey, e.target.value)}
                            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
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
                            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={inputValues[propKey] || ''}
                            onChange={(e) => handleInputChange(propKey, e.target.value)}
                            placeholder={propMeta.description || `Enter ${propKey}...`}
                            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-emerald-500"
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
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Executing Live API Test...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" />
                        <span>Run Live Action Test</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Test Results Inspection Section */}
              {testResult && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">
                          {testResult.success ? 'Execution Succeeded' : 'Execution Failed'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {testResult.executionTimeMs || 0}ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Output Inspection Tree & Variable Click-to-Copy */}
                  {testResult.data && (
                    <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                      <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
                        <span>DYNAMIC RESPONSE PAYLOAD (Click key to copy variable tag)</span>
                        <Code className="w-3.5 h-3.5" />
                      </div>

                      {typeof testResult.data === 'object' ? (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto p-1">
                          {Object.entries(testResult.data).map(([key, val]) => (
                            <div key={key} className="flex items-start justify-between p-2 rounded bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 transition group">
                              <div className="overflow-hidden">
                                <span className="text-purple-400 font-semibold">{key}: </span>
                                <span className="text-emerald-300 break-all">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                              <button
                                onClick={() => copyVariableTag(key)}
                                className="ml-2 px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded text-[10px] transition shrink-0 flex items-center gap-1"
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
                        <pre className="p-3 bg-black/60 rounded text-emerald-400 leading-relaxed overflow-x-auto">
                          {String(testResult.data)}
                        </pre>
                      )}
                    </div>
                  )}

                  {testResult.error && (
                    <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-200">
                        <AlertTriangle className="w-4 h-4" />
                        Error Code: {testResult.error.code || 'PROVIDER_ERROR'}
                      </div>
                      <p className="leading-relaxed">{testResult.error.message}</p>
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
