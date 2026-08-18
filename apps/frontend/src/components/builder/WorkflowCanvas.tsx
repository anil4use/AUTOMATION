'use client';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNodes';
import { CustomEdge } from './CustomEdge';
import { AppPickerModal, AppOption } from './AppPickerModal';
import { toast } from 'sonner';

const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

const templateMap: Record<string, { nodes: Node[]; edges: Edge[] }> = {
  wf_101: {
    nodes: [
      { id: 'n_1', type: 'custom', position: { x: 250, y: 80 }, data: { label: 'AutoFlow Schedule Trigger', connectorId: 'autoflow-schedule', operationId: 'schedule_time', type: 'trigger' } },
      { id: 'n_2', type: 'custom', position: { x: 250, y: 260 }, data: { label: 'Gmail Read Attachments', connectorId: 'gmail', operationId: 'new_email', type: 'action' } },
      { id: 'n_3', type: 'custom', position: { x: 250, y: 440 }, data: { label: 'Google Drive Save File', connectorId: 'google-drive', operationId: 'upload_file', type: 'action' } },
      { id: 'n_4', type: 'custom', position: { x: 250, y: 620 }, data: { label: 'Google Sheets Log Row', connectorId: 'google-sheets', operationId: 'append_row', type: 'action' } },
      { id: 'n_5', type: 'custom', position: { x: 250, y: 800 }, data: { label: 'Slack Notify Channel', connectorId: 'slack', operationId: 'send_message', type: 'action' } },
    ],
    edges: [
      { id: 'e_1_2', source: 'n_1', target: 'n_2', type: 'custom' },
      { id: 'e_2_3', source: 'n_2', target: 'n_3', type: 'custom' },
      { id: 'e_3_4', source: 'n_3', target: 'n_4', type: 'custom' },
      { id: 'e_4_5', source: 'n_4', target: 'n_5', type: 'custom' },
    ],
  },
  wf_102: {
    nodes: [
      { id: 'n_1', type: 'custom', position: { x: 250, y: 80 }, data: { label: 'Stripe Payment Succeeded', connectorId: 'stripe', operationId: 'payment_succeeded', type: 'trigger' } },
      { id: 'n_2', type: 'custom', position: { x: 250, y: 260 }, data: { label: 'Notion Create Page Record', connectorId: 'notion', operationId: 'create_page', type: 'action' } },
      { id: 'n_3', type: 'custom', position: { x: 250, y: 440 }, data: { label: 'WhatsApp Send Receipt', connectorId: 'whatsapp', operationId: 'send_message', type: 'action' } },
    ],
    edges: [
      { id: 'e_1_2', source: 'n_1', target: 'n_2', type: 'custom' },
      { id: 'e_2_3', source: 'n_2', target: 'n_3', type: 'custom' },
    ],
  },
  wf_103: {
    nodes: [
      { id: 'n_1', type: 'custom', position: { x: 250, y: 80 }, data: { label: 'WhatsApp Inbound Message', connectorId: 'whatsapp', operationId: 'new_message', type: 'trigger' } },
      { id: 'n_2', type: 'custom', position: { x: 250, y: 260 }, data: { label: 'AI Summarize Lead Intent', connectorId: 'ai-agent', operationId: 'summarize_text', type: 'ai-agent' } },
      { id: 'n_3', type: 'custom', position: { x: 250, y: 440 }, data: { label: 'Google Sheets Append Row', connectorId: 'google-sheets', operationId: 'append_row', type: 'action' } },
    ],
    edges: [
      { id: 'e_1_2', source: 'n_1', target: 'n_2', type: 'custom' },
      { id: 'e_2_3', source: 'n_2', target: 'n_3', type: 'custom' },
    ],
  },
};

export function WorkflowCanvas({
  workflowId = 'new',
  onSelectNode,
}: {
  workflowId?: string;
  onSelectNode?: (node: Node) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [insertContext, setInsertContext] = useState<{ type: 'append' | 'insert'; sourceNodeId?: string; targetEdgeId?: string } | null>(null);

  const handleOpenAppendModal = useCallback((nodeId: string) => {
    setInsertContext({ type: 'append', sourceNodeId: nodeId });
  }, []);

  const handleOpenInsertModal = useCallback((edgeId: string) => {
    setInsertContext({ type: 'insert', targetEdgeId: edgeId });
  }, []);

  const handleRenameNode = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
    );
    toast.success('Step Renamed', { description: `Updated label to "${newLabel}".` });
  }, [setNodes]);

  const handleEditNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const nodeToEdit = nds.find((n) => n.id === nodeId);
      if (nodeToEdit && onSelectNode) onSelectNode(nodeToEdit);
      return nds;
    });
    toast.info('Step Selected for Configuration');
  }, [onSelectNode, setNodes]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const sourceNode = currentNodes.find((n) => n.id === nodeId);
      if (!sourceNode) return currentNodes;

      const dupNodeId = `node_${Date.now()}`;
      const dupNode: Node = {
        ...sourceNode,
        id: dupNodeId,
        position: { x: 250, y: sourceNode.position.y + 180 },
        data: {
          ...sourceNode.data,
          label: `${sourceNode.data.label} (Copy)`,
        },
      };

      const shifted = currentNodes.map((n) =>
        n.position.y > sourceNode.position.y ? { ...n, position: { ...n.position, y: n.position.y + 180 } } : n
      );

      return [...shifted, dupNode];
    });
    toast.success('Step Duplicated');
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const targetNode = currentNodes.find((n) => n.id === nodeId);
      if (!targetNode || targetNode.data.type === 'trigger' || targetNode.data.connectorId === 'autoflow-schedule') {
        toast.warning('Protected Step', { description: 'The AutoFlow Schedule Trigger cannot be deleted.' });
        return currentNodes;
      }

      setEdges((currentEdges) => {
        const incomingEdge = currentEdges.find((e) => e.target === nodeId);
        const outgoingEdge = currentEdges.find((e) => e.source === nodeId);

        let newEdges = currentEdges.filter((e) => e.source !== nodeId && e.target !== nodeId);

        if (incomingEdge && outgoingEdge) {
          const bridgedEdge: Edge = {
            id: `e_${incomingEdge.source}_${outgoingEdge.target}`,
            source: incomingEdge.source,
            target: outgoingEdge.target,
            type: 'custom',
            data: { onInsertStep: handleOpenInsertModal },
          };
          newEdges.push(bridgedEdge);
        }
        return newEdges;
      });

      const remainingNodes = currentNodes
        .filter((n) => n.id !== nodeId)
        .map((n) => (n.position.y > targetNode.position.y ? { ...n, position: { ...n.position, y: n.position.y - 180 } } : n));

      return remainingNodes;
    });
    toast.error('Step Deleted from Workflow Flow');
  }, [handleOpenInsertModal, setEdges, setNodes]);

  // Master Synchronizer ensuring step numbers, callbacks, and isLastInChain line stems are ALWAYS preserved
  const syncNodesState = useCallback(
    (currentNodes: Node[], currentEdges: Edge[]) => {
      const sourceNodeIds = new Set(currentEdges.map((e) => e.source));
      const sorted = [...currentNodes].sort((a, b) => a.position.y - b.position.y);

      return sorted.map((n, idx) => ({
        ...n,
        data: {
          ...n.data,
          stepNumber: idx + 1,
          isLastInChain: !sourceNodeIds.has(n.id),
          onAddNext: handleOpenAppendModal,
          onRenameNode: handleRenameNode,
          onEditNode: handleEditNode,
          onDuplicateNode: handleDuplicateNode,
          onDeleteNode: handleDeleteNode,
        },
      }));
    },
    [handleOpenAppendModal, handleRenameNode, handleEditNode, handleDuplicateNode, handleDeleteNode]
  );

  // Synchronize on every nodes or edges change
  useEffect(() => {
    setNodes((currentNodes) => {
      const updated = syncNodesState(currentNodes, edges);
      const isDifferent = JSON.stringify(updated.map((n) => n.data.isLastInChain)) !== JSON.stringify(currentNodes.map((n) => n.data.isLastInChain));
      return isDifferent ? updated : currentNodes;
    });
  }, [edges, syncNodesState, setNodes]);

  // Hydrate DAG on workflowId mount
  useEffect(() => {
    const template = templateMap[workflowId];
    if (template) {
      const hydratedEdges = template.edges.map((e) => ({ ...e, data: { ...e.data, onInsertStep: handleOpenInsertModal } }));
      const hydratedNodes = syncNodesState(template.nodes, hydratedEdges);
      setNodes(hydratedNodes);
      setEdges(hydratedEdges);
    } else {
      const defaultNode: Node = {
        id: 'node_trigger',
        type: 'custom',
        position: { x: 250, y: 80 },
        data: {
          label: 'AutoFlow Schedule Trigger',
          name: 'AutoFlow Schedule Trigger',
          connectorId: 'autoflow-schedule',
          operationId: 'schedule_time',
          type: 'trigger',
        },
      };
      setNodes(syncNodesState([defaultNode], []));
      setEdges([]);
    }
  }, [workflowId, syncNodesState, handleOpenInsertModal, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        const filtered = eds.filter((e) => e.source !== params.source);
        return addEdge({ ...params, type: 'custom', data: { onInsertStep: handleOpenInsertModal } }, filtered);
      });
      toast.info('Connected Step', { description: '1-way sequential DAG maintained.' });
    },
    [handleOpenInsertModal, setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onSelectNode) onSelectNode(node);
    },
    [onSelectNode]
  );

  const handleSelectApp = (app: AppOption) => {
    if (!insertContext) return;

    if (insertContext.type === 'append' && insertContext.sourceNodeId) {
      const sourceId = insertContext.sourceNodeId;
      const parentNode = nodes.find((n) => n.id === sourceId);
      const parentY = parentNode ? parentNode.position.y : 80;

      const newNodeId = `node_${Date.now()}`;
      const rawNewNode: Node = {
        id: newNodeId,
        type: 'custom',
        position: { x: 250, y: parentY + 180 },
        data: {
          label: `${app.name} Step`,
          name: `${app.name} Step`,
          connectorId: app.id,
          operationId: app.operation,
          type: app.type,
        },
      };

      const newEdge: Edge = {
        id: `e_${sourceId}_${newNodeId}`,
        source: sourceId,
        target: newNodeId,
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      };

      const filteredEdges = edges.filter((e) => e.source !== sourceId);
      const combinedEdges = [...filteredEdges, newEdge];
      const combinedNodes = syncNodesState([...nodes, rawNewNode], combinedEdges);

      setNodes(combinedNodes);
      setEdges(combinedEdges);
      toast.success(`Appended ${app.name}`, { description: 'Added next step vertically with line stem.' });
    } else if (insertContext.type === 'insert' && insertContext.targetEdgeId) {
      const targetEdge = edges.find((e) => e.id === insertContext.targetEdgeId);
      if (!targetEdge) return;

      const sourceNode = nodes.find((n) => n.id === targetEdge.source);
      const targetNode = nodes.find((n) => n.id === targetEdge.target);
      const sourceY = sourceNode ? sourceNode.position.y : 80;

      const newNodeId = `node_${Date.now()}`;
      const rawNewNode: Node = {
        id: newNodeId,
        type: 'custom',
        position: { x: 250, y: sourceY + 180 },
        data: {
          label: `${app.name} Step`,
          name: `${app.name} Step`,
          connectorId: app.id,
          operationId: app.operation,
          type: app.type,
        },
      };

      const updatedNodes = nodes.map((n) => {
        if (n.id === targetNode?.id || n.position.y > sourceY) {
          return { ...n, position: { ...n.position, y: n.position.y + 180 } };
        }
        return n;
      });

      const edge1: Edge = { id: `e_${targetEdge.source}_${newNodeId}`, source: targetEdge.source, target: newNodeId, type: 'custom', data: { onInsertStep: handleOpenInsertModal } };
      const edge2: Edge = { id: `e_${newNodeId}_${targetEdge.target}`, source: newNodeId, target: targetEdge.target, type: 'custom', data: { onInsertStep: handleOpenInsertModal } };

      const filteredEdges = edges.filter((e) => e.id !== targetEdge.id);
      const combinedEdges = [...filteredEdges, edge1, edge2];
      const combinedNodes = syncNodesState([...updatedNodes, rawNewNode], combinedEdges);

      setNodes(combinedNodes);
      setEdges(combinedEdges);
      toast.success(`Inserted ${app.name}`, { description: 'Step inserted into vertical line.' });
    }

    setInsertContext(null);
  };

  return (
    <div className="flex-1 h-full bg-bgCanvas relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onlyRenderVisibleElements={true}
        snapToGrid={true}
        snapGrid={[15, 15]}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="rgba(255, 255, 255, 0.1)" />
        <Controls className="!bg-bgCard !border-borderColor !text-white rounded-md overflow-hidden" />
        <MiniMap nodeColor={() => '#6366f1'} maskColor="rgba(11, 15, 25, 0.8)" className="!bg-bgCard !border-borderColor !rounded-md" />
      </ReactFlow>

      <AppPickerModal isOpen={Boolean(insertContext)} onClose={() => setInsertContext(null)} onSelectApp={handleSelectApp} />
    </div>
  );
}
