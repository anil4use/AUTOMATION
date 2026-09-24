'use client';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Settings2, Loader2, Save } from 'lucide-react';
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
  routingStrategy: string;
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
      toast.error('Failed to load task configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateField = (taskId: string, fieldPath: string, value: any) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== taskId) return t;
      const updated = { ...t };
      
      // Handle nested updates
      if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        (updated as any)[parent] = {
          ...(updated as any)[parent],
          [child]: value
        };
      } else {
        (updated as any)[fieldPath] = value;
      }
      
      return updated;
    }));
  };

  const handleSave = async (task: AITaskConfig) => {
    setSavingId(task._id);
    try {
      await apiClient.put(`/v1/ai-control-plane/tasks/${task.feature}/${task.task}`, task);
      toast.success(`Saved configuration for ${task.task}`);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="animate-spin text-accentIndigo" />
      </div>
    );
  }

  return (
    <div className="p-6 w-full flex flex-col gap-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.15)]">
            <Settings2 className="text-indigo-400" size={24} />
          </div>
          Task Configurations & Routing
        </h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {tasks.map((t) => (
          <div key={t._id} className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col hover:border-indigo-500/30 hover:shadow-[0_8px_30px_rgba(99,102,241,0.1)] transition-all duration-300 group">
            <div className="p-5 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-lg tracking-tight group-hover:text-indigo-200 transition-colors">
                  {t.feature} <span className="text-white/20 px-1">/</span> <span className="text-indigo-400">{t.task}</span>
                </h3>
                <p className="text-[11px] text-textMuted mt-1.5 flex items-center gap-2">
                  Prompt Key: <span className="font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{t.promptKey}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                <span className="text-xs font-semibold tracking-wide text-textSecondary uppercase">Status</span>
                <button 
                  onClick={() => handleUpdateField(t._id, 'enabled', !t.enabled)}
                  className={`w-11 h-6 rounded-full relative transition-colors shadow-inner ${t.enabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${t.enabled ? 'left-[22px]' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 grid grid-cols-2 gap-8">
              {/* Routing & Models */}
              <div className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-2">Routing Strategy</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 appearance-none font-medium"
                    value={t.routingStrategy}
                    onChange={(e) => handleUpdateField(t._id, 'routingStrategy', e.target.value)}
                  >
                    <option className="bg-[#1e1e1e] text-white" value="fixed">Fixed Priority</option>
                    <option className="bg-[#1e1e1e] text-white" value="cheapest">Cheapest Available</option>
                    <option className="bg-[#1e1e1e] text-white" value="fastest">Fastest Available</option>
                    <option className="bg-[#1e1e1e] text-white" value="capability">Capability Match</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-2">Primary Route</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-[0.8] bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-indigo-300 font-medium focus:outline-none focus:border-indigo-500"
                      value={t.primaryProvider}
                      onChange={(e) => {
                        handleUpdateField(t._id, 'primaryProvider', e.target.value);
                        const pModels = models.filter(m => m.providerId === e.target.value);
                        if (pModels.length > 0) handleUpdateField(t._id, 'primaryModel', pModels[0].modelId);
                      }}
                    >
                      {providers.map(p => <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e] text-white">{p.name}</option>)}
                    </select>
                    <select
                      className="flex-[1.2] bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                      value={t.primaryModel}
                      onChange={(e) => handleUpdateField(t._id, 'primaryModel', e.target.value)}
                    >
                      {models.filter(m => m.providerId === t.primaryProvider).map(m => (
                        <option key={m.modelId} value={m.modelId} className="bg-[#1e1e1e] text-white">{m.name || m.modelId}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-2">Fallback Route</label>
                  <div className="flex gap-2">
                    <select
                      className="flex-[0.8] bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-indigo-300 font-medium focus:outline-none focus:border-indigo-500"
                      value={t.fallbackProvider || ''}
                      onChange={(e) => {
                        handleUpdateField(t._id, 'fallbackProvider', e.target.value);
                        const pModels = models.filter(m => m.providerId === e.target.value);
                        if (pModels.length > 0) handleUpdateField(t._id, 'fallbackModel', pModels[0].modelId);
                      }}
                    >
                      <option value="" className="bg-[#1e1e1e] text-textMuted">— None —</option>
                      {providers.map(p => <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e] text-white">{p.name}</option>)}
                    </select>
                    <select
                      className="flex-[1.2] bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                      value={t.fallbackModel || ''}
                      onChange={(e) => handleUpdateField(t._id, 'fallbackModel', e.target.value)}
                    >
                      <option value="" className="bg-[#1e1e1e] text-textMuted">— None —</option>
                      {models.filter(m => m.providerId === t.fallbackProvider).map(m => (
                        <option key={m.modelId} value={m.modelId} className="bg-[#1e1e1e] text-white">{m.name || m.modelId}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Params & Requirements */}
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-indigo-500/50 transition-colors">
                    <label className="text-[10px] font-bold tracking-wider text-textMuted uppercase block mb-1">Temp</label>
                    <input 
                      className="w-full bg-transparent text-lg text-white font-mono focus:outline-none" 
                      type="number" 
                      step="0.1"
                      value={t.parameters.temperature} 
                      onChange={(e) => handleUpdateField(t._id, 'parameters.temperature', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-indigo-500/50 transition-colors">
                    <label className="text-[10px] font-bold tracking-wider text-textMuted uppercase block mb-1">Top P</label>
                    <input 
                      className="w-full bg-transparent text-lg text-white font-mono focus:outline-none" 
                      type="number" 
                      step="0.1"
                      value={t.parameters.topP} 
                      onChange={(e) => handleUpdateField(t._id, 'parameters.topP', parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3 focus-within:border-indigo-500/50 transition-colors">
                  <label className="text-[10px] font-bold tracking-wider text-textMuted uppercase block mb-1">Max Tokens</label>
                  <input 
                    className="w-full bg-transparent text-lg text-white font-mono focus:outline-none" 
                    type="number" 
                    value={t.parameters.maxTokens} 
                    onChange={(e) => handleUpdateField(t._id, 'parameters.maxTokens', parseInt(e.target.value))}
                  />
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-bold tracking-wider text-textMuted uppercase block mb-3">Model Requirements</label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center justify-between text-sm text-textSecondary cursor-pointer group/req">
                      <span className="font-medium group-hover/req:text-white transition-colors">Structured Output (JSON)</span>
                      <div 
                        onClick={() => handleUpdateField(t._id, 'requirements.structuredOutput', !t.requirements.structuredOutput)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${t.requirements.structuredOutput ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-white/10 group-hover/req:border-white/30'}`}
                      >
                        {t.requirements.structuredOutput && <div className="w-2 h-2 rounded-sm bg-emerald-400" />}
                      </div>
                    </label>
                    <label className="flex items-center justify-between text-sm text-textSecondary cursor-pointer group/req">
                      <span className="font-medium group-hover/req:text-white transition-colors">Tool Calling Enabled</span>
                      <div 
                        onClick={() => handleUpdateField(t._id, 'requirements.toolsEnabled', !t.requirements.toolsEnabled)}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${t.requirements.toolsEnabled ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-white/5 border-white/10 group-hover/req:border-white/30'}`}
                      >
                        {t.requirements.toolsEnabled && <div className="w-2 h-2 rounded-sm bg-emerald-400" />}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-white/[0.01] flex justify-end">
              <button 
                onClick={() => handleSave(t)}
                disabled={savingId === t._id}
                className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white px-5 py-2 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-2 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingId === t._id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {savingId === t._id ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
