'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowCanvas } from '@/components/builder/WorkflowCanvas';
import { FieldMapper } from '@/components/builder/FieldMapper';
import { useUserRole } from '@/context/UserRoleContext';
import { Play, Save, ArrowLeft, RefreshCw, Loader2, Sparkles } from 'lucide-react';
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

  const [loadingWorkflow, setLoadingWorkflow] = useState<boolean>(params.id !== 'new');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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

      const res = await apiClient.post(`/v1/workflows/${params.id}/execute`, {
        triggerPayload: { manualTrigger: true, isTestRun: true, triggeredAt: new Date().toISOString() },
        definition: { nodes: currentNodes, edges: currentEdges },
        nodes: currentNodes,
        edges: currentEdges,
      });

      const data = res.data.data;
      toast.success('Live Execution Completed!', {
        description: `Ran ${currentNodes.length} DAG steps for ${user.email}. Timers bypassed! Check Execution Logs.`,
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
            <span className="text-[10px] text-textMuted font-mono">
              ID: {params.id} · MongoDB Atlas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? 'Saving...' : 'Save & Activate'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <WorkflowCanvas
          workflowId={params.id}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onSelectNode={(node) => setSelectedNode(node)}
          onCanvasChange={handleCanvasChange}
          updatedNodeData={updatedNodeData}
        />
        <FieldMapper
          selectedNode={selectedNode}
          onUpdateNodeData={handleUpdateNodeData}
        />
      </div>
    </div>
  );
}
