'use client';
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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

const VERTICAL_NODE_SPACING = 270;

export function WorkflowCanvas({
  workflowId = 'new',
  initialNodes = null,
  initialEdges = null,
  onSelectNode,
  onCanvasChange,
  updatedNodeData = null,
}: {
  workflowId?: string;
  initialNodes?: any[] | null;
  initialEdges?: any[] | null;
  onSelectNode?: (node: Node) => void;
  onCanvasChange?: (nodes: Node[], edges: Edge[]) => void;
  updatedNodeData?: { nodeId: string; data: Partial<any> } | null;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [insertContext, setInsertContext] = useState<{ type: 'append' | 'insert'; sourceNodeId?: string; targetEdgeId?: string } | null>(null);

  const onSelectNodeRef = useRef(onSelectNode);
  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  const onCanvasChangeRef = useRef(onCanvasChange);
  useEffect(() => {
    onCanvasChangeRef.current = onCanvasChange;
  }, [onCanvasChange]);

  // Sync node edits from FieldMapper
  useEffect(() => {
    if (updatedNodeData) {
      setNodes((prevNodes) =>
        prevNodes.map((n) => {
          if (n.id === updatedNodeData.nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                ...updatedNodeData.data,
              },
            };
          }
          return n;
        })
      );
    }
  }, [updatedNodeData, setNodes]);

  // Notify parent whenever nodes or edges change
  useEffect(() => {
    if (onCanvasChangeRef.current) {
      onCanvasChangeRef.current(nodes, edges);
    }
  }, [nodes, edges]);

  const handleOpenAppendModal = useCallback((nodeId: string) => {
    setInsertContext({ type: 'append', sourceNodeId: nodeId });
  }, []);

  const handleOpenInsertModal = useCallback((edgeId: string) => {
    setInsertContext({ type: 'insert', targetEdgeId: edgeId });
  }, []);

  const handleRenameNode = useCallback((nodeId: string, newLabel: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel, name: newLabel } } : n))
    );
    toast.success('Step Renamed', { description: `Updated label to "${newLabel}".` });
  }, [setNodes]);

  const handleEditNode = useCallback((nodeId: string) => {
    setNodes((prevNodes) => {
      const nodeToEdit = prevNodes.find((n) => n.id === nodeId);
      if (nodeToEdit && onSelectNodeRef.current) {
        onSelectNodeRef.current(nodeToEdit);
      }
      return prevNodes;
    });
    toast.info('Step Selected for Configuration');
  }, [setNodes]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => {
      const sourceNode = currentNodes.find((n) => n.id === nodeId);
      if (!sourceNode) return currentNodes;

      const dupNodeId = `node_${Date.now()}`;
      const dupNode: Node = {
        ...sourceNode,
        id: dupNodeId,
        position: { x: 250, y: sourceNode.position.y + VERTICAL_NODE_SPACING },
        data: {
          ...sourceNode.data,
          label: `${sourceNode.data.label} (Copy)`,
          isLastInChain: true,
          onAddNext: handleOpenAppendModal,
          onRenameNode: handleRenameNode,
          onEditNode: handleEditNode,
          onDuplicateNode: handleDuplicateNode,
          onDeleteNode: handleDeleteNode,
        },
      };

      const shifted = currentNodes.map((n) => {
        const isPast = n.position.y > sourceNode.position.y;
        return {
          ...n,
          position: isPast ? { ...n.position, y: n.position.y + VERTICAL_NODE_SPACING } : n.position,
          data: {
            ...n.data,
            isLastInChain: isPast ? n.data.isLastInChain : false,
          },
        };
      });

      return [...shifted, dupNode];
    });
    toast.success('Step Duplicated');
  }, [handleOpenAppendModal, handleRenameNode, handleEditNode, setNodes]);

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

      const remaining = currentNodes.filter((n) => n.id !== nodeId);
      return remaining.map((n, idx) => ({
        ...n,
        position: { x: 250, y: 80 + idx * VERTICAL_NODE_SPACING },
        data: {
          ...n.data,
          stepNumber: idx + 1,
          isLastInChain: idx === remaining.length - 1,
        },
      }));
    });
    toast.error('Step Deleted');
  }, [handleOpenInsertModal, setEdges, setNodes]);

  const bindNodeCallbacks = useCallback((n: Node) => ({
    ...n,
    data: {
      ...n.data,
      onAddNext: handleOpenAppendModal,
      onRenameNode: handleRenameNode,
      onEditNode: handleEditNode,
      onDuplicateNode: handleDuplicateNode,
      onDeleteNode: handleDeleteNode,
    },
  }), [handleOpenAppendModal, handleRenameNode, handleEditNode, handleDuplicateNode, handleDeleteNode]);

  // Hydrate canvas on initialNodes / initialEdges load or workflowId change
  useEffect(() => {
    if (initialNodes && initialNodes.length > 0) {
      const hydratedNodes: Node[] = initialNodes.map((n: any, idx: number) => {
        const isTrigger = idx === 0 || n.type === 'trigger';
        const isLast = idx === initialNodes.length - 1;
        return bindNodeCallbacks({
          id: n.id || `node_${idx + 1}`,
          type: 'custom',
          position: { x: 250, y: 80 + idx * VERTICAL_NODE_SPACING },
          data: {
            stepNumber: idx + 1,
            label: n.name || n.label || `Step ${idx + 1}`,
            name: n.name || n.label || `Step ${idx + 1}`,
            connectorId: n.connectorId || 'autoflow-schedule',
            operationId: n.operationId || 'execute',
            type: isTrigger ? 'trigger' : n.type || 'action',
            isLastInChain: isLast,
            config: n.config || {},
            fieldMapping: n.fieldMapping || {},
          },
        });
      });

      let hydratedEdges: Edge[] = [];
      if (initialEdges && initialEdges.length > 0) {
        hydratedEdges = initialEdges.map((e: any) => ({
          id: e.id || `e_${e.source}_${e.target}`,
          source: e.source,
          target: e.target,
          type: 'custom',
          data: { onInsertStep: handleOpenInsertModal },
        }));
      } else {
        // Auto-generate linear edges if edges array was empty
        for (let i = 0; i < hydratedNodes.length - 1; i++) {
          hydratedEdges.push({
            id: `e_${hydratedNodes[i].id}_${hydratedNodes[i + 1].id}`,
            source: hydratedNodes[i].id,
            target: hydratedNodes[i + 1].id,
            type: 'custom',
            data: { onInsertStep: handleOpenInsertModal },
          });
        }
      }

      setNodes(hydratedNodes);
      setEdges(hydratedEdges);
    } else {
      // Default single trigger step for new manual workflows
      const singleTriggerNode = bindNodeCallbacks({
        id: 'node_trigger',
        type: 'custom',
        position: { x: 250, y: 80 },
        data: {
          stepNumber: 1,
          label: 'AutoFlow Schedule Trigger',
          name: 'AutoFlow Schedule Trigger',
          connectorId: 'autoflow-schedule',
          operationId: 'schedule_time',
          type: 'trigger',
          isLastInChain: true,
        },
      });

      setNodes([singleTriggerNode]);
      setEdges([]);
    }
  }, [workflowId, initialNodes, initialEdges, bindNodeCallbacks, handleOpenInsertModal, setEdges, setNodes]);

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
      if (onSelectNodeRef.current) {
        onSelectNodeRef.current(node);
      }
    },
    []
  );

  const handleSelectApp = (app: AppOption) => {
    if (!insertContext) return;

    if (insertContext.type === 'append' && insertContext.sourceNodeId) {
      const sourceId = insertContext.sourceNodeId;
      const parentNode = nodes.find((n) => n.id === sourceId);
      const parentY = parentNode ? parentNode.position.y : 80;

      const newNodeId = `node_${Date.now()}`;
      const newNode: Node = bindNodeCallbacks({
        id: newNodeId,
        type: 'custom',
        position: { x: 250, y: parentY + 180 },
        data: {
          stepNumber: nodes.length + 1,
          label: `${app.name} Step`,
          name: `${app.name} Step`,
          connectorId: app.id,
          operationId: app.operation,
          type: app.type,
          isLastInChain: true,
        },
      });

      const newEdge: Edge = {
        id: `e_${sourceId}_${newNodeId}`,
        source: sourceId,
        target: newNodeId,
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      };

      setNodes((prevNodes) =>
        prevNodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isLastInChain: false,
          },
        })).concat(newNode)
      );

      setEdges((prevEdges) => [...prevEdges.filter((e) => e.source !== sourceId), newEdge]);
      toast.success(`Appended ${app.name}`, { description: 'Added next step vertically with line stem.' });
    } else if (insertContext.type === 'insert' && insertContext.targetEdgeId) {
      const targetEdge = edges.find((e) => e.id === insertContext.targetEdgeId);
      if (!targetEdge) return;

      const sourceNode = nodes.find((n) => n.id === targetEdge.source);
      const targetNode = nodes.find((n) => n.id === targetEdge.target);
      const sourceY = sourceNode ? sourceNode.position.y : 80;

      const newNodeId = `node_${Date.now()}`;
      const newNode: Node = bindNodeCallbacks({
        id: newNodeId,
        type: 'custom',
        position: { x: 250, y: sourceY + 180 },
        data: {
          stepNumber: 2,
          label: `${app.name} Step`,
          name: `${app.name} Step`,
          connectorId: app.id,
          operationId: app.operation,
          type: app.type,
          isLastInChain: false,
        },
      });

      const edge1: Edge = { id: `e_${targetEdge.source}_${newNodeId}`, source: targetEdge.source, target: newNodeId, type: 'custom', data: { onInsertStep: handleOpenInsertModal } };
      const edge2: Edge = { id: `e_${newNodeId}_${targetEdge.target}`, source: newNodeId, target: targetEdge.target, type: 'custom', data: { onInsertStep: handleOpenInsertModal } };

      setNodes((prevNodes) => {
        const shifted = prevNodes.map((n) => {
          if (n.id === targetNode?.id || n.position.y > sourceY) {
            return { ...n, position: { ...n.position, y: n.position.y + 180 } };
          }
          return n;
        });

        const sorted = [...shifted, newNode].sort((a, b) => a.position.y - b.position.y);
        return sorted.map((n, idx) => ({
          ...n,
          data: {
            ...n.data,
            stepNumber: idx + 1,
            isLastInChain: idx === sorted.length - 1,
          },
        }));
      });

      setEdges((prevEdges) => [...prevEdges.filter((e) => e.id !== targetEdge.id), edge1, edge2]);
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
