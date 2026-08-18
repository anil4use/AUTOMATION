'use client';
import React, { useCallback, useMemo } from 'react';
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

const initialNodes: Node[] = [
  {
    id: 'node_trigger',
    type: 'custom',
    position: { x: 100, y: 150 },
    data: {
      label: 'AutoFlow Schedule Trigger',
      name: 'AutoFlow Schedule Trigger',
      connectorId: 'autoflow-schedule',
      operationId: 'schedule_time',
      type: 'trigger',
    },
  },
  {
    id: 'node_ai',
    type: 'custom',
    position: { x: 420, y: 150 },
    data: {
      label: 'AI Summarize Step',
      name: 'AI Summarize Step',
      connectorId: 'ai-agent',
      operationId: 'summarize_text',
      type: 'ai-agent',
    },
  },
  {
    id: 'node_action',
    type: 'custom',
    position: { x: 740, y: 150 },
    data: {
      label: 'Slack Send Message',
      name: 'Slack Send Message',
      connectorId: 'slack',
      operationId: 'send_message',
      type: 'action',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e_trigger_ai',
    source: 'node_trigger',
    target: 'node_ai',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
  },
  {
    id: 'e_ai_action',
    source: 'node_ai',
    target: 'node_action',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
  },
];

export function WorkflowCanvas({ onSelectNode }: { onSelectNode?: (node: Node) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (onSelectNode) onSelectNode(node);
    },
    [onSelectNode]
  );

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
          },
        };

        setNodes((nds) => nds.concat(newNode));
      } catch (e) {
        console.error('Drop node error:', e);
      }
    },
    [setNodes]
  );

  return (
    <div className="flex-1 h-full bg-bgCanvas relative" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
    </div>
  );
}
