'use client';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Network, Database, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

interface AIProvider {
  _id: string;
  providerId: string;
  name: string;
  baseUrl: string;
  credentials?: any;
  enabled: boolean;
}

interface AIModel {
  _id: string;
  providerId: string;
  modelId: string;
  name: string;
  contextWindow: number;
  supportsTools: boolean;
  supportsJson: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsReasoning: boolean;
  inputCostPer1k?: number;
  outputCostPer1k?: number;
  priority: number;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  
  const [showModelModal, setShowModelModal] = useState(false);
  const [newModel, setNewModel] = useState<Partial<AIModel>>({
    providerId: 'gemini',
    modelId: '',
    name: '',
    contextWindow: 4096,
    supportsTools: false,
    supportsJson: false,
    supportsVision: false,
    supportsReasoning: false,
    inputCostPer1k: 0,
    outputCostPer1k: 0,
    priority: 100,
  });

  // Quick Model Test
  const [quickTestModel, setQuickTestModel] = useState<AIModel | null>(null);
  const [quickTestInput, setQuickTestInput] = useState('');
  const [quickTestResponse, setQuickTestResponse] = useState('');
  const [quickTestLoading, setQuickTestLoading] = useState(false);

  const handleQuickTest = async () => {
    if (!quickTestModel || !quickTestInput.trim()) return;
    setQuickTestLoading(true);
    setQuickTestResponse('');
    try {
      const res = await apiClient.post('/v1/ai-control-plane/test-prompt', {
        providerId: quickTestModel.providerId,
        modelId: quickTestModel.modelId,
        template: quickTestInput,
        variables: {}
      });
      setQuickTestResponse(res.data.content);
    } catch (err: any) {
      setQuickTestResponse('[ERROR]\n\n' + (err.response?.data?.error || err.message));
    } finally {
      setQuickTestLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [provRes, modRes] = await Promise.all([
        apiClient.get('/v1/ai-control-plane/providers'),
        apiClient.get('/v1/ai-control-plane/models'),
      ]);
      setProviders(provRes.data);
      setModels(modRes.data);
    } catch (err: any) {
      toast.error('Failed to load providers & models');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!editingProvider) return;
    try {
      await apiClient.put(`/v1/ai-control-plane/providers/${editingProvider.providerId}`, {
        credentials: { apiKey: apiKeyInput }
      });
      toast.success('API Key saved successfully!');
      setEditingProvider(null);
      setApiKeyInput('');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to save API key');
    }
  };

  const handleSaveModel = async () => {
    try {
      if (newModel._id) {
        await apiClient.put(`/v1/ai-control-plane/models/${newModel._id}`, newModel);
        toast.success('Model updated successfully!');
      } else {
        await apiClient.post('/v1/ai-control-plane/models', newModel);
        toast.success('Model created successfully!');
      }
      setShowModelModal(false);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to save model');
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    try {
      await apiClient.delete(`/v1/ai-control-plane/models/${id}`);
      toast.success('Model deleted!');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to delete model');
    }
  };

  const handleToggleProvider = async (p: AIProvider) => {
    try {
      await apiClient.put(`/v1/ai-control-plane/providers/${p.providerId}`, {
        enabled: !p.enabled
      });
      toast.success(`${p.name} ${!p.enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to toggle provider');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="animate-spin text-accentIndigo" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 w-full">
      {/* Providers Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Network size={22} className="text-indigo-400" />
            </div>
            Registered Providers
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((p) => (
            <div key={p.providerId} className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              {/* Subtle top glow on hover */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-white tracking-tight">{p.name}</h3>
                <button 
                  onClick={() => handleToggleProvider(p)}
                  className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${p.enabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${p.enabled ? 'left-[26px]' : 'left-1'}`} />
                </button>
              </div>
              
              <div className="space-y-4 text-sm mt-4">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <span className="text-textMuted font-medium">Provider ID</span>
                  <span className="text-indigo-300 font-mono bg-indigo-500/10 px-2 py-1 rounded-md">{p.providerId}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-textMuted font-medium">Configuration</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold ${p.credentials && p.credentials.apiKey ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.credentials && p.credentials.apiKey ? 'Ready (API Key Setup)' : 'Missing Setup'}
                    </span>
                    <button 
                      onClick={() => setEditingProvider(p)}
                      className="bg-white/5 hover:bg-white/10 text-xs px-2 py-1 rounded border border-white/10 transition-colors"
                    >
                      Config
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Models Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Database size={22} className="text-purple-400" />
            </div>
            Available Models
          </h2>
          <button 
            onClick={() => {
              setNewModel({
                providerId: 'gemini', modelId: '', name: '', contextWindow: 4096,
                supportsTools: false, supportsJson: false, supportsVision: false, supportsReasoning: false,
                inputCostPer1k: 0, outputCostPer1k: 0, priority: 100
              });
              setShowModelModal(true);
            }}
            className="bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold tracking-wide transition-all border border-purple-500/20"
          >
            + Add Model
          </button>
        </div>
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-textMuted border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Model ID</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Provider</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Context Window</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Capabilities</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Cost / 1K (In/Out)</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Priority</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-textSecondary">
              {models.map((m) => (
                <tr key={m._id} className="hover:bg-white/[0.04] transition-colors group">
                  <td className="px-6 py-4 font-mono text-sm text-white group-hover:text-indigo-300 transition-colors">{m.modelId}</td>
                  <td className="px-6 py-4">
                    <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-textSecondary">{m.providerId}</span>
                  </td>
                  <td className="px-6 py-4 text-white font-medium">{m.contextWindow.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {m.supportsTools && <span className="bg-indigo-500/10 text-indigo-400 text-[11px] px-2 py-1 rounded-md border border-indigo-500/20 font-medium tracking-wide">Tools</span>}
                      {m.supportsJson && <span className="bg-emerald-500/10 text-emerald-400 text-[11px] px-2 py-1 rounded-md border border-emerald-500/20 font-medium tracking-wide">JSON</span>}
                      {m.supportsVision && <span className="bg-sky-500/10 text-sky-400 text-[11px] px-2 py-1 rounded-md border border-sky-500/20 font-medium tracking-wide">Vision</span>}
                      {m.supportsReasoning && <span className="bg-purple-500/10 text-purple-400 text-[11px] px-2 py-1 rounded-md border border-purple-500/20 font-medium tracking-wide">Reason</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-textMuted w-6">In:</span>
                      <span className="text-emerald-400 font-mono font-medium">${m.inputCostPer1k || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-textMuted w-6">Out:</span>
                      <span className="text-rose-400 font-mono font-medium">${m.outputCostPer1k || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs">
                      {m.priority}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setNewModel(m);
                        setShowModelModal(true);
                      }}
                      className="text-indigo-400/70 hover:text-indigo-400 text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-500/10 transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteModel(m._id)}
                      className="text-rose-400/70 hover:text-rose-400 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        setQuickTestModel(m);
                        setQuickTestInput('');
                        setQuickTestResponse('');
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      <Play size={11} className="fill-current" /> Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Provider Config Modal */}
      {editingProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-[400px] shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Configure {editingProvider.name}</h3>
            <div className="mb-4">
              <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">API Key</label>
              <input 
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500"
                placeholder={`Enter ${editingProvider.name} API Key...`}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingProvider(null)} className="px-4 py-2 rounded-xl hover:bg-white/5 text-sm font-medium">Cancel</button>
              <button onClick={handleSaveApiKey} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-xl text-white text-sm font-bold">Save Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {showModelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-[600px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {newModel._id ? 'Edit LLM Model' : 'Add New LLM Model'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Provider ID</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                  value={newModel.providerId}
                  onChange={e => setNewModel({...newModel, providerId: e.target.value})}
                >
                  {providers.map(p => <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e] text-white">{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Model ID</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono"
                  placeholder="e.g. gpt-4o"
                  value={newModel.modelId}
                  onChange={e => setNewModel({...newModel, modelId: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Display Name</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                  value={newModel.name}
                  onChange={e => setNewModel({...newModel, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Context Window</label>
                <input 
                  type="number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono"
                  value={newModel.contextWindow}
                  onChange={e => setNewModel({...newModel, contextWindow: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Input Cost / 1K</label>
                <input 
                  type="number" step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono"
                  value={newModel.inputCostPer1k}
                  onChange={e => setNewModel({...newModel, inputCostPer1k: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Output Cost / 1K</label>
                <input 
                  type="number" step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono"
                  value={newModel.outputCostPer1k}
                  onChange={e => setNewModel({...newModel, outputCostPer1k: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {['supportsTools', 'supportsJson', 'supportsVision', 'supportsReasoning'].map(cap => (
                <label key={cap} className="flex items-center gap-3 text-sm cursor-pointer p-2 bg-white/5 rounded-xl border border-white/10">
                  <input 
                    type="checkbox" 
                    className="rounded"
                    checked={(newModel as any)[cap]} 
                    onChange={e => setNewModel({...newModel, [cap]: e.target.checked})} 
                  />
                  <span className="capitalize">{cap.replace('supports', '')}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t border-white/10 pt-4">
              <button onClick={() => setShowModelModal(false)} className="px-4 py-2 rounded-xl hover:bg-white/5 text-sm font-medium text-white">Cancel</button>
              <button onClick={handleSaveModel} className="px-5 py-2 bg-purple-500 hover:bg-purple-400 rounded-xl text-white text-sm font-bold">
                {newModel._id ? 'Save Changes' : 'Create Model'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Test Modal */}
      {quickTestModel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B0C10] border border-emerald-500/30 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <Play size={16} className="text-emerald-400 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Quick Model Test</h3>
                  <p className="text-xs text-textMuted font-mono mt-0.5">
                    {quickTestModel.providerId} / <span className="text-emerald-400">{quickTestModel.modelId}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setQuickTestModel(null)} className="text-textMuted hover:text-white p-2 transition-colors">✕</button>
            </div>

            {/* Input */}
            <div className="p-5 border-b border-white/10">
              <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-3 block">Your Message</label>
              <div className="flex gap-3">
                <textarea
                  rows={3}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-sans resize-none focus:border-emerald-500/50 focus:outline-none placeholder:text-textMuted/50 custom-scrollbar"
                  placeholder="Type anything... e.g. 'What is the capital of France?' or 'Write a haiku about code'"
                  value={quickTestInput}
                  onChange={e => setQuickTestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleQuickTest(); }}
                />
                <button
                  onClick={handleQuickTest}
                  disabled={quickTestLoading || !quickTestInput.trim()}
                  className="px-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-textMuted text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center gap-1 min-w-[80px]"
                >
                  {quickTestLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Play size={16} className="fill-current" />
                      <span className="text-[10px]">Ctrl+↵</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-textMuted/50 mt-2">Press Ctrl+Enter to send</p>
            </div>

            {/* Response */}
            <div className="p-5 flex-1 min-h-[200px]">
              <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-3 block">Response</label>
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 min-h-[150px] max-h-[300px] overflow-y-auto custom-scrollbar">
                {quickTestLoading ? (
                  <div className="flex items-center gap-3 text-textMuted">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    <span className="text-sm">Generating response...</span>
                  </div>
                ) : quickTestResponse ? (
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap font-sans ${quickTestResponse.startsWith('[ERROR]') ? 'text-rose-400 font-mono text-xs' : 'text-[#e0e0e0]'}`}>
                    {quickTestResponse}
                  </p>
                ) : (
                  <p className="text-textMuted/40 text-sm italic">Response will appear here...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
