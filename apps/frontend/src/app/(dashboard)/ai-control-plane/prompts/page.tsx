'use client';
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { FileText, Loader2, Play, Code2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface AIPrompt {
  _id: string;
  feature: string;
  promptKey: string;
  name: string;
  description: string;
  type: 'system' | 'user' | 'assistant';
  template: string;
  variables: Array<{ name: string; type: string; required: boolean }>;
  status: 'draft' | 'test' | 'active' | 'archived';
  version: number;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [editTemplate, setEditTemplate] = useState('');
  
  // Playground state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testProviderId, setTestProviderId] = useState('');
  const [testModelId, setTestModelId] = useState('');
  
  // Add Prompt state
  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState<Partial<AIPrompt>>({
    name: '',
    description: '',
    feature: 'whatsapp-agent',
    promptKey: '',
    type: 'system',
    template: 'You are an AI...',
    variables: [],
    status: 'active'
  });
  const [newVarName, setNewVarName] = useState('');

  const fetchData = async () => {
    try {
      const [promptsRes, provRes, modRes] = await Promise.all([
        apiClient.get('/v1/ai-control-plane/prompts'),
        apiClient.get('/v1/ai-control-plane/providers'),
        apiClient.get('/v1/ai-control-plane/models'),
      ]);
      setPrompts(promptsRes.data);
      setProviders(provRes.data);
      setModels(modRes.data);
      
      if (provRes.data.length > 0) setTestProviderId(provRes.data[0].providerId);
      if (modRes.data.length > 0) setTestModelId(modRes.data[0].modelId);

      if (promptsRes.data.length > 0 && !selectedPrompt) {
        setSelectedPrompt(promptsRes.data[0]);
        setEditTemplate(promptsRes.data[0].template);
      }
    } catch (err: any) {
      toast.error('Failed to load control plane data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedPrompt) {
      setEditTemplate(selectedPrompt.template);
      // Init test variables
      const initialVars: Record<string, string> = {};
      selectedPrompt.variables.forEach(v => initialVars[v.name] = '');
      setTestVariables(initialVars);
      setTestResponse('');
    }
  }, [selectedPrompt]);

  const handleSaveVersion = async () => {
    if (!selectedPrompt) return;
    try {
      const payload = {
        ...selectedPrompt,
        template: editTemplate,
        status: 'active'
      };
      await apiClient.post('/v1/ai-control-plane/prompts', payload);
      toast.success('New version saved and activated!');
      fetchPrompts();
    } catch (err: any) {
      toast.error('Failed to save version');
    }
  };

  const handleRunTest = async () => {
    if (!selectedPrompt) return;
    setIsTesting(true);
    setTestResponse('');
    try {
      const payload = {
        providerId: testProviderId,
        modelId: testModelId,
        template: editTemplate,
        variables: testVariables
      };
      const res = await apiClient.post('/v1/ai-control-plane/test-prompt', payload);
      setTestResponse(res.data.content);
      toast.success('Test completed!');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message;
      toast.error('Test failed');
      setTestResponse(`[ERROR] \n\n${errMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreatePrompt = async () => {
    try {
      await apiClient.post('/v1/ai-control-plane/prompts', newPrompt);
      toast.success('Prompt created successfully!');
      setShowAddPromptModal(false);
      // reset form
      setNewPrompt({
        name: '', description: '', feature: 'whatsapp-agent', promptKey: '',
        type: 'system', template: 'You are an AI...', variables: [], status: 'active'
      });
      fetchData();
    } catch (err: any) {
      toast.error('Failed to create prompt');
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
    <div className="flex gap-8 h-full w-full">
      {/* Sidebar List */}
      <div className="w-[340px] bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-white font-bold tracking-tight flex items-center gap-3 text-lg">
            <div className="p-1.5 bg-indigo-500/20 rounded-md">
              <FileText size={18} className="text-indigo-400" />
            </div>
            Prompts
          </h3>
          <button 
            onClick={() => setShowAddPromptModal(true)}
            className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white p-2 rounded-lg transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          >
            <Plus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {prompts.map((p) => (
            <div
              key={p._id}
              onClick={() => setSelectedPrompt(p)}
              className={`p-5 border-b border-white/5 cursor-pointer transition-all duration-300 group ${
                selectedPrompt?._id === p._id 
                  ? 'bg-indigo-500/[0.08] border-l-4 border-l-indigo-400' 
                  : 'hover:bg-white/[0.04] border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-semibold tracking-tight transition-colors ${selectedPrompt?._id === p._id ? 'text-indigo-100' : 'text-white group-hover:text-indigo-200'}`}>
                  {p.name}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
                  v{p.version} • {p.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-textMuted font-mono flex items-center gap-1.5">
                <span className="text-indigo-300/70">{p.feature}</span> 
                <span className="text-white/20">/</span> 
                <span>{p.promptKey}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Main Area */}
      {selectedPrompt ? (
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Top Info Card */}
          <div className="relative bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-6 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20" />
            <div className="flex justify-between items-start mb-5">
              <div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">{selectedPrompt.name}</h2>
                <p className="text-textMuted text-sm mt-1">{selectedPrompt.description}</p>
              </div>
              <button 
                onClick={() => setShowTestModal(true)}
                className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-indigo-400 transition-all duration-300 shadow-[0_4px_14px_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] hover:-translate-y-0.5"
              >
                <Play size={16} className="fill-current" /> Test Prompt
              </button>
            </div>
            <div className="flex gap-6 text-sm text-textMuted font-medium">
              <span className="flex items-center gap-2">Feature: <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded text-xs border border-white/10">{selectedPrompt.feature}</span></span>
              <span className="flex items-center gap-2">Key: <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded text-xs border border-white/10">{selectedPrompt.promptKey}</span></span>
              <span className="flex items-center gap-2">Type: <span className="text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded text-xs border border-purple-500/20">{selectedPrompt.type}</span></span>
            </div>
          </div>

          {/* Template Editor */}
          <div className="flex-1 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <div className="p-4 border-b border-white/10 bg-white/[0.01] flex justify-between items-center text-sm text-textMuted font-semibold tracking-wide">
              <span className="flex items-center gap-2"><Code2 size={18} className="text-indigo-400" /> Template Editor</span>
              {editTemplate !== selectedPrompt.template && (
                <button 
                  onClick={handleSaveVersion}
                  className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white px-4 py-1.5 rounded-lg text-xs transition-colors"
                >
                  Save as v{selectedPrompt.version + 1}
                </button>
              )}
            </div>
            <div className="flex-1 relative">
              <textarea
                className="w-full h-full bg-[#0a0a0a]/50 text-[#e0e0e0] font-mono p-6 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-sm leading-relaxed"
                value={editTemplate}
                onChange={(e) => setEditTemplate(e.target.value)}
              />
            </div>
          </div>

          {/* Variables Section */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
            <h4 className="text-sm font-bold text-white mb-4 tracking-wide">Expected Variables</h4>
            {selectedPrompt.variables.length === 0 ? (
              <p className="text-sm text-textMuted italic">No variables required.</p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {selectedPrompt.variables.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm hover:border-white/20 transition-colors">
                    <span className="text-pink-400 font-mono font-medium">{v.name}</span>
                    <span className="text-textMuted text-xs font-mono">{v.type}</span>
                    {v.required && <span className="text-rose-400 text-[9px] uppercase font-bold tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">Req</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-textMuted border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <FileText size={48} className="text-white/10 mb-4" />
          <p className="font-medium">Select a prompt to view details.</p>
        </div>
      )}

      {/* AI Playground Modal */}
      {showTestModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B0C10] border border-indigo-500/30 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(99,102,241,0.15)] overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-xl font-extrabold text-white flex items-center gap-3">
                <Play className="text-indigo-400 fill-current" size={20} />
                AI Testing Playground
                <span className="text-sm font-mono font-normal text-textMuted bg-white/5 px-2 py-1 rounded-md">{selectedPrompt.promptKey}</span>
              </h3>
              <button onClick={() => setShowTestModal(false)} className="text-textMuted hover:text-white p-2">✕</button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Left sidebar - Variables */}
              <div className="w-1/3 border-r border-white/10 p-5 bg-white/[0.01] overflow-y-auto custom-scrollbar flex flex-col gap-6">
                <div>
                  <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4">Route Selection</h4>
                  <div className="space-y-3">
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono focus:border-indigo-500/50 focus:outline-none" 
                      value={testProviderId} 
                      onChange={e => {
                        setTestProviderId(e.target.value);
                        // Auto-select a model for this provider if possible
                        const pModels = models.filter(m => m.providerId === e.target.value);
                        if(pModels.length > 0) setTestModelId(pModels[0].modelId);
                      }}
                    >
                      {providers.map(p => <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e] text-white">{p.name}</option>)}
                    </select>

                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono focus:border-indigo-500/50 focus:outline-none" 
                      value={testModelId} 
                      onChange={e => setTestModelId(e.target.value)}
                    >
                      {models.filter(m => m.providerId === testProviderId).map(m => (
                        <option key={m.modelId} value={m.modelId} className="bg-[#1e1e1e] text-white">{m.name || m.modelId}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4">Input Variables</h4>
                  {selectedPrompt.variables.length === 0 ? (
                    <p className="text-sm text-textMuted italic">No variables required.</p>
                  ) : (
                    <div className="space-y-4">
                      {selectedPrompt.variables.map(v => (
                        <div key={v.name}>
                          <label className="text-[11px] font-mono text-indigo-300 mb-1.5 block">{v.name}</label>
                          <textarea 
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500/50 focus:outline-none custom-scrollbar"
                            placeholder={`Enter ${v.name}...`}
                            value={testVariables[v.name]}
                            onChange={e => setTestVariables(prev => ({...prev, [v.name]: e.target.value}))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="mt-auto w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} className="fill-current" />}
                  {isTesting ? 'Running...' : 'Execute Prompt'}
                </button>
              </div>

              {/* Right area - Output */}
              <div className="flex-1 p-6 flex flex-col bg-[#0a0a0a]/50 relative">
                <h4 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-4">LLM Response</h4>
                <div className="flex-1 bg-transparent overflow-y-auto custom-scrollbar border border-white/5 rounded-xl p-6 text-[#e0e0e0] font-sans leading-relaxed text-sm">
                  {isTesting ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50">
                      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
                      <p>Generating response...</p>
                    </div>
                  ) : testResponse ? (
                    <div className="whitespace-pre-wrap">{testResponse}</div>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-30 italic font-mono">
                      Awaiting execution...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Prompt Modal */}
      {showAddPromptModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <FileText className="text-indigo-400" />
                Create New Prompt Template
              </h3>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Name</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Sales Response Bot"
                    value={newPrompt.name}
                    onChange={e => setNewPrompt({...newPrompt, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Type</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    value={newPrompt.type}
                    onChange={e => setNewPrompt({...newPrompt, type: e.target.value as any})}
                  >
                    <option value="system" className="bg-[#1e1e1e]">System</option>
                    <option value="user" className="bg-[#1e1e1e]">User</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Feature</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none font-mono"
                    placeholder="e.g. whatsapp-agent"
                    value={newPrompt.feature}
                    onChange={e => setNewPrompt({...newPrompt, feature: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Prompt Key</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none font-mono"
                    placeholder="e.g. handle_sales_intent"
                    value={newPrompt.promptKey}
                    onChange={e => setNewPrompt({...newPrompt, promptKey: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Description</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  value={newPrompt.description}
                  onChange={e => setNewPrompt({...newPrompt, description: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block">Template Base</label>
                <textarea 
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:border-indigo-500 focus:outline-none custom-scrollbar resize-none"
                  value={newPrompt.template}
                  onChange={e => setNewPrompt({...newPrompt, template: e.target.value})}
                />
              </div>

              <div>
                <label className="text-xs text-textMuted uppercase font-bold tracking-wider mb-2 block flex justify-between items-center">
                  Required Variables
                  <div className="flex gap-2">
                    <input 
                      placeholder="var_name" 
                      className="bg-white/10 border border-white/20 px-2 py-1 rounded text-white text-xs font-mono w-24"
                      value={newVarName}
                      onChange={e => setNewVarName(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if(newVarName) {
                          setNewPrompt({...newPrompt, variables: [...(newPrompt.variables || []), { name: newVarName, type: 'string', required: true }]});
                          setNewVarName('');
                        }
                      }}
                      className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white px-2 py-1 rounded text-xs transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </label>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {(newPrompt.variables || []).map((v, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-sm text-white font-mono flex items-center gap-2">
                      {v.name}
                      <button 
                        onClick={() => {
                          const vars = [...(newPrompt.variables || [])];
                          vars.splice(idx, 1);
                          setNewPrompt({...newPrompt, variables: vars});
                        }}
                        className="text-textMuted hover:text-rose-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {(!newPrompt.variables || newPrompt.variables.length === 0) && (
                    <span className="text-sm text-textMuted italic">No variables added.</span>
                  )}
                </div>
              </div>

            </div>
            
            <div className="p-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
              <button onClick={() => setShowAddPromptModal(false)} className="px-5 py-2.5 rounded-xl hover:bg-white/5 text-sm font-medium text-white transition-colors">Cancel</button>
              <button onClick={handleCreatePrompt} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-sm font-bold shadow-[0_4px_14px_rgba(99,102,241,0.39)] transition-all">
                Create Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
