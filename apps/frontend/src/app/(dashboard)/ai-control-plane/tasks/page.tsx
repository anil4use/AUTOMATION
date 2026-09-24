'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Settings2,
  Loader2,
  Save,
  Zap,
  ShieldCheck,
  Cpu,
  Play,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Sparkles,
  ArrowRight,
  Layers,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

interface AITaskConfig {
  _id: string;
  feature: string;
  task: string;
  promptKey: string;
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  routingStrategy: 'fixed' | 'cheapest' | 'fastest' | 'capability';
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  requirements: {
    structuredOutput: boolean;
    toolsEnabled: boolean;
  };
  enabled: boolean;
}

export default function TaskConfigsPage() {
  const [tasks, setTasks] = useState<AITaskConfig[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filters
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Simulation Modal state
  const [simulatingTask, setSimulatingTask] = useState<AITaskConfig | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simPromptText, setSimPromptText] = useState('');

  const fetchTasks = async () => {
    try {
      const [tasksRes, provRes, modRes] = await Promise.all([
        apiClient.get('/v1/ai-control-plane/tasks'),
        apiClient.get('/v1/ai-control-plane/providers'),
        apiClient.get('/v1/ai-control-plane/models'),
      ]);
      setTasks(tasksRes.data);
      setProviders(provRes.data);
      setModels(modRes.data);
    } catch (err: any) {
      toast.error('Failed to load task configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const uniqueFeatures = useMemo(() => {
    const feats = Array.from(new Set(tasks.map((t) => t.feature)));
    return ['all', ...feats];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesFeature = selectedFeature === 'all' || t.feature === selectedFeature;
      const matchesQuery =
        searchQuery === '' ||
        t.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.promptKey.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFeature && matchesQuery;
    });
  }, [tasks, selectedFeature, searchQuery]);

  const handleUpdateField = (taskId: string, fieldPath: string, value: any) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t._id !== taskId) return t;
        const updated = { ...t };

        if (fieldPath.includes('.')) {
          const [parent, child] = fieldPath.split('.');
          (updated as any)[parent] = {
            ...(updated as any)[parent],
            [child]: value,
          };
        } else {
          (updated as any)[fieldPath] = value;
        }

        return updated;
      })
    );
  };

  const handleSave = async (task: AITaskConfig) => {
    setSavingId(task._id);
    try {
      await apiClient.put(`/v1/ai-control-plane/tasks/${task.feature}/${task.task}`, task);
      toast.success(`Routing config saved for ${task.feature} / ${task.task}`);
    } catch (err: any) {
      toast.error(`Failed to save configuration: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleRunSimulation = async () => {
    if (!simulatingTask) return;
    setIsSimulating(true);
    setSimResult(null);
    try {
      const res = await apiClient.post('/v1/ai-control-plane/tasks/simulate-route', {
        feature: simulatingTask.feature,
        task: simulatingTask.task,
        testPrompt: simPromptText || undefined,
      });
      setSimResult(res.data);
      toast.success('Task routing simulation completed!');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message;
      toast.error('Simulation failed');
      setSimResult({
        success: false,
        error: errMsg,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyPresetFastest = () => {
    // Find fastest provider (Groq)
    const groqProv = providers.find((p) => p.providerId === 'groq') || providers[0];
    const groqModels = models.filter((m) => m.providerId === groqProv?.providerId);
    const fastestModel = groqModels.find((m) => m.modelId === 'allam-2-7b') || groqModels[0];

    if (!groqProv || !fastestModel) return;

    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        routingStrategy: 'fastest',
        primaryProvider: groqProv.providerId,
        primaryModel: fastestModel.modelId,
      }))
    );
    toast.success('Applied "Fastest Route" strategy to all tasks! Click Save to apply.');
  };

  const handleApplyPresetReliable = () => {
    // Gemini primary, Groq fallback
    const geminiProv = providers.find((p) => p.providerId === 'gemini');
    const groqProv = providers.find((p) => p.providerId === 'groq');

    if (!geminiProv || !groqProv) return;

    const geminiModel = models.find((m) => m.providerId === 'gemini')?.modelId || 'gemini-3.5-flash-lite';
    const groqModel = models.find((m) => m.providerId === 'groq')?.modelId || 'openai/gpt-oss-120b';

    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        routingStrategy: 'capability',
        primaryProvider: geminiProv.providerId,
        primaryModel: geminiModel,
        fallbackProvider: groqProv.providerId,
        fallbackModel: groqModel,
      }))
    );
    toast.success('Applied "High Reliability + Fallback" strategy to all tasks! Click Save to apply.');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Top Banner & Strategy Quick Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Settings2 className="text-indigo-400" size={20} />
            </div>
            AI Task Routing & Execution Policy Engine
          </h1>
          <p className="text-xs text-textMuted mt-1">
            Configure dynamic LLM routing strategies, failover fallbacks, temperature, and tool capabilities per app task.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          <button
            onClick={handleApplyPresetFastest}
            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)]"
          >
            <Zap size={14} /> Preset: Set All to Fastest Route
          </button>

          <button
            onClick={handleApplyPresetReliable}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <ShieldCheck size={14} /> Preset: Multi-Provider Failover
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
        <div className="flex gap-2 items-center overflow-x-auto w-full sm:w-auto custom-scrollbar">
          <span className="text-xs text-textMuted font-bold uppercase tracking-wider mr-2 shrink-0">
            Features:
          </span>
          {uniqueFeatures.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFeature(f)}
              className={`text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                selectedFeature === f
                  ? 'bg-indigo-600 text-white font-semibold shadow-md'
                  : 'bg-white/5 text-textMuted hover:text-white hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'All Tasks' : f}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 text-white/30" size={15} />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Grid of Task Configuration Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredTasks.map((t) => {
          const primaryProvObj = providers.find((p) => p.providerId === t.primaryProvider);
          const fallbackProvObj = providers.find((p) => p.providerId === t.fallbackProvider);

          return (
            <div
              key={t._id}
              className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col hover:border-indigo-500/30 transition-all duration-300 group"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 bg-white/[0.01] flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                      {t.feature}
                    </span>
                    <span className="text-white/30">/</span>
                    <span className="text-sm font-bold text-indigo-400 font-mono">
                      {t.task}
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted mt-1 flex items-center gap-2 font-mono">
                    Prompt Key:{' '}
                    <span className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {t.promptKey}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSimulatingTask(t);
                      setSimPromptText('');
                      setSimResult(null);
                    }}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-xl border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Play size={13} className="fill-current" /> Simulate Route
                  </button>

                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[11px] font-bold text-textMuted uppercase">
                      Status
                    </span>
                    <button
                      onClick={() => handleUpdateField(t._id, 'enabled', !t.enabled)}
                      className={`w-9 h-5 rounded-full relative transition-colors ${
                        t.enabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                          t.enabled ? 'left-[18px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Visual Pipeline Flow Banner */}
              <div className="bg-[#08080c] px-5 py-3 border-b border-white/5 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-textMuted">
                  <Layers size={13} className="text-indigo-400" />
                  <span>Flow:</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                    {t.routingStrategy.toUpperCase()}
                  </span>
                  <ArrowRight size={12} className="text-white/30" />
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <Zap size={11} /> {t.primaryProvider}/{t.primaryModel}
                  </span>
                  {t.fallbackProvider && (
                    <>
                      <ArrowRight size={12} className="text-white/30" />
                      <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                        <ShieldCheck size={11} /> {t.fallbackProvider}/{t.fallbackModel}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Content Controls Body */}
              <div className="p-5 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left Column: Routing & Model Selectors */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-1.5">
                      Routing Policy Strategy
                    </label>
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      value={t.routingStrategy}
                      onChange={(e) => handleUpdateField(t._id, 'routingStrategy', e.target.value)}
                    >
                      <option className="bg-[#1e1e1e]" value="fixed">Fixed Priority (Primary First)</option>
                      <option className="bg-[#1e1e1e]" value="fastest">Fastest Available (Latency Priority)</option>
                      <option className="bg-[#1e1e1e]" value="cheapest">Cheapest Available (Free Tier First)</option>
                      <option className="bg-[#1e1e1e]" value="capability">Capability Match (Tokens & Tools)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-1.5 flex justify-between">
                      Primary Model Route
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-1/3 bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-indigo-300 font-medium focus:outline-none focus:border-indigo-500"
                        value={t.primaryProvider}
                        onChange={(e) => {
                          handleUpdateField(t._id, 'primaryProvider', e.target.value);
                          const pModels = models.filter((m) => m.providerId === e.target.value);
                          if (pModels.length > 0) handleUpdateField(t._id, 'primaryModel', pModels[0].modelId);
                        }}
                      >
                        {providers.map((p) => (
                          <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e]">
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="w-2/3 bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        value={t.primaryModel}
                        onChange={(e) => handleUpdateField(t._id, 'primaryModel', e.target.value)}
                      >
                        {models
                          .filter((m) => m.providerId === t.primaryProvider)
                          .map((m) => (
                            <option key={m.modelId} value={m.modelId} className="bg-[#1e1e1e]">
                              {m.name || m.modelId}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-1.5 flex justify-between">
                      Failover Fallback Route
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="w-1/3 bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-indigo-300 font-medium focus:outline-none focus:border-indigo-500"
                        value={t.fallbackProvider || ''}
                        onChange={(e) => {
                          handleUpdateField(t._id, 'fallbackProvider', e.target.value);
                          const pModels = models.filter((m) => m.providerId === e.target.value);
                          if (pModels.length > 0) handleUpdateField(t._id, 'fallbackModel', pModels[0].modelId);
                        }}
                      >
                        <option value="" className="bg-[#1e1e1e] text-textMuted">— None —</option>
                        {providers.map((p) => (
                          <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e]">
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <select
                        className="w-2/3 bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        value={t.fallbackModel || ''}
                        onChange={(e) => handleUpdateField(t._id, 'fallbackModel', e.target.value)}
                      >
                        <option value="" className="bg-[#1e1e1e] text-textMuted">— None —</option>
                        {models
                          .filter((m) => m.providerId === t.fallbackProvider)
                          .map((m) => (
                            <option key={m.modelId} value={m.modelId} className="bg-[#1e1e1e]">
                              {m.name || m.modelId}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right Column: Hyperparameters & Capability Requirements */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">
                        Temperature
                      </label>
                      <input
                        className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={t.parameters.temperature}
                        onChange={(e) =>
                          handleUpdateField(t._id, 'parameters.temperature', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <label className="text-[10px] font-bold text-textMuted uppercase block mb-1">
                        Max Tokens
                      </label>
                      <input
                        className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
                        type="number"
                        step="512"
                        value={t.parameters.maxTokens}
                        onChange={(e) =>
                          handleUpdateField(t._id, 'parameters.maxTokens', parseInt(e.target.value))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-2">
                      Required Model Capabilities
                    </label>

                    <div className="space-y-2">
                      <label
                        onClick={() =>
                          handleUpdateField(
                            t._id,
                            'requirements.structuredOutput',
                            !t.requirements.structuredOutput
                          )
                        }
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <span className="text-xs text-gray-200">Structured Output (JSON)</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            t.requirements.structuredOutput
                              ? 'bg-emerald-500 border-emerald-400'
                              : 'border-white/20'
                          }`}
                        >
                          {t.requirements.structuredOutput && (
                            <CheckCircle2 size={12} className="text-black" />
                          )}
                        </div>
                      </label>

                      <label
                        onClick={() =>
                          handleUpdateField(
                            t._id,
                            'requirements.toolsEnabled',
                            !t.requirements.toolsEnabled
                          )
                        }
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <span className="text-xs text-gray-200">Tool / Function Calling</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            t.requirements.toolsEnabled
                              ? 'bg-emerald-500 border-emerald-400'
                              : 'border-white/20'
                          }`}
                        >
                          {t.requirements.toolsEnabled && (
                            <CheckCircle2 size={12} className="text-black" />
                          )}
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-between items-center">
                <span className="text-[11px] text-textMuted">
                  Feature Task ID: <code className="text-indigo-300">{t.feature}:{t.task}</code>
                </span>

                <button
                  onClick={() => handleSave(t)}
                  disabled={savingId === t._id}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_4px_14px_rgba(99,102,241,0.3)] disabled:opacity-50"
                >
                  {savingId === t._id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  {savingId === t._id ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Route Simulation Modal */}
      {simulatingTask && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B0C10] border border-indigo-500/30 rounded-2xl w-full max-w-2xl flex flex-col shadow-[0_0_50px_rgba(99,102,241,0.2)] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Play className="text-indigo-400 fill-current" size={16} />
                Live Task Route Simulation — {simulatingTask.feature} / {simulatingTask.task}
              </h3>
              <button
                onClick={() => setSimulatingTask(null)}
                className="text-textMuted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-textMuted">Strategy Policy:</span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {simulatingTask.routingStrategy.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-textMuted">Configured Primary:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {simulatingTask.primaryProvider} / {simulatingTask.primaryModel}
                  </span>
                </div>
                {simulatingTask.fallbackProvider && (
                  <div className="flex justify-between">
                    <span className="text-textMuted">Configured Fallback:</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {simulatingTask.fallbackProvider} / {simulatingTask.fallbackModel}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-textMuted uppercase font-bold tracking-wider mb-1 block">
                  Optional Test Prompt Payload
                </label>
                <input
                  type="text"
                  placeholder="Enter custom prompt or leave blank to test default routing logic..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={simPromptText}
                  onChange={(e) => setSimPromptText(e.target.value)}
                />
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSimulating ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} className="fill-current" />}
                {isSimulating ? 'Simulating Runtime Routing...' : 'Execute Route Simulation'}
              </button>

              {simResult && (
                <div className="mt-3 bg-black/60 border border-white/10 p-4 rounded-xl space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-textMuted">Selected Provider & Model:</span>
                    <span className="text-emerald-300 font-bold">
                      {simResult.selectedProvider} / {simResult.selectedModel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-textMuted">Execution Latency:</span>
                    <span className="text-amber-300 font-bold">
                      {simResult.result?.latencyMs ?? 0} ms
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-textMuted">Failover Used:</span>
                    <span className={simResult.usedFallback ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {simResult.usedFallback ? 'YES (Primary failed over)' : 'NO (Primary succeeded)'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] text-textMuted block mb-1">Generated Output Snippet:</span>
                    <div className="bg-black/80 p-2.5 rounded-lg text-[11px] text-gray-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                      {simResult.result?.content || simResult.error || 'No output'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
