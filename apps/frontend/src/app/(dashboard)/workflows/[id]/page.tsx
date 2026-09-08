'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkflowCanvas } from '@/components/builder/WorkflowCanvas';
import { FieldMapper } from '@/components/builder/FieldMapper';
import { AICopilotDrawer } from '@/components/builder/AICopilotDrawer';
import { StepSetupDrawer } from '@/components/workflow/StepSetupDrawer';
import { useUserRole } from '@/context/UserRoleContext';
import { Play, Save, ArrowLeft, RefreshCw, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Node, Edge } from 'reactflow';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function WorkflowBuilderPage({ params }: { params: { id: string } }) {
  const { user } = useUserRole();
  const router = useRouter();

  const [workflowName, setWorkflowName] = useState<string>('');
  const [workflowDesc, setWorkflowDesc] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [updatedNodeData, setUpdatedNodeData] = useState<{ nodeId: string; data: Partial<any> } | null>(null);
  const [canvasNodes, setCanvasNodes] = useState<Node[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<Edge[]>([]);
  const [initialNodes, setInitialNodes] = useState<any[] | null>(null);
  const [initialEdges, setInitialEdges] = useState<any[] | null>(null);
  const [userConnections, setUserConnections] = useState<any[]>([]);

  const [loadingWorkflow, setLoadingWorkflow] = useState<boolean>(params?.id !== 'new');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);

  // Load User Connections for StepSetupDrawer
  useEffect(() => {
    async function loadConnections() {
      try {
        const res = await apiClient.get('/v1/connectors/connections');
        if (res.data?.data) {
          setUserConnections(res.data.data);
        }
      } catch (e) {}
    }
    loadConnections();
  }, []);

  // Auto-Save Draft state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleApplyCopilotUpdate = useCallback((newNodes: any[], newEdges: any[]) => {
    setInitialNodes(newNodes);
    setInitialEdges(newEdges);
    setCanvasNodes(newNodes);
    setCanvasEdges(newEdges);
  }, []);

  // Debounced Auto-Save Draft engine to MongoDB Atlas & LocalStorage
  useEffect(() => {
    if (loadingWorkflow || canvasNodes.length === 0) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setAutoSaveStatus('saving');

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const currentNodes = canvasNodes.map((n) => ({
          id: n.id,
          name: n.data?.name || n.data?.label || n.id,
          connectorId: n.data?.connectorId || 'autoflow-schedule',
          operationId: n.data?.operationId || 'execute',
          type: n.data?.type || 'action',
          config: n.data?.config || {},
          fieldMapping: n.data?.fieldMapping || {},
          position: n.position,
        }));

        const currentEdges = canvasEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        }));

        const payload = {
          name: workflowName || `Workflow #${params.id}`,
          description: workflowDesc || 'Automated workflow.',
          status: 'draft',
          definition: {
            nodes: currentNodes,
            edges: currentEdges,
          },
        };

        // Backup to localStorage
        localStorage.setItem('autoflow_current_draft', JSON.stringify(payload));

        // Save draft to MongoDB Atlas
        if (params.id !== 'new' && params.id.length === 24) {
          await apiClient.put(`/v1/workflows/${params.id}`, payload);
        }

        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSavedTime(nowStr);
        setAutoSaveStatus('saved');
      } catch (err) {
        console.warn('Auto-save draft error:', err);
        setAutoSaveStatus('idle');
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [canvasNodes, canvasEdges, workflowName, workflowDesc, loadingWorkflow, params.id]);

  // Load Workflow from Backend API (if editing an existing workflow) or LocalStorage (if new AI draft)
  useEffect(() => {
    async function loadWorkflow() {
      if (params.id !== 'new') {
        try {
          setLoadingWorkflow(true);
          const res = await apiClient.get(`/v1/workflows/${params.id}`);
          const wf = res.data.data;
          setWorkflowName(wf.name || `Workflow #${params.id}`);
          setWorkflowDesc(wf.description || '');

          if (wf.definition?.nodes && wf.definition.nodes.length > 0) {
            setInitialNodes(wf.definition.nodes);
            setInitialEdges(wf.definition.edges || []);
          }
        } catch (err: any) {
          console.error('Failed to load workflow by ID:', err);
          toast.error('Could not load workflow', {
            description: err?.response?.data?.message || 'Failed to fetch workflow definition from MongoDB.',
          });
        } finally {
          setLoadingWorkflow(false);
        }
      } else {
        // New Workflow — check if AI generator draft exists in localStorage
        try {
          const savedDraftStr = localStorage.getItem('autoflow_draft_workflow');
          if (savedDraftStr) {
            const draft = JSON.parse(savedDraftStr);
            setWorkflowName(draft.name || `Workflow_${Date.now().toString().slice(-4)}`);
            setWorkflowDesc(draft.description || 'AI-generated workflow template.');
            if (draft.nodes && draft.nodes.length > 0) {
              setInitialNodes(draft.nodes);
              setInitialEdges(draft.edges || []);
            }
            localStorage.removeItem('autoflow_draft_workflow');
          } else {
            setWorkflowName(`Workflow_${Date.now().toString().slice(-4)}`);
            setWorkflowDesc('Automated workflow configured via AutoFlow visual builder.');
          }
        } catch (e) {
          console.error('Draft parse error:', e);
        }
        setLoadingWorkflow(false);
      }
    }
    loadWorkflow();
  }, [params.id]);

  const handleCanvasChange = useCallback((nodes: Node[], edges: Edge[]) => {
    setCanvasNodes(nodes);
    setCanvasEdges(edges);
  }, []);

  const handleUpdateNodeData = (nodeId: string, dataUpdate: Partial<any>) => {
    setUpdatedNodeData({ nodeId, data: dataUpdate });

    // Instantly update selectedNode if it matches
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) =>
        prev
          ? {
              ...prev,
              data: {
                ...prev.data,
                ...dataUpdate,
              },
            }
          : null
      );
    }
  };

  const handleTestRun = async () => {
    setIsExecuting(true);
    try {
      // Format current canvas nodes for execution
      const currentNodes = canvasNodes.map((n) => ({
        id: n.id,
        name: n.data?.name || n.data?.label || n.id,
        connectorId: n.data?.connectorId || 'autoflow-schedule',
        operationId: n.data?.operationId || 'execute',
        type: n.data?.type || 'action',
        config: n.data?.config || {},
        fieldMapping: n.data?.fieldMapping || {},
      }));

      const currentEdges = canvasEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      let targetId = params?.id;
      if (targetId === 'new') {
        const createRes = await apiClient.post('/v1/workflows', {
          name: workflowName || 'New Workflow',
          description: workflowDesc || 'Automated workflow.',
          status: 'draft',
          definition: { nodes: currentNodes, edges: currentEdges },
        });
        const savedWf = createRes.data.data;
        if (savedWf && (savedWf._id || savedWf.id)) {
          targetId = savedWf._id || savedWf.id;
          router.replace(`/workflows/${targetId}`);
        }
      }

      const res = await apiClient.post(`/v1/workflows/${targetId}/execute`, {
        triggerPayload: { manualTrigger: true, isTestRun: true, triggeredAt: new Date().toISOString() },
        definition: { nodes: currentNodes, edges: currentEdges },
        nodes: currentNodes,
        edges: currentEdges,
      });

      toast.success('Live Execution Completed!', {
        description: `Ran ${currentNodes.length} DAG steps for ${user?.email || 'user'}. Timers bypassed! Check Execution Logs.`,
      });
    } catch (err: any) {
      toast.error('Execution Failed', {
        description: err?.response?.data?.message || err?.message || 'Could not execute workflow.',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSave = async (targetStatus: 'active' | 'draft' = 'active') => {
    setIsSaving(true);
    try {
      const currentNodes = canvasNodes.map((n) => ({
        id: n.id,
        name: n.data?.name || n.data?.label || n.id,
        connectorId: n.data?.connectorId || 'autoflow-schedule',
        operationId: n.data?.operationId || 'execute',
        type: n.data?.type || 'action',
        config: n.data?.config || {},
        fieldMapping: n.data?.fieldMapping || {},
        position: n.position,
      }));

      const currentEdges = canvasEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      const payload = {
        name: workflowName || `Workflow #${params.id}`,
        description: workflowDesc || 'Automated workflow.',
        status: targetStatus,
        definition: {
          nodes: currentNodes,
          edges: currentEdges,
        },
      };

      let savedWf: any = null;
      if (params.id === 'new') {
        const res = await apiClient.post('/v1/workflows', payload);
        savedWf = res.data.data;
      } else {
        const res = await apiClient.put(`/v1/workflows/${params.id}`, payload);
        savedWf = res.data.data;
      }

      localStorage.removeItem('autoflow_draft_workflow');
      toast.success(`Workflow Saved as ${targetStatus.toUpperCase()} in MongoDB`, {
        description: `Workflow "${savedWf?.name || workflowName}" saved successfully in MongoDB Atlas.`,
      });

      if (params.id === 'new' && savedWf && (savedWf._id || savedWf.id)) {
        setTimeout(() => {
          router.push(`/workflows/${savedWf._id || savedWf.id}`);
        }, 600);
      }
    } catch (e: any) {
      console.error('Save workflow error:', e);
      toast.error('Save Workflow Failed', {
        description: e?.response?.data?.message || 'Could not save workflow definition to MongoDB.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingWorkflow) {
    return (
      <div className="flex-1 h-[calc(100vh-112px)] flex items-center justify-center gap-3 bg-bgCanvas text-textMuted text-xs">
        <Loader2 size={20} className="animate-spin text-accentPurple" />
        <span>Loading workflow definition from MongoDB Atlas...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] -m-6">
      {/* Builder Header */}
      <div className="h-14 border-b border-borderColor bg-bgSecondary flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <Link href="/workflows" className="text-textSecondary hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow Name..."
              className="bg-transparent font-semibold text-sm text-white outline-none focus:border-b border-accentPurple"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-textMuted font-mono">
                ID: {params.id} · MongoDB Atlas
              </span>
              {autoSaveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-medium">
                  <Loader2 size={10} className="animate-spin" />
                  <span>Saving Draft...</span>
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                  <CheckCircle2 size={10} />
                  <span>Draft Auto-Saved ({lastSavedTime})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCopilotOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isCopilotOpen
                ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-glow'
                : 'bg-white/5 border-borderColor text-white hover:bg-white/10'
            }`}
          >
            <Sparkles size={14} className="text-accentPurple" />
            <span>AI Assistant Co-Pilot</span>
          </button>

          <button
            onClick={handleTestRun}
            disabled={isExecuting}
            className="glass-card px-3 py-1.5 text-xs flex items-center gap-1.5 hover:bg-white/5 disabled:opacity-50"
          >
            {isExecuting ? (
              <RefreshCw size={13} className="text-accentEmerald animate-spin" />
            ) : (
              <Play size={13} className="text-accentEmerald" />
            )}
            <span>{isExecuting ? 'Executing Steps...' : 'Test Run (Trigger Now)'}</span>
          </button>

          <button
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-borderColor text-white text-xs font-semibold hover:bg-white/10 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save size={13} className="text-amber-400" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={() => handleSave('active')}
            disabled={isSaving}
            className="glow-button px-4 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>Save & Activate</span>
          </button>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div className="flex-1 flex overflow-hidden">
        <WorkflowCanvas
          workflowId={params.id}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onSelectNode={(node) => setSelectedNode(node)}
          onCanvasChange={handleCanvasChange}
          updatedNodeData={updatedNodeData}
        />
        {selectedNode && (
          <StepSetupDrawer
            key={selectedNode.id}
            node={{
              id: selectedNode.id,
              name: selectedNode.data?.name || selectedNode.data?.label || selectedNode.id,
              connectorId: selectedNode.data?.connectorId || 'gmail',
              operationId: selectedNode.data?.operationId || 'execute',
              type: selectedNode.data?.type || 'action',
              config: selectedNode.data?.config || {},
              fieldMapping: selectedNode.data?.fieldMapping || {},
              connectionId: selectedNode.data?.connectionId || '',
            }}
            allNodes={canvasNodes.map((n) => ({
              id: n.id,
              name: n.data?.name || n.data?.label || n.id,
              connectorId: n.data?.connectorId || 'gmail',
            }))}
            edges={canvasEdges}
            connections={userConnections}
            onSaveNode={(updated) => {
              handleUpdateNodeData(updated.id, {
                name: updated.name,
                connectorId: updated.connectorId,
                operationId: updated.operationId,
                config: updated.config,
                fieldMapping: updated.fieldMapping,
                connectionId: updated.connectionId,
                isConnected: Boolean(updated.connectionId),
              });
            }}
            onClose={() => setSelectedNode(null)}
            onAddNewAccount={() => {
              router.push('/connectors');
            }}
          />
        )}

        <AICopilotDrawer
          isOpen={isCopilotOpen}
          onClose={() => setIsCopilotOpen(false)}
          canvasNodes={canvasNodes}
          canvasEdges={canvasEdges}
          onApplyCanvasUpdate={handleApplyCopilotUpdate}
        />
      </div>
    </div>
  );
}
