'use client';
import React, { useState } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, CheckCircle2 } from 'lucide-react';
import { Node } from 'reactflow';

export function FieldMapper({ selectedNode }: { selectedNode?: Node | null }) {
  const [templateInput, setTemplateInput] = useState('{{nodes.node_trigger.output.body}}');

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-borderColor bg-bgSecondary flex flex-col p-4 justify-center items-center text-center">
        <Sliders className="text-textMuted mb-2" size={24} />
        <Heading as="h4" className="mb-1">Field Mapper Config</Heading>
        <Text variant="muted">Select any node on the React Flow canvas to configure field mappings & dynamic parameters.</Text>
      </div>
    );
  }

  const { data } = selectedNode;

  return (
    <div className="w-80 border-l border-borderColor bg-bgSecondary flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3 border-b border-borderColor pb-3">
        <div>
          <Heading as="h4">{data.label || data.name}</Heading>
          <Text variant="muted">ID: {selectedNode.id}</Text>
        </div>
        <Badge variant={data.type === 'trigger' ? 'active' : 'info'}>
          {data.type?.toUpperCase() || 'NODE'}
        </Badge>
      </div>

      <div className="flex flex-col gap-4 flex-1">
        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1 block">Operation Action</label>
          <select className="w-full bg-bgPrimary border border-borderColor rounded px-3 py-1.5 text-xs text-white outline-none">
            <option>{data.operationId || 'send_message'}</option>
            <option>custom_action</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1 block">Dynamic Field Mapping Template</label>
          <input
            type="text"
            value={templateInput}
            onChange={(e) => setTemplateInput(e.target.value)}
            className="w-full bg-bgPrimary border border-borderColor rounded px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-accentPurple mb-1"
          />
          <Text variant="muted" className="text-[11px]">
            Reference output from upstream nodes using Handlebar templates.
          </Text>
        </div>

        <div className="p-3 rounded bg-indigo-500/10 border border-indigo-500/20 text-xs text-accentIndigo">
          <div className="font-semibold mb-1">Upstream Output Payload:</div>
          <code className="text-[10px] block text-textSecondary font-mono bg-bgPrimary p-1.5 rounded">
            {`{ "body": "New lead received", "sender": "john@example.com" }`}
          </code>
        </div>
      </div>

      <Button variant="primary" size="sm" className="mt-4 w-full">
        Save Node Configuration
      </Button>
    </div>
  );
}
