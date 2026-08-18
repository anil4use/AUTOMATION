'use client';
import React, { useCallback, useMemo, useState } from 'react';
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
import { Heading, Text, SectionCard } from '@/components/ui';
import { Mail, MessageSquare, Table, Sparkles, HardDrive, FileText, CreditCard, Send, Globe, X } from 'lucide-react';
import { toast } from 'sonner';

const availableApps = [
  { id: 'gmail', name: 'Gmail', category: 'Communication', type: 'action', icon: Mail, operation: 'send_email' },
  { id: 'slack', name: 'Slack', category: 'Communication', type: 'action', icon: MessageSquare, operation: 'send_message' },
  { id: 'google-sheets', name: 'Google Sheets', category: 'Productivity', type: 'action', icon: Table, operation: 'append_row' },
  { id: 'google-drive', name: 'Google Drive', category: 'Storage', type: 'action', icon: HardDrive, operation: 'upload_file' },
  { id: 'notion', name: 'Notion Workspace', category: 'Database', type: 'action', icon: FileText, operation: 'create_page' },
  { id: 'stripe', name: 'Stripe Payments', category: 'Finance', type: 'action', icon: CreditCard, operation: 'create_customer' },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Messaging', type: 'action', icon: Send, operation: 'send_message' },
  { id: 'http-request', name: 'Webhook / REST API', category: 'Developer Tools', type: 'action', icon: Globe, operation: 'custom_api_call' },
  { id: 'ai-agent', name: 'AI Processor Node', category: 'AI Native', type: 'ai-agent', icon: Sparkles, operation: 'summarize_text' },
];

export function WorkflowCanvas({ onSelectNode }: { onSelectNode?: (node: Node) => void }) {
  const [insertContext, setInsertContext] = useState<{ type: 'append' | 'insert'; sourceNodeId?: string; targetEdgeId?: string } | null>(null);

  const handleOpenAppendModal = useCallback((nodeId: string) => {
    setInsertContext({ type: 'append', sourceNodeId: nodeId });
  }, []);

  const handleOpenInsertModal = useCallback((edgeId: string) => {
    setInsertContext({ type: 'insert', targetEdgeId: edgeId });
  }, []);

  const initialNodes: Node[] = useMemo(
    () => [
      {
        id: 'node_trigger',
        type: 'custom',
        position: { x: 100, y: 200 },
        data: {
          label: 'AutoFlow Schedule Trigger',
          name: 'AutoFlow Schedule Trigger',
          connectorId: 'autoflow-schedule',
          operationId: 'schedule_time',
          type: 'trigger',
          isLastInChain: false,
          onAddNext: handleOpenAppendModal,
        },
      },
      {
        id: 'node_ai',
        type: 'custom',
        position: { x: 420, y: 200 },
        data: {
          label: 'AI Summarize Step',
          name: 'AI Summarize Step',
          connectorId: 'ai-agent',
          operationId: 'summarize_text',
          type: 'ai-agent',
          isLastInChain: false,
          onAddNext: handleOpenAppendModal,
        },
      },
      {
        id: 'node_action',
        type: 'custom',
        position: { x: 740, y: 200 },
        data: {
          label: 'Slack Send Message',
          name: 'Slack Send Message',
          connectorId: 'slack',
          operationId: 'send_message',
          type: 'action',
          isLastInChain: true,
          onAddNext: handleOpenAppendModal,
        },
      },
    ],
    [handleOpenAppendModal]
  );

  const initialEdges: Edge[] = useMemo(
    () => [
      {
        id: 'e_trigger_ai',
        source: 'node_trigger',
        target: 'node_ai',
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      },
      {
        id: 'e_ai_action',
        source: 'node_ai',
        target: 'node_action',
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      },
    ],
    [handleOpenInsertModal]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  // Strict Single Linear Chain Rule: A node can only have 1 outgoing edge
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => {
        // Remove any existing edge originating from the same source node to prevent multi-branch splits
        const filtered = eds.filter((e) => e.source !== params.source);
        return addEdge(
          {
            ...params,
            type: 'custom',
            data: { onInsertStep: handleOpenInsertModal },
          },
          filtered
        );
      });
      toast.info('Sequential 1-Way Edge Connected', { description: 'Enforced strict linear pipeline flow.' });
    },
    [handleOpenInsertModal, setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onSelectNode) onSelectNode(node);
    },
    [onSelectNode]
  );

  // Helper to update isLastInChain flag across nodes
  const syncLastInChainFlags = useCallback((currentNodes: Node[], currentEdges: Edge[]) => {
    const sourceNodeIds = new Set(currentEdges.map((e) => e.source));
    return currentNodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isLastInChain: !sourceNodeIds.has(n.id),
      },
    }));
  }, []);

  const handleSelectApp = (app: typeof availableApps[0]) => {
    if (!insertContext) return;

    if (insertContext.type === 'append' && insertContext.sourceNodeId) {
      // Append to the end of the linear chain
      const sourceId = insertContext.sourceNodeId;
      const parentNode = nodes.find((n) => n.id === sourceId);
      const parentX = parentNode ? parentNode.position.x : 300;
      const parentY = parentNode ? parentNode.position.y : 200;

      const newNodeId = `node_${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: 'custom',
        position: { x: parentX + 320, y: parentY },
        data: {
          label: `${app.name} Step`,
          name: `${app.name} Step`,
          connectorId: app.id,
          operationId: app.operation,
          type: app.type,
          onAddNext: handleOpenAppendModal,
        },
      };

      const newEdge: Edge = {
        id: `e_${sourceId}_${newNodeId}`,
        source: sourceId,
        target: newNodeId,
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      };

      // Strict Rule: Remove any pre-existing outgoing edge from sourceId to maintain 1-way linear pipeline
      const filteredEdges = edges.filter((e) => e.source !== sourceId);
      const nextNodes = syncLastInChainFlags([...nodes, newNode], [...filteredEdges, newEdge]);

      setNodes(nextNodes);
      setEdges([...filteredEdges, newEdge]);
      toast.success(`Appended ${app.name} to Linear Pipeline`, { description: 'Maintained 1-way sequential DAG flow.' });
    } else if (insertContext.type === 'insert' && insertContext.targetEdgeId) {
      // Insert in the middle of a centered edge line
      const targetEdge = edges.find((e) => e.id === insertContext.targetEdgeId);
      if (!targetEdge) return;

      const sourceNode = nodes.find((n) => n.id === targetEdge.source);
      const targetNode = nodes.find((n) => n.id === targetEdge.target);

      const sourceX = sourceNode ? sourceNode.position.x : 100;
      const sourceY = sourceNode ? sourceNode.position.y : 200;

      const newNodeId = `node_${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type: 'custom',
        position: { x: sourceX + 320, y: sourceY },
        data: {
          label: `${app.name} Step`,
          name: `${app.name} Step`,
          connectorId: app.id,
          operationId: app.operation,
          type: app.type,
          onAddNext: handleOpenAppendModal,
        },
      };

      // Shift downstream target node to the right
      const updatedNodes = nodes.map((n) => {
        if (n.id === targetNode?.id || n.position.x > sourceX) {
          return { ...n, position: { ...n.position, x: n.position.x + 320 } };
        }
        return n;
      });

      // Split edge into source -> new -> target
      const edge1: Edge = {
        id: `e_${targetEdge.source}_${newNodeId}`,
        source: targetEdge.source,
        target: newNodeId,
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      };

      const edge2: Edge = {
        id: `e_${newNodeId}_${targetEdge.target}`,
        source: newNodeId,
        target: targetEdge.target,
        type: 'custom',
        data: { onInsertStep: handleOpenInsertModal },
      };

      const filteredEdges = edges.filter((e) => e.id !== targetEdge.id);
      const nextNodes = syncLastInChainFlags([...updatedNodes, newNode], [...filteredEdges, edge1, edge2]);

      setNodes(nextNodes);
      setEdges([...filteredEdges, edge1, edge2]);
      toast.success(`Inserted ${app.name} into Center of Edge Line`, {
        description: `Sequential 1-way pipeline updated cleanly.`,
      });
    }

    setInsertContext(null);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const connectorDataStr = event.dataTransfer.getData('application/reactflow');
      if (!connectorDataStr) return;

      try {
        const connector = JSON.parse(connectorDataStr);
        const position = {
          x: event.clientX - 300,
          y: event.clientY - 150,
        };

        const newNode: Node = {
          id: `node_${Date.now()}`,
          type: 'custom',
          position,
          data: {
            label: `${connector.name} Step`,
            name: `${connector.name} Step`,
            connectorId: connector.id,
            operationId: connector.operations?.[0] || 'default_action',
            type: connector.type || 'action',
            onAddNext: handleOpenAppendModal,
          },
        };

        setNodes((nds) => syncLastInChainFlags([...nds, newNode], edges));
      } catch (e) {
        console.error('Drop node error:', e);
      }
    },
    [edges, handleOpenAppendModal, setNodes, syncLastInChainFlags]
  );

  return (
    <div className="flex-1 h-full bg-bgCanvas relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="rgba(255, 255, 255, 0.1)" />
        <Controls className="!bg-bgCard !border-borderColor !text-white rounded-md overflow-hidden" />
        <MiniMap
          nodeColor={() => '#6366f1'}
          maskColor="rgba(11, 15, 25, 0.8)"
          className="!bg-bgCard !border-borderColor !rounded-md"
        />
      </ReactFlow>

      {/* Canvas App Selector Modal when Plus button is clicked */}
      {insertContext && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <SectionCard className="w-full max-w-lg border-purple-500/40 relative max-h-[80vh] flex flex-col">
            <button
              onClick={() => setInsertContext(null)}
              className="absolute right-4 top-4 text-textMuted hover:text-white"
            >
              <X size={18} />
            </button>

            <Heading as="h3" className="mb-1">
              {insertContext.type === 'insert' ? 'Insert Step into Center of Edge Line' : 'Append Next Step to Linear Pipeline'}
            </Heading>
            <Text variant="secondary" className="mb-4 text-xs">
              Choose an integration app to insert sequentially into your 1-way automation flow.
            </Text>

            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1">
              {availableApps.map((app) => {
                const Icon = app.icon;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleSelectApp(app)}
                    className="p-3 rounded-md bg-white/[0.03] border border-borderColor hover:border-accentPurple hover:bg-white/[0.08] text-left flex items-center gap-3 transition-all group"
                  >
                    <div className="p-2 rounded bg-indigo-500/15 text-accentIndigo group-hover:scale-110 transition-transform">
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">{app.name}</div>
                      <div className="text-[10px] text-textMuted">{app.category}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
