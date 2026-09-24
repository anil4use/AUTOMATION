'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FileText,
  Loader2,
  Play,
  Code2,
  Plus,
  History,
  Sparkles,
  Search,
  Zap,
  ArrowRight,
  Wand2,
  RotateCcw,
  Layers,
  Workflow,
  Cpu,
  Database,
  Archive,
  CheckCircle2,
  Copy,
  Download,
  FolderDown,
  Box,
  Share2,
} from 'lucide-react';
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
  createdAt?: string;
}

interface DynamicConnector {
  _id?: string;
  connectorId: string;
  name?: string;
  displayName?: string;
  description?: string;
  categoryId?: string;
  status?: string;
  isConnected?: boolean;
  actions?: Array<{ id: string; name: string; description?: string }>;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [dbConnectors, setDbConnectors] = useState<DynamicConnector[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected state
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<AIPrompt | null>(null);
  const [editTemplate, setEditTemplate] = useState('');

  // Dynamic Connectors Selection for connectorContext
  const [selectedConnectorIds, setSelectedConnectorIds] = useState<string[]>([]);

  // Live variable values for real-time compiled preview
  const [liveVarInputs, setLiveVarInputs] = useState<Record<string, string>>({});
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Version History Modal/Drawer
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [versionHistory, setVersionHistory] = useState<AIPrompt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Playground state
  const [showTestModal, setShowTestModal] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isGeneratingAiPayload, setIsGeneratingAiPayload] = useState(false);
  const [isSavingToVault, setIsSavingToVault] = useState(false);
  const [testProviderId, setTestProviderId] = useState('');
  const [testModelId, setTestModelId] = useState('');
  const [testUserMessage, setTestUserMessage] = useState('');

  // AI Response Analyzer & Formatter State
  const [outputViewMode, setOutputViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [formattedResponse, setFormattedResponse] = useState<string>('');
  const [isFormattingResponse, setIsFormattingResponse] = useState<boolean>(false);
  const [requestedVaultFormat, setRequestedVaultFormat] = useState<'auto' | 'summary' | 'pdf' | 'table' | 'csv' | 'json'>('auto');

  // Selected step index in Multi-Step Flow Pipeline Visualizer
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Add Prompt state
  const [showAddPromptModal, setShowAddPromptModal] = useState(false);
  const [newPrompt, setNewPrompt] = useState<Partial<AIPrompt>>({
    name: '',
    description: '',
    feature: 'agent-chat',
    promptKey: '',
    type: 'system',
    template: 'You are an AI assistant...',
    variables: [],
    status: 'active',
  });

  // Fetch control plane data dynamically from DB/API
  const fetchData = async () => {
    try {
      const [promptsRes, provRes, modRes, connRes, userConnsRes] = await Promise.all([
        apiClient.get('/v1/ai-control-plane/prompts'),
        apiClient.get('/v1/ai-control-plane/providers'),
        apiClient.get('/v1/ai-control-plane/models'),
        apiClient.get('/v1/connectors').catch(() => ({ data: { data: [] } })),
        apiClient.get('/v1/connectors/connections').catch(() => ({ data: { data: [] } })),
      ]);

      setPrompts(promptsRes.data);
      setProviders(provRes.data);
      setModels(modRes.data);

      const rawConnectors: DynamicConnector[] = Array.isArray(connRes.data)
        ? connRes.data
        : connRes.data?.data || [];

      const userConns = Array.isArray(userConnsRes.data)
        ? userConnsRes.data
        : userConnsRes.data?.data || [];

      const authedIds = new Set<string>(userConns.map((uc: any) => uc.connectorId));
      const systemIds = new Set(['web-search', 'web-browser', 'http-request', 'autoflow-schedule', 'ai-agent', 'data-vault', 'local-storage']);

      // Strictly filter ONLY connectors that are authenticated or system-configured
      const processedConnectors = rawConnectors
        .filter((c) => authedIds.has(c.connectorId) || systemIds.has(c.connectorId))
        .map((c) => ({
          ...c,
          isConnected: true,
        }));

      setDbConnectors(processedConnectors);
      setSelectedConnectorIds(processedConnectors.map((c) => c.connectorId));

      if (provRes.data.length > 0) setTestProviderId(provRes.data[0].providerId);
      if (modRes.data.length > 0) setTestModelId(modRes.data[0].modelId);

      if (promptsRes.data.length > 0 && !selectedPrompt) {
        setSelectedPrompt(promptsRes.data[0]);
        setEditTemplate(promptsRes.data[0].template);
      }
    } catch (err: any) {
      toast.error('Failed to load control plane dynamic data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Extract variables dynamically from Handlebars regex {{variableName}}
  const detectedVariables = useMemo(() => {
    const matches = editTemplate.match(/\{\{([^{}]+)\}\}/g) || [];
    const varNames = Array.from(
      new Set(matches.map((m) => m.replace(/[\{\}]/g, '').trim()))
    );
    return varNames;
  }, [editTemplate]);

  // AI Generator for dynamic, contextually realistic test payloads
  const handleGenerateAiTestPayload = async () => {
    if (!selectedPrompt) return;
    setIsGeneratingAiPayload(true);
    try {
      const res = await apiClient.post('/v1/ai-control-plane/generate-test-payload', {
        promptKey: selectedPrompt.promptKey,
        template: editTemplate,
        variables: detectedVariables,
        providerId: testProviderId,
        modelId: testModelId,
        selectedConnectorIds,
      });

      if (res.data?.variables) {
        setLiveVarInputs(res.data.variables);
        setTestVariables(res.data.variables);
      }
      if (res.data?.userMessage) {
        setTestUserMessage(res.data.userMessage);
      }

      toast.success('AI generated realistic test payload for connected & authed apps!');
    } catch (err: any) {
      toast.error('AI payload generation failed');
    } finally {
      setIsGeneratingAiPayload(false);
    }
  };

  // Save AI Output Response to Data Vault
  const handleSaveToVault = async (customContent?: any) => {
    const payloadToSave = customContent || testResponse?.content || liveCompiledPrompt;
    if (!payloadToSave) {
      toast.error('No output available to save');
      return;
    }

    setIsSavingToVault(true);
    try {
      const res = await apiClient.post('/v1/ai-control-plane/save-to-vault', {
        title: selectedPrompt?.name || 'AI Playground Output',
        promptKey: selectedPrompt?.promptKey || 'playground',
        providerId: testProviderId,
        modelId: testModelId,
        userInstruction: testUserMessage || selectedPrompt?.name,
        requestedFormat: requestedVaultFormat,
        content: payloadToSave,
      });

      const formatLabel = res.data.formatted?.formatType ? res.data.formatted.formatType.toUpperCase() : 'HUMAN-READABLE';
      toast.success(
        `📦 Saved to Data Vault in ${formatLabel} format! (${res.data.fileName})`,
        { duration: 5000 }
      );
    } catch (err: any) {
      toast.error(`Failed to save to Data Vault: ${err.message}`);
    } finally {
      setIsSavingToVault(false);
    }
  };

  // Re-format AI response on requested format change
  const reFormatResponse = async (fmt: 'auto' | 'summary' | 'pdf' | 'table' | 'csv' | 'json') => {
    setRequestedVaultFormat(fmt);
    if (!testResponse?.content) return;
    setIsFormattingResponse(true);
    try {
      const fmtRes = await apiClient.post('/v1/ai-control-plane/format-response', {
        rawResponse: testResponse.content,
        userInstruction: testUserMessage || selectedPrompt?.name,
        requestedFormat: fmt,
        providerId: testProviderId,
        modelId: testModelId,
      });
      if (fmtRes.data?.formattedContent) {
        setFormattedResponse(fmtRes.data.formattedContent);
      }
    } catch {
      toast.error('Format conversion failed');
    } finally {
      setIsFormattingResponse(false);
    }
  };

  // When selected prompt changes, reset selection and trigger AI payload generator
  useEffect(() => {
    if (selectedPrompt) {
      setEditTemplate(selectedPrompt.template);
      setSelectedConnectorIds([]);
      setTestResponse(null);
      setFormattedResponse('');
      handleGenerateAiTestPayload();
    }
  }, [selectedPrompt]);

  // Toggle dynamic connector selection
  const toggleConnectorSelection = (cid: string) => {
    let updated: string[];
    if (selectedConnectorIds.includes(cid)) {
      updated = selectedConnectorIds.filter((id) => id !== cid);
    } else {
      updated = [...selectedConnectorIds, cid];
    }
    setSelectedConnectorIds(updated);

    // Update connectorContext variable with updated selection
    const selectedList = dbConnectors.filter((c) => updated.includes(c.connectorId));
    const connContextJson = JSON.stringify(
      selectedList.map((c) => ({
        id: c.connectorId,
        name: c.displayName || c.name || c.connectorId,
        status: 'connected',
        actions: (c.actions || []).map((a: any) => a.id || a.actionId || 'execute'),
      })),
      null,
      2
    );

    setLiveVarInputs((prev) => ({ ...prev, connectorContext: connContextJson }));
    setTestVariables((prev) => ({ ...prev, connectorContext: connContextJson }));
  };

  const handleResetVariables = () => {
    const empty: Record<string, string> = {};
    detectedVariables.forEach((v) => (empty[v] = ''));
    setLiveVarInputs(empty);
    setTestVariables(empty);
    setTestUserMessage('');
    toast.info('Reset variable fields');
  };

  // Real-time Handlebars compiled prompt text preview
  const liveCompiledPrompt = useMemo(() => {
    let output = editTemplate;
    detectedVariables.forEach((vName) => {
      const val = liveVarInputs[vName] ?? `{{${vName}}}`;
      output = output.replace(new RegExp(`\\{\\{${vName}\\}\\}`, 'g'), val);
    });
    return output;
  }, [editTemplate, detectedVariables, liveVarInputs]);

  // Estimated tokens count (~4 chars per token)
  const estimatedTokens = useMemo(() => {
    return Math.ceil(editTemplate.length / 4);
  }, [editTemplate]);

  // Parse multi-step execution plan dynamically from any JSON response returned by LLM
  const parsedExecutionPlan = useMemo(() => {
    if (!testResponse || !testResponse.content) return null;
    try {
      let raw = testResponse.content;
      const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch && codeBlockMatch[1]) raw = codeBlockMatch[1].trim();
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end > start) {
        raw = raw.substring(start, end + 1);
      }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.plan)) return parsed.plan;
    } catch {}
    return null;
  }, [testResponse]);

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const matchesFeature = selectedFeature === 'all' || p.feature === selectedFeature;
      const matchesQuery =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.promptKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.feature.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFeature && matchesQuery;
    });
  }, [prompts, selectedFeature, searchQuery]);

  const uniqueFeatures = useMemo(() => {
    const feats = Array.from(new Set(prompts.map((p) => p.feature)));
    return ['all', ...feats];
  }, [prompts]);

  const handleSaveVersion = async () => {
    if (!selectedPrompt) return;
    try {
      const payload = {
        ...selectedPrompt,
        template: editTemplate,
        variables: detectedVariables.map((v) => ({
          name: v,
          type: 'string',
          required: true,
        })),
        status: 'active',
      };
      const res = await apiClient.post('/v1/ai-control-plane/prompts', payload);
      toast.success(`Prompt saved and activated as v${res.data.version}!`);
      await fetchData();
      setSelectedPrompt(res.data);
    } catch (err: any) {
      toast.error('Failed to save prompt version');
    }
  };

  const fetchHistory = async () => {
    if (!selectedPrompt) return;
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const res = await apiClient.get(
        `/v1/ai-control-plane/prompts/history/${selectedPrompt.feature}/${selectedPrompt.promptKey}`
      );
      setVersionHistory(res.data);
    } catch (err: any) {
      toast.error('Failed to fetch prompt history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleActivateVersion = async (promptId: string) => {
    try {
      const res = await apiClient.put(`/v1/ai-control-plane/prompts/activate/${promptId}`);
      toast.success(`Activated version v${res.data.prompt.version}!`);
      setShowHistoryModal(false);
      await fetchData();
      setSelectedPrompt(res.data.prompt);
      setEditTemplate(res.data.prompt.template);
    } catch (err: any) {
      toast.error('Failed to activate version');
    }
  };

  const handleRunTest = async () => {
    if (!selectedPrompt) return;
    setIsTesting(true);
    setTestResponse(null);
    setFormattedResponse('');
    setActiveStepIndex(0);
    try {
      const payload = {
        providerId: testProviderId,
        modelId: testModelId,
        template: editTemplate,
        variables: testVariables,
        userMessage: testUserMessage || undefined,
      };
      const res = await apiClient.post('/v1/ai-control-plane/test-prompt', payload);
      setTestResponse(res.data);
      toast.success('Prompt execution completed!');

      // Automatically normalize & format technical output into human-readable representation
      if (res.data?.content) {
        setIsFormattingResponse(true);
        try {
          const fmtRes = await apiClient.post('/v1/ai-control-plane/format-response', {
            rawResponse: res.data.content,
            userInstruction: testUserMessage || selectedPrompt.name,
            requestedFormat: requestedVaultFormat,
            providerId: testProviderId,
            modelId: testModelId,
          });
          if (fmtRes.data?.formattedContent) {
            setFormattedResponse(fmtRes.data.formattedContent);
          }
        } catch {
          setFormattedResponse(res.data.content);
        } finally {
          setIsFormattingResponse(false);
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message;
      toast.error('Playground test failed');
      setTestResponse({
        success: false,
        content: `[EXECUTION ERROR]\n\n${errMsg}`,
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        tokensPerSec: 0,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPrompt.name || !newPrompt.promptKey) {
      toast.error('Prompt Name and Prompt Key are required');
      return;
    }
    try {
      const res = await apiClient.post('/v1/ai-control-plane/prompts', newPrompt);
      toast.success('New Prompt Template created successfully!');
      setShowAddPromptModal(false);
      setNewPrompt({
        name: '',
        description: '',
        feature: 'agent-chat',
        promptKey: '',
        type: 'system',
        template: 'You are an AI assistant...',
        variables: [],
        status: 'active',
      });
      await fetchData();
      setSelectedPrompt(res.data);
    } catch (err: any) {
      toast.error('Failed to create prompt');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-140px)] w-full font-sans">
      {/* Premium Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/[0.02] border border-white/10 backdrop-blur-md rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl border border-indigo-400/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <FileText className="text-white" size={20} />
            </div>
            Prompts & Templates Orchestrator
          </h1>
          <p className="text-xs text-textMuted mt-1 flex items-center gap-2">
            <span>Enterprise Prompt Engineering</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>AI Dynamic Payloads</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-indigo-400 font-semibold flex items-center gap-1">
              <Database size={11} /> Data Vault Storage SDK
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddPromptModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(99,102,241,0.39)] hover:scale-105"
          >
            <Plus size={16} /> Create Prompt
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Sidebar List */}
        <div className="w-[360px] bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          {/* Search & Feature Filter Header */}
          <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.01]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-white/30" size={15} />
              <input
                type="text"
                placeholder="Filter prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Feature Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {uniqueFeatures.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFeature(f)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedFeature === f
                      ? 'bg-indigo-500 text-white font-semibold shadow-md'
                      : 'bg-white/5 text-textMuted hover:text-white hover:bg-white/10'
                  }`}
                >
                  {f === 'all' ? 'All Features' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Prompts List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
            {filteredPrompts.map((p) => {
              const isSelected = selectedPrompt?._id === p._id;
              return (
                <div
                  key={p._id}
                  onClick={() => setSelectedPrompt(p)}
                  className={`p-4 cursor-pointer transition-all duration-200 group relative ${
                    isSelected
                      ? 'bg-indigo-500/10 border-l-4 border-indigo-400'
                      : 'hover:bg-white/[0.04] border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span
                      className={`text-sm font-semibold tracking-tight transition-colors ${
                        isSelected ? 'text-indigo-200' : 'text-white group-hover:text-indigo-300'
                      }`}
                    >
                      {p.name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                        p.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}
                    >
                      v{p.version} • {p.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] text-textMuted font-mono flex items-center gap-1 mb-2">
                    <span className="text-indigo-400/80">{p.feature}</span>
                    <span className="text-white/20">/</span>
                    <span className="text-white/70">{p.promptKey}</span>
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-textMuted">
                    <span className="bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20 font-mono">
                      {p.type}
                    </span>
                    <span>{p.variables.length} Variables</span>
                  </div>
                </div>
              );
            })}

            {filteredPrompts.length === 0 && (
              <div className="p-8 text-center text-textMuted text-xs">
                No matching prompts found.
              </div>
            )}
          </div>
        </div>

        {/* Right Editor & Workspace Area */}
        {selectedPrompt ? (
          <div className="flex-1 flex flex-col gap-5 overflow-hidden">
            {/* Top Prompt Header */}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl p-5 shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    {selectedPrompt.name}
                  </h2>
                  <span className="text-xs font-mono bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                    v{selectedPrompt.version} ACTIVE
                  </span>
                </div>
                <p className="text-xs text-textMuted">{selectedPrompt.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchHistory}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <History size={14} className="text-indigo-400" /> Version History
                </button>

                <button
                  onClick={() => setShowTestModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:scale-105"
                >
                  <Play size={14} className="fill-current" /> Playground Test
                </button>
              </div>
            </div>

            {/* Split Workspace: Editor (Left) & Dynamic Variable Live Preview (Right) */}
            <div className="flex-1 flex gap-5 overflow-hidden">
              {/* Template Text Editor */}
              <div className="flex-1 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="p-3.5 border-b border-white/10 bg-white/[0.01] flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-white">
                    <Code2 size={16} className="text-indigo-400" /> Template Code Editor
                  </span>

                  <div className="flex items-center gap-4 text-textMuted text-[11px]">
                    <span className="font-mono text-indigo-300">
                      ~{estimatedTokens} tokens
                    </span>
                    {editTemplate !== selectedPrompt.template && (
                      <button
                        onClick={handleSaveVersion}
                        className="bg-indigo-500 text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-indigo-400 transition-colors shadow-md animate-pulse"
                      >
                        Save as v{selectedPrompt.version + 1}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 relative">
                  <textarea
                    className="w-full h-full bg-[#0a0a0a]/60 text-[#e0e0e0] font-mono p-5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/40 text-xs leading-relaxed custom-scrollbar"
                    value={editTemplate}
                    onChange={(e) => setEditTemplate(e.target.value)}
                    placeholder="Type template with Handlebars {{variable}} tags..."
                  />
                </div>
              </div>

              {/* Dynamic Live Variable Inputs & Real-Time Output Preview */}
              <div className="w-[400px] bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl flex flex-col overflow-hidden shrink-0 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="p-3.5 border-b border-white/10 bg-white/[0.01] flex justify-between items-center text-xs font-semibold">
                  <span className="flex items-center gap-2 text-white">
                    <Sparkles size={16} className="text-amber-400" /> Live Variables & AI Generator
                  </span>

                  <button
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="text-[11px] text-indigo-400 hover:text-white transition-colors"
                  >
                    {showLivePreview ? 'Hide Output' : 'Show Output'}
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                  {/* Dynamic Database Connectors Selector */}
                  {detectedVariables.includes('connectorContext') && dbConnectors.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers size={13} className="text-indigo-400" /> Connected Apps ({dbConnectors.filter((c) => c.isConnected).length} Authed)
                        </span>
                        <span className="text-[10px] text-textMuted font-mono">
                          {selectedConnectorIds.length} Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar pt-1">
                        {dbConnectors.map((c) => {
                          const isChecked = selectedConnectorIds.includes(c.connectorId);
                          return (
                            <button
                              key={c.connectorId}
                              onClick={() => toggleConnectorSelection(c.connectorId)}
                              className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-mono text-left transition-all ${
                                isChecked
                                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-white font-semibold'
                                  : 'bg-white/5 border border-white/5 text-textMuted hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Cpu size={12} className={isChecked ? 'text-indigo-400' : 'text-textMuted'} />
                                <span className="truncate">{c.displayName || c.name || c.connectorId}</span>
                              </div>
                              {c.isConnected ? (
                                <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-sans shrink-0 font-medium">
                                  ⚡ Authed
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 py-0.2 bg-white/5 text-textMuted rounded font-sans shrink-0">
                                  Offline
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[11px] font-bold text-textMuted uppercase tracking-wider">
                        Variables ({detectedVariables.length})
                      </h4>
                      {detectedVariables.length > 0 && (
                        <button
                          onClick={handleGenerateAiTestPayload}
                          disabled={isGeneratingAiPayload}
                          className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 transition-colors disabled:opacity-50"
                        >
                          {isGeneratingAiPayload ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <Wand2 size={10} />
                          )}
                          {isGeneratingAiPayload ? 'AI Generating...' : '🪄 AI Generate Payload'}
                        </button>
                      )}
                    </div>

                    {detectedVariables.length === 0 ? (
                      <p className="text-xs text-textMuted italic bg-white/5 p-3 rounded-xl">
                        No <code>&#123;&#123;variable&#125;&#125;</code> tags detected in prompt template. Add one to create dynamic slots!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {detectedVariables.map((vName) => (
                          <div key={vName}>
                            <label className="text-[11px] font-mono text-indigo-300 block mb-1">
                              &#123;&#123;{vName}&#125;&#125;
                            </label>
                            <textarea
                              className="w-full h-20 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono custom-scrollbar"
                              value={liveVarInputs[vName] ?? ''}
                              onChange={(e) =>
                                setLiveVarInputs((prev) => ({ ...prev, [vName]: e.target.value }))
                              }
                              placeholder={`Value for ${vName}...`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showLivePreview && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-bold text-textMuted uppercase tracking-wider">
                          Live Compiled System Prompt
                        </h4>
                        <button
                          onClick={() => handleSaveToVault(liveCompiledPrompt)}
                          disabled={isSavingToVault}
                          className="text-[10px] text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded flex items-center gap-1 transition-all"
                        >
                          <Database size={10} /> Save to Data Vault
                        </button>
                      </div>

                      <div className="bg-[#050505] border border-white/10 rounded-xl p-3 text-[11px] text-emerald-300/90 font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto custom-scrollbar leading-relaxed">
                        {liveCompiledPrompt}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-textMuted border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
            <FileText size={48} className="text-white/10 mb-4" />
            <p className="font-medium text-sm">Select a prompt template from the left sidebar to edit.</p>
          </div>
        )}
      </div>

      {/* Version History Drawer / Modal */}
      {showHistoryModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-[#0d0e12] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="text-indigo-400" size={18} />
                Version History — {selectedPrompt.name}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-textMuted hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {loadingHistory ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-indigo-400" size={24} />
                </div>
              ) : (
                versionHistory.map((ver) => (
                  <div
                    key={ver._id}
                    className={`p-4 border rounded-xl flex flex-col gap-3 transition-colors ${
                      ver.status === 'active'
                        ? 'bg-indigo-500/10 border-indigo-500/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">
                          v{ver.version}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            ver.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {ver.status}
                        </span>
                      </div>

                      {ver.status !== 'active' && (
                        <button
                          onClick={() => handleActivateVersion(ver._id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-lg transition-colors"
                        >
                          Activate Version
                        </button>
                      )}
                    </div>

                    <div className="bg-black/50 p-3 rounded-lg text-xs font-mono text-gray-300 max-h-28 overflow-y-auto custom-scrollbar whitespace-pre-wrap border border-white/5">
                      {ver.template}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Playground Modal */}
      {showTestModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
          <div className="bg-[#0B0C10] border border-indigo-500/40 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-[0_0_60px_rgba(99,102,241,0.25)] overflow-hidden">
            {/* Modal Top Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                  <Play className="text-indigo-400 fill-current" size={16} />
                </div>
                Interactive AI Prompt & Multi-Connector Playground
                <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-md border border-indigo-500/20">
                  {selectedPrompt.promptKey}
                </span>
              </h3>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-textMuted hover:text-white text-sm p-1 rounded-lg hover:bg-white/5"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Config Panel */}
              <div className="w-[380px] border-r border-white/10 p-5 bg-white/[0.01] overflow-y-auto custom-scrollbar flex flex-col gap-5 shrink-0">
                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2 block">
                    LLM Provider Route
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none mb-3"
                    value={testProviderId}
                    onChange={(e) => {
                      setTestProviderId(e.target.value);
                      const pModels = models.filter((m) => m.providerId === e.target.value);
                      if (pModels.length > 0) setTestModelId(pModels[0].modelId);
                    }}
                  >
                    {providers.map((p) => (
                      <option key={p.providerId} value={p.providerId} className="bg-[#1e1e1e]">
                        {p.name} ({p.providerId})
                      </option>
                    ))}
                  </select>

                  <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2 block">
                    Target Model
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none"
                    value={testModelId}
                    onChange={(e) => setTestModelId(e.target.value)}
                  >
                    {models
                      .filter((m) => m.providerId === testProviderId)
                      .map((m) => (
                        <option key={m.modelId} value={m.modelId} className="bg-[#1e1e1e]">
                          {m.name || m.modelId}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Dynamic Connector Picker inside Playground Modal (loaded from DB) */}
                {detectedVariables.includes('connectorContext') && dbConnectors.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers size={13} className="text-indigo-400" /> Active SDK Connectors ({dbConnectors.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {dbConnectors.map((c) => {
                        const isChecked = selectedConnectorIds.includes(c.connectorId);
                        return (
                          <button
                            key={c.connectorId}
                            onClick={() => toggleConnectorSelection(c.connectorId)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] font-mono text-left transition-all ${
                              isChecked
                                ? 'bg-indigo-600/30 border border-indigo-500/50 text-white font-semibold'
                                : 'bg-white/5 border border-white/5 text-textMuted hover:text-white'
                            }`}
                          >
                            <Cpu size={12} className={isChecked ? 'text-indigo-400' : 'text-textMuted'} />
                            <span className="truncate">{c.displayName || c.name || c.connectorId}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider">
                      Test Payload Variables
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateAiTestPayload}
                        disabled={isGeneratingAiPayload}
                        className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        {isGeneratingAiPayload ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Wand2 size={10} />
                        )}
                        {isGeneratingAiPayload ? 'Generating...' : '🪄 AI Payload'}
                      </button>

                      <button
                        onClick={handleResetVariables}
                        className="text-[10px] text-gray-400 hover:text-white bg-white/5 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw size={10} /> Clear
                      </button>
                    </div>
                  </div>

                  {detectedVariables.length === 0 ? (
                    <p className="text-xs text-textMuted italic">No variables required.</p>
                  ) : (
                    <div className="space-y-3">
                      {detectedVariables.map((vName) => (
                        <div key={vName}>
                          <label className="text-[10px] font-mono text-indigo-300 block mb-1">
                            {vName}
                          </label>
                          <textarea
                            className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono custom-scrollbar"
                            value={testVariables[vName] ?? ''}
                            onChange={(e) =>
                              setTestVariables((prev) => ({ ...prev, [vName]: e.target.value }))
                            }
                            placeholder={`Payload data for ${vName}...`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-textMuted uppercase tracking-wider mb-2 block">
                    User Input Message
                  </label>
                  <input
                    type="text"
                    placeholder="Enter prompt instruction..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    value={testUserMessage}
                    onChange={(e) => setTestUserMessage(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleRunTest}
                  disabled={isTesting}
                  className="mt-auto w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(99,102,241,0.39)]"
                >
                  {isTesting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Play size={16} className="fill-current" />
                  )}
                  {isTesting ? 'Executing Live AI Execution Test...' : 'Run Execution Test'}
                </button>
              </div>

              {/* Right Output & Multi-Connector Flow Inspector Area */}
              <div className="flex-1 p-5 flex flex-col bg-[#08080a] relative overflow-hidden">
                {/* Output Toolbar Header with Save to Data Vault Button */}
                <div className="flex items-center justify-between mb-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs">
                  <div className="flex items-center gap-4">
                    {testResponse ? (
                      <>
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Zap size={14} /> Latency: {testResponse.latencyMs} ms
                        </span>
                        <span className="flex items-center gap-1 text-indigo-300 font-semibold">
                          🚀 Speed: {testResponse.tokensPerSec} t/s
                        </span>
                        <span className="text-textMuted">
                          Tokens: {testResponse.inputTokens} in / {testResponse.outputTokens} out
                        </span>
                      </>
                    ) : (
                      <span className="text-textMuted italic flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" /> Awaiting live AI execution output...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Format selector for saving to Data Vault */}
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-xl">
                      <span className="text-[10px] text-textMuted font-mono">Format:</span>
                      <select
                        value={requestedVaultFormat}
                        onChange={(e) => reFormatResponse(e.target.value as any)}
                        className="bg-transparent text-white text-[11px] font-mono focus:outline-none cursor-pointer"
                      >
                        <option value="auto" className="bg-[#1a1a1a]">Auto Format</option>
                        <option value="summary" className="bg-[#1a1a1a]">Markdown Summary</option>
                        <option value="pdf" className="bg-[#1a1a1a]">PDF Document</option>
                        <option value="table" className="bg-[#1a1a1a]">Markdown Table</option>
                        <option value="csv" className="bg-[#1a1a1a]">CSV Spreadsheet</option>
                        <option value="json" className="bg-[#1a1a1a]">Clean JSON</option>
                      </select>
                    </div>

                    {testResponse?.content && (
                      <button
                        onClick={() => handleSaveToVault()}
                        disabled={isSavingToVault}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl border border-indigo-400/40 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:scale-105 disabled:opacity-50"
                      >
                        {isSavingToVault ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Database size={13} />
                        )}
                        {isSavingToVault ? 'Saving...' : '📦 Save Output to Data Vault'}
                      </button>
                    )}

                    {parsedExecutionPlan && (
                      <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {parsedExecutionPlan.length} CONNECTOR STEPS DETECTED
                      </span>
                    )}
                  </div>
                </div>

                {/* View Mode Toggle: Human Response vs Technical Workflow Plan */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setOutputViewMode('formatted')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      outputViewMode === 'formatted'
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-md'
                        : 'bg-white/5 border border-white/10 text-textMuted hover:text-white'
                    }`}
                  >
                    <Sparkles size={13} className="text-amber-400" />
                    <span>✨ AI Formatted Human Response</span>
                  </button>

                  <button
                    onClick={() => setOutputViewMode('raw')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      outputViewMode === 'raw'
                        ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 shadow-md'
                        : 'bg-white/5 border border-white/10 text-textMuted hover:text-white'
                    }`}
                  >
                    <Code2 size={13} className="text-indigo-400" />
                    <span>⚙️ Technical Plan & Raw Output</span>
                  </button>
                </div>

                {/* Multi-Step Execution Flow Pipeline Visualizer (Shown in Raw or Formatted mode when steps exist) */}
                {outputViewMode === 'raw' && parsedExecutionPlan && parsedExecutionPlan.length > 0 && (
                  <div className="mb-4 bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                        <Workflow className="text-indigo-400" size={15} />
                        Dynamic Execution Flow & Input-Output Chaining Pipeline
                      </h4>
                      <span className="text-[10px] text-textMuted">Click step node to inspect inputs</span>
                    </div>

                    {/* Dynamic Step Nodes Row */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {parsedExecutionPlan.map((step: any, idx: number) => {
                        const isSelectedStep = activeStepIndex === idx;

                        return (
                          <React.Fragment key={step.stepId || idx}>
                            <button
                              onClick={() => setActiveStepIndex(idx)}
                              className={`p-3 rounded-xl border flex items-center gap-3 transition-all shrink-0 ${
                                isSelectedStep
                                  ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              <Cpu size={16} className="text-indigo-400" />
                              <div className="text-left font-mono">
                                <div className="text-[11px] font-bold text-white">
                                  {step.stepId || `step_${idx + 1}`}: {step.connectorId}
                                </div>
                                <div className="text-[10px] text-indigo-300 font-semibold">
                                  {step.actionId}
                                </div>
                              </div>
                            </button>

                            {idx < parsedExecutionPlan.length - 1 && (
                              <ArrowRight size={16} className="text-indigo-400 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Selected Step Input / Output Definition Card */}
                    {parsedExecutionPlan[activeStepIndex] && (
                      <div className="bg-[#040406] border border-indigo-500/20 rounded-xl p-3.5 space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center text-[11px] text-indigo-300 font-bold border-b border-white/10 pb-2">
                          <span>
                            STEP {activeStepIndex + 1} DETAILS: {parsedExecutionPlan[activeStepIndex].description || parsedExecutionPlan[activeStepIndex].actionId}
                          </span>
                          <span className="text-textMuted">
                            Connector ID: <code className="text-emerald-400">{parsedExecutionPlan[activeStepIndex].connectorId}</code>
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-textMuted uppercase font-bold block mb-1">
                            Calculated Step Inputs & Variable Mappings:
                          </span>
                          <pre className="bg-black/70 p-2.5 rounded-lg text-[11px] text-gray-200 overflow-x-auto custom-scrollbar border border-white/5">
                            {JSON.stringify(parsedExecutionPlan[activeStepIndex].inputs || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main AI Output Content Box */}
                <div className="flex-1 bg-black/50 border border-white/10 rounded-xl p-5 text-xs text-gray-200 font-mono whitespace-pre-wrap overflow-y-auto custom-scrollbar leading-relaxed">
                  {isTesting || isFormattingResponse ? (
                    <div className="flex flex-col items-center justify-center h-full text-textMuted gap-3">
                      <Loader2 className="animate-spin text-indigo-400" size={32} />
                      <span>{isTesting ? 'Executing prompt across LLM...' : 'AI Normalizing & Formatting Response for User...'}</span>
                    </div>
                  ) : testResponse ? (
                    outputViewMode === 'formatted' ? (
                      formattedResponse || testResponse.content
                    ) : (
                      testResponse.content
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-textMuted italic">
                      Click "Run Execution Test" to execute prompt against active LLM model.
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
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="text-indigo-400" size={18} />
                Create Prompt Template
              </h3>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-textMuted uppercase font-bold tracking-wider mb-1 block">
                    Prompt Name
                  </label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Workflow Generator"
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-textMuted uppercase font-bold tracking-wider mb-1 block">
                    Feature Scope
                  </label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none font-mono"
                    value={newPrompt.feature}
                    onChange={(e) => setNewPrompt({ ...newPrompt, feature: e.target.value })}
                  >
                    <option value="agent-chat" className="bg-[#1e1e1e]">agent-chat</option>
                    <option value="ai-copilot" className="bg-[#1e1e1e]">ai-copilot</option>
                    <option value="whatsapp-agent" className="bg-[#1e1e1e]">whatsapp-agent</option>
                    <option value="data-bridge" className="bg-[#1e1e1e]">data-bridge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-textMuted uppercase font-bold tracking-wider mb-1 block">
                  Prompt Key ID
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none font-mono"
                  placeholder="e.g. generate_dag_workflow"
                  value={newPrompt.promptKey}
                  onChange={(e) => setNewPrompt({ ...newPrompt, promptKey: e.target.value })}
                />
              </div>

              <div>
                <label className="text-textMuted uppercase font-bold tracking-wider mb-1 block">
                  Description
                </label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  value={newPrompt.description}
                  onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-textMuted uppercase font-bold tracking-wider mb-1 block">
                  Template Content
                </label>
                <textarea
                  className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-3 text-white font-mono focus:border-indigo-500 focus:outline-none custom-scrollbar resize-none"
                  value={newPrompt.template}
                  onChange={(e) => setNewPrompt({ ...newPrompt, template: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
              <button
                onClick={() => setShowAddPromptModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePrompt}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-bold shadow-lg transition-all"
              >
                Create Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
