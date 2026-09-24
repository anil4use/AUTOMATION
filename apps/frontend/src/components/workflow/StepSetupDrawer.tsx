'use client';
import React, { useState, useEffect } from 'react';
import { X, Play, CheckCircle2, AlertCircle, Database, Layers, Key, Sliders, Sparkles, Loader2, ArrowRight, Search, Check, Info, Lock } from 'lucide-react';
import { DataTreePicker } from './DataTreePicker';
import { ConnectionSelector } from './ConnectionSelector';
import { AccountConnectModal } from './AccountConnectModal';
import { DatabaseConnectModal } from '@/components/connectors/DatabaseConnectModal';
import { DynamicFieldWidget } from '@/components/connectors/DynamicFieldWidget';
import { DynamicResponseVisualizer } from '@/components/connectors/DynamicResponseVisualizer';
import { apiClient } from '@/lib/api-client';
import { ALL_50_CONNECTOR_MANIFESTS, fetchCategories, getActionOrTriggerSchema, getManifestById, getV2InputSchema, getV2OutputSchema } from '@/lib/connector-manifests';
import { toast } from 'sonner';

interface StepSetupDrawerProps {
  node: any;
  allNodes: any[];
  edges: any[];
  connections?: any[];
  onSaveNode: (updatedNode: any) => void;
  onClose: () => void;
  onAddNewAccount: (connectorId: string) => void;
}

export function StepSetupDrawer({
  node,
  allNodes,
  edges,
  connections: externalConnections = [],
  onSaveNode,
  onClose,
  onAddNewAccount,
}: StepSetupDrawerProps) {
  const isSystemApp = ['autoflow-schedule', 'ai-agent', 'web-search', 'autoflow-condition', 'http-request', 'data-vault', 'local-storage'].includes(node?.connectorId);

  const [connectorId, setConnectorId] = useState(node.connectorId || 'gmail');
  const [connectionId, setConnectionId] = useState(node.connectionId || '');
  const [activeTab, setActiveTab] = useState<'app' | 'account' | 'setup' | 'test'>(
    !isSystemApp && !node.connectionId ? 'account' : 'setup'
  );
  const [name, setName] = useState(node.name || node.id);
  const [operationId, setOperationId] = useState(node.operationId || 'execute');
  const [config, setConfig] = useState<Record<string, any>>(node.config || {});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>(node.fieldMapping || {});
  const [activeInputKey, setActiveInputKey] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string>('');
  const [dynamicChoices, setDynamicChoices] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [userConnections, setUserConnections] = useState<any[]>(externalConnections);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [appSearch, setAppSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categoriesList, setCategoriesList] = useState<string[]>(['All', 'Jobs & Recruitment', 'Google Suite', 'Communication', 'AI', 'Databases', 'CRM', 'Utilities']);
  const [showPayloadPreview, setShowPayloadPreview] = useState(false);

  useEffect(() => {
    fetchCategories().then((cats) => {
      if (cats && Array.isArray(cats) && cats.length > 0) {
        setCategoriesList(cats);
      }
    });
  }, []);

  const PROVIDER_DOC_LINKS: Record<string, { title: string; url: string; authType: string }> = {
    gmail: { title: 'Google Cloud Console Credentials', url: 'https://console.cloud.google.com/apis/credentials', authType: 'OAuth 2.0 / App Password' },
    'google-sheets': { title: 'Google Service Account Keys', url: 'https://console.cloud.google.com/iam-admin/serviceaccounts', authType: 'OAuth 2.0 / Service Account' },
    'google-drive': { title: 'Google Cloud Console', url: 'https://console.cloud.google.com/apis/credentials', authType: 'OAuth 2.0' },
    'google-calendar': { title: 'Google Cloud Developer Settings', url: 'https://console.cloud.google.com/apis/credentials', authType: 'OAuth 2.0' },
    github: { title: 'GitHub Personal Access Tokens', url: 'https://github.com/settings/tokens', authType: 'PAT / OAuth 2.0' },
    stripe: { title: 'Stripe API Keys Dashboard', url: 'https://dashboard.stripe.com/apikeys', authType: 'Secret API Key' },
    slack: { title: 'Slack Apps & OAuth Tokens', url: 'https://api.slack.com/apps', authType: 'OAuth 2.0 Bot Token' },
    notion: { title: 'Notion My Integrations', url: 'https://www.notion.so/my-integrations', authType: 'Internal Integration Token' },
    hubspot: { title: 'HubSpot Private Apps', url: 'https://app.hubspot.com/l/integrations-settings', authType: 'Private App Access Token' },
    greenhouse: { title: 'Greenhouse Dev Center', url: 'https://app.greenhouse.io/configure/dev_center/credentials', authType: 'Harvest API Key' },
    lever: { title: 'Lever Integration Settings', url: 'https://hire.lever.co/settings/integrations', authType: 'API Key / OAuth 2.0' },
    postgresql: { title: 'PostgreSQL Connection Docs', url: 'https://www.postgresql.org/docs/', authType: 'Connection URI / Credentials' },
    mongodb: { title: 'MongoDB Atlas Connection UI', url: 'https://cloud.mongodb.com/', authType: 'Atlas Connection URI' },
  };

  // Sync drawer state whenever a new node is selected/clicked on the canvas
  useEffect(() => {
    if (node) {
      setName(node.name || node.id);
      setConnectorId(node.connectorId || 'gmail');
      setOperationId(node.operationId || 'execute');
      setConnectionId(node.connectionId || '');
      setConfig(node.config || {});
      setFieldMapping(node.fieldMapping || {});
      setActiveInputKey(null);
      setTestResult(null);
      setTestError('');

      const systemNode = ['autoflow-schedule', 'ai-agent', 'web-search', 'autoflow-condition', 'http-request', 'data-vault', 'local-storage'].includes(node.connectorId);
      if (!systemNode && !node.connectionId) {
        setActiveTab('account');
      } else {
        setActiveTab('setup');
      }
    }
  }, [node?.id, node?.connectorId, node?.operationId]);

  // Live real-time status & connection sync back to canvas node card
  useEffect(() => {
    if (node) {
      onSaveNode({
        ...node,
        name,
        connectorId,
        operationId,
        connectionId,
        config,
        fieldMapping,
      });
    }
  }, [connectionId, name, connectorId, operationId]);

  // 1. Fetch user's saved connections from MongoDB API
  useEffect(() => {
    apiClient.get('/v1/connectors/connections')
      .then((res) => {
        if (res.data.data) {
          setUserConnections(res.data.data);
          // Auto-select first matching connection if not already set
          const matching = res.data.data.find((c: any) => c.connectorId === connectorId || connectorId.includes(c.connectorId));
          if (matching && !connectionId) {
            setConnectionId(matching._id || matching.id);
          }
        }
      })
      .catch(() => { });
  }, [connectorId]);

  // 2. DYNAMICALLY RESOLVE MANIFEST SCHEMA FOR THIS CONNECTOR AND ACTION
  const currentManifest = getManifestById(connectorId);
  const currentActionSchema = getActionOrTriggerSchema(connectorId, operationId);

  // Gatekeeper auth check: Does this app require an account connection?
  const requiresAccount = !['autoflow-schedule', 'ai-agent', 'web-search', 'autoflow-condition', 'http-request', 'data-vault', 'local-storage'].includes(connectorId) && currentManifest?.authType !== 'none';
  const isAccountConnected = Boolean(connectionId);

  // Derive dynamic input fields for this specific connector & action
  const v2InputSchema = getV2InputSchema(connectorId, operationId);
  const schemaProperties = v2InputSchema?.properties || {};
  const uiProperties = currentActionSchema?.uiSchema || {};
  const requiredFields: string[] = v2InputSchema?.required || [];

  const declaredInputs = currentActionSchema?.inputs || [];
  const inputFieldKeys = Object.keys(schemaProperties).length > 0
    ? Object.entries(schemaProperties).map(([k, meta]: [string, any]) => ({
      key: k,
      label: meta.title || k,
      type: meta.type || 'string',
      required: requiredFields.includes(k),
    }))
    : declaredInputs.map((i: any) => ({
      key: i.key,
      label: i.label || i.key,
      type: i.type || 'string',
      required: i.required,
    }));

  // 3. DYNAMICALLY COLLECT PREVIOUS STEP OUTPUT SOURCES FOR DATATREEPICKER
  const previousNodes = allNodes.filter((n) => n.id !== node.id);
  const dataSources = previousNodes.map((n) => {
    const prevSchema = getActionOrTriggerSchema(n.connectorId, n.operationId || 'execute');
    const declaredOutputs = prevSchema?.outputs || [];

    const fields = declaredOutputs.length > 0
      ? declaredOutputs.map((o: any) => ({
        key: o.key,
        label: o.label || o.key,
        path: `${n.id === 'trigger' ? 'trigger' : n.id}.${o.key}`,
        sampleValue: o.key === 'email' ? 'alex@example.com' : o.key === 'id' ? '1001' : 'sample_data',
      }))
      : [
        { key: 'id', label: 'ID', path: `${n.id === 'trigger' ? 'trigger' : n.id}.id`, sampleValue: '1001' },
        { key: 'email', label: 'Email', path: `${n.id === 'trigger' ? 'trigger' : n.id}.email`, sampleValue: 'alex@example.com' },
        { key: 'name', label: 'Name', path: `${n.id === 'trigger' ? 'trigger' : n.id}.name`, sampleValue: 'Alex Johnson' },
        { key: 'status', label: 'Status', path: `${n.id === 'trigger' ? 'trigger' : n.id}.status`, sampleValue: 'active' },
      ];

    return {
      stepId: n.id,
      stepName: n.name || n.id,
      connectorId: n.connectorId,
      fields,
    };
  });

  // Handle App Connector selection change
  const handleSelectApp = (newAppId: string) => {
    setConnectorId(newAppId);
    const m = getManifestById(newAppId);
    const primaryOp = m?.actions[0]?.id || m?.triggers[0]?.id || 'execute';
    const primaryOpName = m?.actions[0]?.name || m?.triggers[0]?.name || primaryOp;

    setOperationId(primaryOp);
    setName(`${m?.name || newAppId} - ${primaryOpName}`);
    setConfig({});
    setFieldMapping({});
    setActiveInputKey(null);

    // Auto-select matching user connection
    const matching = userConnections.find((c: any) => c.connectorId === newAppId || newAppId.includes(c.connectorId));
    if (matching) {
      setConnectionId(matching._id || matching.id);
      setActiveTab('setup');
    } else {
      setConnectionId('');
      const systemApp = ['autoflow-schedule', 'ai-agent', 'web-search', 'web-browser', 'autoflow-condition', 'http-request'].includes(newAppId);
      if (!systemApp && m?.authType !== 'none') {
        setActiveTab('account');
      }
    }
  };

  // Handle Action selection change
  const handleSelectAction = (newOpId: string) => {
    setOperationId(newOpId);
    const m = getManifestById(connectorId);
    const actionObj = m?.actions.find((a) => a.id === newOpId) || m?.triggers.find((t) => t.id === newOpId);
    if (actionObj) {
      setName(`${m?.name || connectorId} - ${actionObj.name}`);
    }
  };

  // Fetch live choices when connection changes
  useEffect(() => {
    if (connectionId && connectorId) {
      apiClient.get(`/v1/connectors/${connectorId}/choices/${operationId}?connectionId=${connectionId}`)
        .then((res) => {
          if (res.data.data?.choices) {
            setDynamicChoices((prev) => ({ ...prev, [connectorId]: res.data.data.choices }));
          }
        })
        .catch(() => { });
    }
  }, [connectionId, connectorId, operationId]);

  const handleFieldChange = (key: string, val: string) => {
    setConfig((prev) => ({ ...prev, [key]: val }));
    setFieldMapping((prev) => ({ ...prev, [key]: val }));
  };

  const handleInsertVariable = (expr: string) => {
    if (!activeInputKey) return;
    const currentVal = config[activeInputKey] || '';
    handleFieldChange(activeInputKey, `${currentVal}${expr}`);
    setActiveInputKey(null);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError('');
    try {
      const endpoint = node.type === 'trigger' ? '/v1/workflows/test-trigger' : '/v1/workflows/test-step';
      const res = await apiClient.post(endpoint, {
        connectorId,
        node: { ...node, name, connectorId, operationId, connectionId, config, fieldMapping },
      });
      setTestResult(res.data.data);
    } catch (e: any) {
      setTestError(e?.response?.data?.message || 'Test execution failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveNode({
      ...node,
      name,
      connectorId,
      operationId,
      connectionId,
      config,
      fieldMapping,
    });
    onClose();
  };

  const filteredManifests = ALL_50_CONNECTOR_MANIFESTS.filter((m) => {
    const matchesCategory = selectedCategory === 'All' ||
      m.category?.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Jobs & Recruitment' && ['Jobs & Recruitment', 'HR & ATS', 'Recruitment'].includes(m.category));
    const matchesSearch = m.name.toLowerCase().includes(appSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(appSearch.toLowerCase()) ||
      m.id.toLowerCase().includes(appSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAutoMapFields = () => {
    if (dataSources.length === 0) {
      toast.error('No Upstream Steps Available', {
        description: 'Add or connect a trigger or previous step before auto-mapping.',
      });
      return;
    }

    const allAvailableFields: Array<{ path: string; key: string; label: string }> = [];
    dataSources.forEach((src) => {
      src.fields.forEach((f) => {
        allAvailableFields.push({ path: f.path, key: f.key.toLowerCase(), label: f.label.toLowerCase() });
      });
    });

    const updatedConfig = { ...config };
    let count = 0;

    inputFieldKeys.forEach((input) => {
      const keyLower = input.key.toLowerCase();
      const labelLower = input.label.toLowerCase();

      const match = allAvailableFields.find((f) => {
        if (f.key === keyLower) return true;
        if (keyLower.includes('email') || keyLower.includes('recipient') || keyLower.includes('to')) {
          return f.key.includes('email') || f.key.includes('recipient') || f.key.includes('sender') || f.key.includes('to');
        }
        if (keyLower.includes('phone') || keyLower.includes('mobile')) {
          return f.key.includes('phone') || f.key.includes('mobile');
        }
        if (keyLower.includes('amount') || keyLower.includes('price')) {
          return f.key.includes('amount') || f.key.includes('price') || f.key.includes('cents');
        }
        if (keyLower.includes('body') || keyLower.includes('text') || keyLower.includes('message') || keyLower.includes('content')) {
          return f.key.includes('body') || f.key.includes('text') || f.key.includes('summary') || f.key.includes('message') || f.key.includes('content');
        }
        if (keyLower.includes('subject') || keyLower.includes('title')) {
          return f.key.includes('subject') || f.key.includes('title') || f.key.includes('name');
        }
        return f.label.includes(labelLower);
      });

      if (match) {
        updatedConfig[input.key] = `{{${match.path}}}`;
        count++;
      }
    });

    setConfig(updatedConfig);
    setFieldMapping(updatedConfig);
    toast.success(`🤖 Auto-Mapped ${count} Fields!`, {
      description: `Populated template variables using AI Data Bridge synonym matching.`,
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[560px] bg-[#0d1117] border-l border-white/10 shadow-2xl flex flex-col z-50 text-xs">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-white/8 bg-[#111827] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-inner">
            <Layers size={18} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">{name}</h3>
            <p className="text-[10px] font-mono text-gray-400 flex items-center gap-1.5 mt-0.5">
              <span className="text-indigo-400 font-semibold">{currentManifest?.name || connectorId}</span>
              <span>·</span>
              <span>{currentActionSchema?.name || operationId}</span>
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
          <X size={16} />
        </button>
      </div>

      {/* 4 Setup Tabs */}
      <div className="flex border-b border-white/8 bg-[#0b0f19] px-5 gap-2">
        {[
          { id: 'app', label: '1. App & Event', icon: Layers, locked: false },
          { id: 'account', label: '2. Account', icon: Key, locked: false },
          { id: 'setup', label: '3. Set Up Step', icon: Sliders, locked: requiresAccount && !isAccountConnected },
          { id: 'test', label: '4. Test Step', icon: Play, locked: requiresAccount && !isAccountConnected },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLocked = tab.locked;
          return (
            <button
              key={tab.id}
              disabled={isLocked}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 flex-1 flex items-center justify-center gap-1.5 border-b-2 font-semibold transition-all ${isActive
                  ? 'border-indigo-500 text-indigo-400 bg-white/[0.02]'
                  : isLocked
                    ? 'border-transparent text-gray-600 cursor-not-allowed opacity-50'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
            >
              {isLocked ? <Lock size={12} className="text-gray-600" /> : <Icon size={13} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Drawer Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* TAB 1: App & Event */}
        {activeTab === 'app' && (
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Step Display Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111827] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500/60 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Search & Select Integration App</label>
              
              {/* Category Pills Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Filter 55+ apps (e.g. Gmail, Slack, Sheets, Stripe)..."
                  className="w-full bg-[#111827] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1 border border-white/8 rounded-xl bg-black/20">
                {filteredManifests.map((m) => {
                  const isSelected = m.id === connectorId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectApp(m.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-500/15 border-indigo-500 text-white font-bold'
                          : 'bg-white/3 border-white/5 text-gray-300 hover:bg-white/6'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                      <div className="truncate">
                        <div className="truncate text-xs">{m.name}</div>
                        <div className="text-[9px] text-gray-500 truncate">{m.category}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1.5">Select Action or Trigger Event</label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {/* Triggers Group */}
                {(currentManifest?.triggers || []).map((t) => {
                  const isSelected = operationId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectAction(t.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-purple-500/15 border-purple-500 text-white ring-1 ring-purple-500/50'
                          : 'bg-white/3 border-white/6 text-gray-300 hover:bg-white/6'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-purple-300">
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold">⚡ TRIGGER</span>
                          {t.name}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                          V2 Schema Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{t.description}</p>
                    </button>
                  );
                })}

                {/* Actions Group */}
                {(currentManifest?.actions || []).map((a) => {
                  const isSelected = operationId === a.id;
                  const schema = getActionOrTriggerSchema(connectorId, a.id);
                  const fieldCount = Object.keys(schema?.inputSchema?.properties || {}).length;

                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelectAction(a.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-indigo-500/15 border-indigo-500 text-white ring-1 ring-indigo-500/50'
                          : 'bg-white/3 border-white/6 text-gray-300 hover:bg-white/6'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-300">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono font-bold">⚙️ ACTION</span>
                          {a.name}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {fieldCount > 0 ? `${fieldCount} Input Fields` : 'Dynamic V2'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{a.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-indigo-300">
              <span className="text-[11px]">Next: Connect your account in Tab 2</span>
              <button
                onClick={() => setActiveTab('account')}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all"
              >
                <span>Continue to Account</span> <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: Account Connection */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <ConnectionSelector
              connectorId={connectorId}
              selectedConnectionId={connectionId}
              connections={userConnections}
              onSelectConnection={(id) => {
                setConnectionId(id);
                if (id) setActiveTab('setup');
              }}
              onAddNewAccount={() => setShowConnectModal(true)}
            />

            {/* Provider Developer Portal Guide */}
            {PROVIDER_DOC_LINKS[connectorId] && (
              <div className="p-3 bg-[#111827] border border-white/10 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px]">
                  <span>🔐 {currentManifest?.name || connectorId} Setup Guide</span>
                  <span className="text-[10px] text-gray-400 font-mono">{PROVIDER_DOC_LINKS[connectorId].authType}</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  Need OAuth keys or API credentials? Access the official developer settings console below:
                </p>
                <a
                  href={PROVIDER_DOC_LINKS[connectorId].url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-semibold text-[11px]"
                >
                  Open {PROVIDER_DOC_LINKS[connectorId].title} ↗
                </a>
              </div>
            )}

            {isAccountConnected && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-300">
                <span className="text-[11px] font-medium flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-400" /> Account Verified! Continue to input setup.
                </span>
                <button
                  onClick={() => setActiveTab('setup')}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all shadow-md"
                >
                  <span>Set Up Inputs</span> <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Set Up Step (Dynamic Schema Inputs & Pill Picker) */}
        {activeTab === 'setup' && (
          <div className="space-y-4">
            {/* Account Gatekeeper Banner */}
            {requiresAccount && !isAccountConnected ? (
              <div className="p-6 text-center space-y-3 bg-[#111827] border border-amber-500/30 rounded-2xl my-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Lock size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Account Connection Required First</h4>
                <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
                  Please select or connect your <strong>{currentManifest?.name || connectorId}</strong> account in <strong>Tab 2 (Account)</strong> before configuring step parameters and input mappings.
                </p>
                <button
                  onClick={() => setActiveTab('account')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg transition-all"
                >
                  <Key size={14} />
                  <span>Go to Tab 2: Connect Account</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-white/6 pb-2">
                  <span className="font-bold text-white text-xs uppercase tracking-wider">
                    {currentManifest?.name || connectorId} Inputs ({inputFieldKeys.length})
                  </span>
                  <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-semibold">
                    <Sparkles size={11} className="text-amber-300 animate-pulse" /> AI Data Bridge Active
                  </span>
                </div>

                {/* ✨ AI Data Bridge Smart Mapping Banner & Auto-Map Action */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-black/40 border border-indigo-500/30 rounded-xl flex flex-col gap-3 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0 mt-0.5">
                      <Sparkles size={16} className="text-amber-300" />
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span>Automatic AI Data Bridge Enabled</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                          ZERO-CODE MAPPING
                        </span>
                      </span>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        You can manually enter template paths (e.g. <code className="text-indigo-300 font-mono">{'{{nodes.step1.output.email}}'}</code>) or click below to let AI Data Bridge auto-populate input fields.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAutoMapFields}
                    className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-all border border-indigo-400/30"
                  >
                    <Sparkles size={14} className="text-amber-300 animate-pulse" />
                    <span>🤖 Auto-Map Fields with AI Data Bridge</span>
                  </button>
                </div>

                {/* Dynamically Rendered Input Fields */}
                {inputFieldKeys.length === 0 ? (
                  <div className="p-4 bg-[#111827] border border-white/6 rounded-xl text-center text-gray-400 text-xs">
                    No additional input parameters required for <strong className="text-white">{currentManifest?.name || connectorId}</strong> ({currentActionSchema?.name || operationId}).
                  </div>
                ) : (
                  inputFieldKeys.map((field) => {
                    const fieldName = field.key;
                    const propMeta = schemaProperties[fieldName] || { title: field.label, type: field.type };
                    const uiMeta = uiProperties[fieldName] || {};
                    const value = config[fieldName] !== undefined ? config[fieldName] : (uiMeta.defaultTestValue || '');

                    return (
                      <div
                        key={fieldName}
                        className={`space-y-1.5 bg-[#111827] p-3.5 rounded-xl border transition-all ${activeInputKey === fieldName
                            ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-950/20'
                            : 'border-white/6 hover:border-white/10'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setActiveInputKey(activeInputKey === fieldName ? null : fieldName)}
                            className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-all ${activeInputKey === fieldName
                                ? 'bg-indigo-500 text-white font-medium'
                                : 'bg-white/5 hover:bg-white/10 text-indigo-300'
                              }`}
                          >
                            <Database size={10} />
                            {activeInputKey === fieldName ? 'Close Data Picker' : 'Insert Step Data'}
                          </button>
                        </div>

                        <DynamicFieldWidget
                          propKey={fieldName}
                          propMeta={propMeta}
                          uiMeta={uiMeta}
                          isRequired={field.required}
                          value={value}
                          onChange={(val) => handleFieldChange(fieldName, val)}
                          connectorId={connectorId}
                          actionId={operationId}
                        />

                        {/* Inline Data Tree Picker */}
                        {activeInputKey === fieldName && (
                          <div className="mt-2">
                            <DataTreePicker
                              sources={dataSources}
                              onSelectVariable={handleInsertVariable}
                              onClose={() => setActiveInputKey(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-indigo-300">
                  <span className="text-[11px]">Next: Test your step execution in Tab 4</span>
                  <button
                    onClick={() => setActiveTab('test')}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-all"
                  >
                    <span>Continue to Test Step</span> <ArrowRight size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: Test Step */}
        {activeTab === 'test' && (
          <div className="space-y-4">
            {requiresAccount && !isAccountConnected ? (
              <div className="p-6 text-center space-y-3 bg-[#111827] border border-amber-500/30 rounded-2xl my-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                  <Lock size={22} />
                </div>
                <h4 className="text-sm font-bold text-white">Account Connection Required First</h4>
                <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
                  Please select or connect your <strong>{currentManifest?.name || connectorId}</strong> account in <strong>Tab 2 (Account)</strong> before testing step execution.
                </p>
                <button
                  onClick={() => setActiveTab('account')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-lg transition-all"
                >
                  <Key size={14} />
                  <span>Go to Tab 2: Connect Account</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 bg-[#111827] border border-white/8 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-xs">Test Execution Preview</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">Bypasses schedule timers</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Execute a live test run for <strong className="text-white">{name}</strong> using resolved input mappings.
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPayloadPreview(!showPayloadPreview)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 font-semibold mb-2"
                    >
                      <span>{showPayloadPreview ? '▼ Hide Resolved Request Payload JSON' : '▶ View Resolved Request Payload JSON'}</span>
                    </button>
                    {showPayloadPreview && (
                      <pre className="p-3 bg-black/50 border border-white/10 rounded-xl text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-40 mb-3">
                        {JSON.stringify({ connectorId, operationId, connectionId, config, fieldMapping }, null, 2)}
                      </pre>
                    )}
                  </div>

                  <button
                    onClick={handleRunTest}
                    disabled={isTesting}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg"
                  >
                    {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    {isTesting ? 'Running Test Step...' : 'Test This Step Now'}
                  </button>
                </div>

                {testError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{testError}</span>
                  </div>
                )}

                {testResult && (
                  <div className="space-y-2">
                    <DynamicResponseVisualizer
                      data={testResult}
                      actionId={operationId}
                      connectorId={connectorId}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-white/8 bg-[#111827] flex items-center justify-between">
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all font-medium">
          Cancel
        </button>
        <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg transition-all">
          Save Step Configurations
        </button>
      </div>
      {/* Inline Account Connection Modal */}
      {showConnectModal && (
        ['postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'mssql', 'sqlite', 'supabase', 'planetscale', 'neon'].includes(connectorId) || currentManifest?.category === 'Databases' ? (
          <DatabaseConnectModal
            isOpen={showConnectModal}
            defaultEngine={connectorId}
            onClose={() => setShowConnectModal(false)}
            onSuccess={() => {
              apiClient.get('/v1/connectors/connections').then((res) => {
                if (res.data.data) {
                  setUserConnections(res.data.data);
                  const matching = res.data.data.find((c: any) => c.connectorId === connectorId || connectorId.includes(c.connectorId));
                  if (matching) setConnectionId(matching._id || matching.id);
                }
              });
              setShowConnectModal(false);
              setActiveTab('setup');
            }}
          />
        ) : (
          <AccountConnectModal
            connectorId={connectorId}
            onSuccess={(newId) => {
              setConnectionId(newId);
              apiClient.get('/v1/connectors/connections').then((res) => {
                if (res.data.data) setUserConnections(res.data.data);
              });
              setActiveTab('setup');
            }}
            onClose={() => setShowConnectModal(false)}
          />
        )
      )}
    </div>
  );
}

