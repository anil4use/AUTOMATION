'use client';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Network, Database, Loader2, Play, RefreshCw, Zap, Cpu, Code2, Brain, Award, Clock, Eye, Columns, List } from 'lucide-react';
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
  avgLatencyMs?: number;
  successRate?: number;
  totalExecutions?: number;
  recommendedUseCase?: string;
}

const TEST_PRESETS = [
  {
    id: 'planner',
    name: '⚡ Agent Intent Planner',
    icon: Zap,
    tag: 'Workflow Execution',
    description: 'Tests multi-step JSON tool execution planning for connected apps',
    prompt: `You are the AutoFlow AI Agent Planner. Convert the user request into a strict valid JSON execution plan using ONLY connected apps below:
Connected Apps:
1. mongodb (action: find_documents, inputs: { database, collection, filter })
2. gmail (action: send_email, inputs: { to, subject, body })

User Request: "Find all users in database 'production_db' collection 'users' where status is 'active', then send each an email with subject 'System Upgrade Notice' and body 'Your account is updated'."

Output schema:
{
  "plan": [
    { "stepId": "step_1", "connectorId": "mongodb", "actionId": "find_documents", "inputs": { "database": "production_db", "collection": "users", "filter": { "status": "active" } } },
    { "stepId": "step_2", "connectorId": "gmail", "actionId": "send_email", "forEach": "{{step_1.output.documents}}", "inputs": { "to": "{{item.email}}", "subject": "System Upgrade Notice", "body": "Your account is updated" } }
  ]
}
Respond strictly with valid JSON. No explanations.`,
  },
  {
    id: 'extraction',
    name: '🔍 Data Normalization',
    icon: Cpu,
    tag: 'Schema Parsing',
    description: 'Tests strict JSON schema compliance and parsing messy unstructured text',
    prompt: `Extract all lead contacts from the text into a clean JSON array with keys: name, email, phone, company, priority (High/Medium/Low).

Text:
"Contact Sarah Connor (sarah@cyberdyne.io, +1-555-0199) from Cyberdyne Systems - high priority deal ($150k). Also reach out to John Doe (john@acme.com) at Acme Corp next Tuesday."

Respond ONLY with valid JSON array:`,
  },
  {
    id: 'code',
    name: '💻 TypeScript Automation',
    icon: Code2,
    tag: 'Script Generation',
    description: 'Tests coding skill, payload parsing, and error handling syntax',
    prompt: `Write a TypeScript async function \`processWebhook(event: any)\` that validates a Stripe invoice.payment_succeeded webhook event, extracts customer_email, amount_paid, and subscription_id, and constructs an HTTP POST payload for a Slack notification webhook. Include clean error handling.`,
  },
  {
    id: 'reasoning',
    name: '🧠 Complex Logic & Conflict',
    icon: Brain,
    tag: 'Multi-Step Logic',
    description: 'Tests multi-constraint logic reasoning and API rate-limit strategy',
    prompt: `Analyze this automation engine constraint conflict and recommend an optimal execution strategy:
Constraint A: User wants to sync 10,000 database records to Google Sheets every 5 minutes.
Constraint B: Google Sheets API limit is 300 requests/minute and max 5,000 rows per batch call.
Constraint C: Circuit breaker triggers if API failure rate exceeds 3%.

Provide a concise, 3-step pagination, chunking, and backoff strategy.`,
  },
];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

  // Quick Model Test Modal
  const [quickTestModel, setQuickTestModel] = useState<AIModel | null>(null);
  const [quickTestInput, setQuickTestInput] = useState('');
  const [quickTestResponse, setQuickTestResponse] = useState('');
  const [quickTestLoading, setQuickTestLoading] = useState(false);
  const [testMetrics, setTestMetrics] = useState<{
    latencyMs?: number;
    tokensPerSec?: number;
    inputTokens?: number;
    outputTokens?: number;
  } | null>(null);

  // Live Benchmark Suite
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('planner');
  const [benchmarking, setBenchmarking] = useState(false);
  const [viewMode, setViewMode] = useState<'leaderboard' | 'compare'>('leaderboard');
  const [benchmarkResults, setBenchmarkResults] = useState<Array<{
    modelId: string;
    providerId: string;
    latencyMs: number;
    tokensPerSec: number;
    success: boolean;
    fullContent: string;
    error?: string;
  }>>([]);

  // Full Response Viewer Modal
  const [inspectingResult, setInspectingResult] = useState<{
    modelId: string;
    providerId: string;
    latencyMs: number;
    tokensPerSec: number;
    fullContent: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      const [provRes, modRes] = await Promise.all([
        apiClient.get('/v1/ai-control-plane/providers'),
        apiClient.get('/v1/ai-control-plane/models'),
      ]);

      const provList = Array.isArray(provRes.data)
        ? provRes.data
        : Array.isArray(provRes.data?.data)
        ? provRes.data.data
        : [];

      const modList = Array.isArray(modRes.data)
        ? modRes.data
        : Array.isArray(modRes.data?.data)
        ? modRes.data.data
        : [];

      setProviders(provList);
      setModels(modList);
    } catch (err: any) {
      toast.error('Failed to load providers & models');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncProviders = async () => {
    setSyncing(true);
    try {
      await apiClient.post('/v1/ai-control-plane/providers/sync');
      toast.success('Synced AI providers & models from environment!');
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to sync providers: ' + (err.response?.data?.error || err.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickTest = async () => {
    if (!quickTestModel || !quickTestInput.trim()) return;
    setQuickTestLoading(true);
    setQuickTestResponse('');
    setTestMetrics(null);
    try {
      const res = await apiClient.post('/v1/ai-control-plane/test-prompt', {
        providerId: quickTestModel.providerId,
        modelId: quickTestModel.modelId,
        template: quickTestInput,
        variables: {}
      });

      setQuickTestResponse(res.data.content);
      if (res.data.latencyMs) {
        setTestMetrics({
          latencyMs: res.data.latencyMs,
          tokensPerSec: res.data.tokensPerSec,
          inputTokens: res.data.inputTokens,
          outputTokens: res.data.outputTokens,
        });
      }
      fetchData(); // Refresh table!
    } catch (err: any) {
      setQuickTestResponse('[ERROR]\n\n' + (err.response?.data?.error || err.message));
    } finally {
      setQuickTestLoading(false);
    }
  };

  const handleRunFullBenchmark = async () => {
    const preset = TEST_PRESETS.find(p => p.id === selectedPresetId) || TEST_PRESETS[0];
    setBenchmarking(true);
    setBenchmarkResults([]);

    toast.info(`Starting live benchmark across all ${models.length} verified models...`);

    // Benchmark all models concurrently in parallel
    const promises = models.map(async (m) => {
      try {
        const res = await apiClient.post('/v1/ai-control-plane/test-prompt', {
          providerId: m.providerId,
          modelId: m.modelId,
          template: preset.prompt,
          variables: {}
        });

        return {
          modelId: m.modelId,
          providerId: m.providerId,
          latencyMs: res.data.latencyMs || 0,
          tokensPerSec: res.data.tokensPerSec || 0,
          success: true,
          fullContent: res.data.content || '',
        };
      } catch (err: any) {
        return {
          modelId: m.modelId,
          providerId: m.providerId,
          latencyMs: 99999,
          tokensPerSec: 0,
          success: false,
          fullContent: '',
          error: err.response?.data?.error || err.message || 'Execution Error',
        };
      }
    });

    const results = await Promise.all(promises);
    setBenchmarkResults(results);
    setBenchmarking(false);
    toast.success('Live Benchmark Completed!');
    fetchData();
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
        <Loader2 className="animate-spin text-indigo-400" />
      </div>
    );
  }

  const sortedResults = [...benchmarkResults].sort((a, b) => a.latencyMs - b.latencyMs);
  const winner = sortedResults.find(r => r.success);

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
          <button
            onClick={handleSyncProviders}
            disabled={syncing}
            className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border border-indigo-500/20 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync from Env
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {providers.map((p) => (
            <div key={p.providerId} className="group relative bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 overflow-hidden">
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
                  <span className="text-indigo-300 font-mono bg-indigo-500/10 px-2 py-1 rounded-md text-xs">{p.providerId}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-textMuted font-medium">Configuration</span>
                  <div className="flex items-center gap-3">
                    <span className={`font-semibold text-xs ${p.credentials && p.credentials.apiKey ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.credentials && p.credentials.apiKey ? 'Ready' : 'Missing Key'}
                    </span>
                    <button 
                      onClick={() => setEditingProvider(p)}
                      className="bg-white/5 hover:bg-white/10 text-xs px-2 py-1 rounded border border-white/10 transition-colors text-white"
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
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Database size={22} className="text-purple-400" />
              </div>
              Available Models
            </h2>
            <span className="text-xs font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-textMuted">
              {models.length} Models Verified
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBenchmarkModal(true)}
              className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border border-emerald-500/20 flex items-center gap-2 shadow-sm"
            >
              <Award size={14} /> Run Live Benchmark Suite
            </button>
            <button 
              onClick={() => {
                setNewModel({
                  providerId: 'gemini', modelId: '', name: '', contextWindow: 4096,
                  supportsTools: false, supportsJson: false, supportsVision: false, supportsReasoning: false,
                  inputCostPer1k: 0, outputCostPer1k: 0, priority: 100
                });
                setShowModelModal(true);
              }}
              className="bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border border-purple-500/20"
            >
              + Add Model
            </button>
          </div>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-textMuted border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Model ID</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Provider</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Real API Speed</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">App Fit / Recommendation</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Context</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Capabilities</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-textSecondary">
              {models.map((m) => (
                <tr key={m._id} className="hover:bg-white/[0.04] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm text-white group-hover:text-indigo-300 transition-colors font-bold">{m.modelId}</div>
                    <div className="text-[11px] text-textMuted mt-0.5">{m.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-textSecondary uppercase tracking-wider">{m.providerId}</span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {m.avgLatencyMs ? (
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-md border font-bold flex items-center gap-1 ${
                          m.avgLatencyMs < 1800 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          m.avgLatencyMs < 3500 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        }`}>
                          <Clock size={12} /> {m.avgLatencyMs} ms
                        </span>
                        {m.successRate !== undefined && (
                          <span className="text-[11px] text-textMuted">{m.successRate}% OK</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-textMuted text-xs italic flex items-center gap-1">
                        <Zap size={12} className="text-amber-400" /> Tested on Demand
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-lg font-medium inline-block">
                      {m.recommendedUseCase || 'General Intent Parsing'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white font-medium font-mono">{m.contextWindow.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {m.supportsTools && <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20 font-medium">Tools</span>}
                      {m.supportsJson && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 font-medium">JSON</span>}
                      {m.supportsVision && <span className="bg-sky-500/10 text-sky-400 text-[10px] px-2 py-0.5 rounded border border-sky-500/20 font-medium">Vision</span>}
                      {m.supportsReasoning && <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded border border-purple-500/20 font-medium">Reason</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
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
                    <button
                      onClick={() => {
                        setQuickTestModel(m);
                        setQuickTestInput(TEST_PRESETS[0].prompt);
                        setQuickTestResponse('');
                        setTestMetrics(null);
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-200"
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
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-sm font-mono"
                placeholder={`Enter ${editingProvider.name} API Key...`}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingProvider(null)} className="px-4 py-2 rounded-xl hover:bg-white/5 text-sm font-medium text-white">Cancel</button>
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
                  placeholder="e.g. nvidia/nemotron-3-super-120b-a12b:free"
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
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3">
              {['supportsTools', 'supportsJson', 'supportsVision', 'supportsReasoning'].map(cap => (
                <label key={cap} className="flex items-center gap-3 text-sm cursor-pointer p-2 bg-white/5 rounded-xl border border-white/10 text-white">
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
          <div className="bg-[#0B0C10] border border-emerald-500/30 rounded-2xl w-full max-w-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                  <Play size={18} className="text-emerald-400 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Quick Model Test & Live Execution Benchmark
                  </h3>
                  <p className="text-xs text-textMuted font-mono mt-0.5 flex items-center gap-2">
                    <span>{quickTestModel.providerId}</span> / <span className="text-emerald-400 font-bold">{quickTestModel.modelId}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setQuickTestModel(null)} className="text-textMuted hover:text-white p-2 transition-colors">✕</button>
            </div>

            <div className="p-5 border-b border-white/10 bg-white/[0.01]">
              <label className="text-xs text-textMuted uppercase font-bold tracking-wider block mb-3">
                Select App Use-Case Preset:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {TEST_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isActive = quickTestInput === preset.prompt;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setQuickTestInput(preset.prompt);
                        setQuickTestResponse('');
                        setTestMetrics(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col gap-1.5 ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-textMuted'} />
                        <span className="truncate">{preset.name}</span>
                      </div>
                      <span className="text-[10px] text-textMuted leading-tight line-clamp-1">{preset.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 border-b border-white/10">
              <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Test Prompt Payload</label>
              <div className="flex gap-3">
                <textarea
                  rows={4}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white font-mono resize-none focus:border-emerald-500/50 focus:outline-none placeholder:text-textMuted/50 custom-scrollbar leading-relaxed"
                  value={quickTestInput}
                  onChange={e => setQuickTestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleQuickTest(); }}
                />
                <button
                  onClick={handleQuickTest}
                  disabled={quickTestLoading || !quickTestInput.trim()}
                  className="px-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-textMuted text-white font-bold rounded-xl text-sm transition-all shadow-[0_4px_14px_rgba(16,185,129,0.3)] flex flex-col items-center justify-center gap-1 min-w-[100px]"
                >
                  {quickTestLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <Play size={18} className="fill-current" />
                      <span className="text-[11px]">Run Test</span>
                      <span className="text-[9px] opacity-70">Ctrl+↵</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {testMetrics && (
                <div className="grid grid-cols-4 gap-3 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs font-mono">
                  <div>
                    <span className="text-textMuted block text-[10px]">API Latency</span>
                    <span className="text-emerald-400 font-bold">{testMetrics.latencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-textMuted block text-[10px]">Output Speed</span>
                    <span className="text-emerald-300 font-bold">{testMetrics.tokensPerSec || 0} tokens/s</span>
                  </div>
                  <div>
                    <span className="text-textMuted block text-[10px]">Token Usage</span>
                    <span className="text-white font-medium">{testMetrics.inputTokens || 0} In / {testMetrics.outputTokens || 0} Out</span>
                  </div>
                  <div>
                    <span className="text-textMuted block text-[10px]">HTTP Status</span>
                    <span className="text-emerald-400 font-bold">200 OK ✅</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">API Output Response</label>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 min-h-[140px] max-h-[250px] overflow-y-auto custom-scrollbar font-mono text-xs">
                  {quickTestLoading ? (
                    <div className="flex items-center gap-3 text-textMuted">
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <span className="text-sm font-sans">Running execution test against {quickTestModel.modelId}...</span>
                    </div>
                  ) : quickTestResponse ? (
                    <pre className={`whitespace-pre-wrap font-mono ${quickTestResponse.startsWith('[ERROR]') ? 'text-rose-400' : 'text-emerald-200'}`}>
                      {quickTestResponse}
                    </pre>
                  ) : (
                    <p className="text-textMuted/40 text-sm font-sans italic">Click "Run Test" or select a preset to benchmark model response...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Live Benchmark Suite Modal with Leaderboard Medals, View Response & Side-by-Side Comparison */}
      {showBenchmarkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B0C10] border border-purple-500/30 rounded-2xl w-full max-w-5xl shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col overflow-hidden max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <Award size={22} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-3">
                    Live AI Model Benchmark & Speed Leaderboard
                  </h3>
                  <p className="text-xs text-textMuted mt-0.5">Executes real parallel API requests and ranks models by speed, latency, and response quality</p>
                </div>
              </div>
              <button onClick={() => setShowBenchmarkModal(false)} className="text-textMuted hover:text-white p-2 text-lg">✕</button>
            </div>

            {/* Test Case & Controls Bar */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.01]">
              <div className="flex-1">
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider block mb-2">Select Benchmark Test Case Scenario:</label>
                <select
                  value={selectedPresetId}
                  onChange={e => setSelectedPresetId(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white w-full font-medium"
                >
                  {TEST_PRESETS.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#111] text-white">{p.name} — {p.tag}</option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle Tabs */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 mt-5">
                <button
                  onClick={() => setViewMode('leaderboard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'leaderboard' ? 'bg-purple-500 text-white shadow-md' : 'text-textMuted hover:text-white'
                  }`}
                >
                  <List size={13} /> Leaderboard Rank
                </button>
                <button
                  onClick={() => setViewMode('compare')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    viewMode === 'compare' ? 'bg-purple-500 text-white shadow-md' : 'text-textMuted hover:text-white'
                  }`}
                >
                  <Columns size={13} /> Side-by-Side Compare
                </button>
              </div>

              <button
                onClick={handleRunFullBenchmark}
                disabled={benchmarking}
                className="bg-purple-500 hover:bg-purple-400 disabled:bg-white/10 text-white font-bold px-6 py-3 rounded-xl text-sm transition-all flex items-center gap-2 mt-5 shadow-[0_4px_14px_rgba(168,85,247,0.3)] min-w-[200px] justify-center"
              >
                {benchmarking ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} className="fill-current" />}
                {benchmarking ? 'Benchmarking All Models...' : 'Run Live Benchmark'}
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {benchmarkResults.length > 0 ? (
                <>
                  {/* Winner Banner */}
                  {winner && (
                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-purple-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🏆</span>
                        <div>
                          <div className="text-xs uppercase tracking-wider font-bold text-emerald-400">#1 FASTEST MODEL WINNER</div>
                          <div className="text-lg font-bold text-white font-mono">{winner.modelId} <span className="text-xs text-textMuted font-sans uppercase">({winner.providerId})</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-sm">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-emerald-300 font-bold">
                          ⚡ {winner.latencyMs} ms
                        </div>
                        <div className="bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-xl text-purple-300 font-bold">
                          🚀 {winner.tokensPerSec} tokens/s
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leaderboard Table View */}
                  {viewMode === 'leaderboard' ? (
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/5 text-textMuted border-b border-white/10">
                          <tr>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px]">Rank</th>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px]">Model ID</th>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px]">Provider</th>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px]">Latency (ms)</th>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px]">Speed (tok/s)</th>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px]">Status</th>
                            <th className="px-4 py-3.5 font-bold uppercase text-[10px] text-right">Full AI Response Output</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {sortedResults.map((res, index) => {
                            const rankBadge = index === 0 ? '🥇 #1' : index === 1 ? '🥈 #2' : index === 2 ? '🥉 #3' : `#${index + 1}`;
                            return (
                              <tr key={res.modelId} className="hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3.5 font-bold font-mono text-amber-400 text-xs">{rankBadge}</td>
                                <td className="px-4 py-3.5 font-mono font-bold text-white">{res.modelId}</td>
                                <td className="px-4 py-3.5 uppercase text-textMuted font-medium">{res.providerId}</td>
                                <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">
                                  {res.success ? `${res.latencyMs} ms` : 'N/A'}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-purple-300 font-medium">
                                  {res.success ? `${res.tokensPerSec} t/s` : '0 t/s'}
                                </td>
                                <td className="px-4 py-3.5">
                                  {res.success ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">200 OK</span>
                                  ) : (
                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold">FAILED</span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    onClick={() => setInspectingResult({
                                      modelId: res.modelId,
                                      providerId: res.providerId,
                                      latencyMs: res.latencyMs,
                                      tokensPerSec: res.tokensPerSec,
                                      fullContent: res.fullContent || res.error || 'No content output',
                                    })}
                                    className="inline-flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    <Eye size={13} /> View Full Response
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Side-by-Side Response Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedResults.filter(r => r.success).map((res, index) => (
                        <div key={res.modelId} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-bold text-amber-400 font-mono">#{index + 1} Rank</span>
                              <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-textMuted">{res.providerId}</span>
                            </div>
                            <h4 className="text-sm font-bold text-white font-mono truncate mb-2">{res.modelId}</h4>
                            <div className="flex gap-2 text-xs font-mono mb-4">
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">⚡ {res.latencyMs} ms</span>
                              <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded font-bold">🚀 {res.tokensPerSec} t/s</span>
                            </div>
                            <label className="text-[10px] text-textMuted uppercase font-bold tracking-wider block mb-1">Generated Output Response:</label>
                            <div className="bg-black/40 border border-white/10 rounded-xl p-3 max-h-[220px] overflow-y-auto custom-scrollbar font-mono text-[11px] text-emerald-200 whitespace-pre-wrap leading-relaxed">
                              {res.fullContent}
                            </div>
                          </div>
                          <button
                            onClick={() => setInspectingResult({
                              modelId: res.modelId,
                              providerId: res.providerId,
                              latencyMs: res.latencyMs,
                              tokensPerSec: res.tokensPerSec,
                              fullContent: res.fullContent,
                            })}
                            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Eye size={13} /> Expand Full Screen Output
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16 text-textMuted text-sm space-y-3">
                  <Award size={40} className="mx-auto text-purple-400/50" />
                  <p className="font-medium text-white">Ready to Run Live API Model Benchmark Suite</p>
                  <p className="text-xs max-w-md mx-auto text-textMuted">Click "Run Live Benchmark" to send real API requests across all 17 models in parallel and compare actual generated responses side-by-side.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full AI Response Inspector Modal */}
      {inspectingResult && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B0C10] border border-indigo-500/30 rounded-2xl w-full max-w-4xl shadow-[0_0_60px_rgba(99,102,241,0.2)] flex flex-col overflow-hidden max-h-[90vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Full Model Response Inspector
                </h3>
                <p className="text-xs text-textMuted font-mono mt-0.5">
                  <span>{inspectingResult.providerId}</span> / <span className="text-indigo-400 font-bold">{inspectingResult.modelId}</span>
                </p>
              </div>
              <button onClick={() => setInspectingResult(null)} className="text-textMuted hover:text-white p-2 text-lg">✕</button>
            </div>

            <div className="p-4 bg-white/[0.01] border-b border-white/10 flex items-center gap-4 text-xs font-mono">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg font-bold">Latency: {inspectingResult.latencyMs} ms</span>
              <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-lg font-bold">Speed: {inspectingResult.tokensPerSec} tokens/sec</span>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              <pre className="bg-black/50 border border-white/10 rounded-xl p-5 font-mono text-xs text-emerald-200 whitespace-pre-wrap leading-relaxed">
                {inspectingResult.fullContent}
              </pre>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
