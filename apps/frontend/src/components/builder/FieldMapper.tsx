'use client';
import React, { useState } from 'react';
import { Heading, Text, Button, Badge } from '@/components/ui';
import { Sliders, Lock, Plus, Tag } from 'lucide-react';
import { Node } from 'reactflow';
import { toast } from 'sonner';

export function FieldMapper({ selectedNode }: { selectedNode?: Node | null }) {
  const [templateInput, setTemplateInput] = useState('{{nodes.node_trigger.output.body}}');
  const [selectedAccount, setSelectedAccount] = useState('account_1');

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

  const sampleVariables = [
    { label: 'Body Text', var: '{{nodes.node_trigger.output.body}}' },
    { label: 'Sender Email', var: '{{nodes.node_trigger.output.sender}}' },
    { label: 'Subject', var: '{{nodes.node_trigger.output.subject}}' },
    { label: 'AI Result', var: '{{nodes.node_ai.output.result}}' },
  ];

  const handleInsertVariable = (variableStr: string) => {
    setTemplateInput((prev) => `${prev} ${variableStr}`);
    toast.info('Variable Appended', { description: `Inserted ${variableStr} into input template.` });
  };

  const handleConnectNewAccount = () => {
    toast.info(`Connecting Account for ${data.connectorId?.toUpperCase()}`, {
      description: 'Redirecting to OAuth authorization with AES-256 token encryption.',
    });
  };

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
        {/* Connected Account Selector */}
        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1 flex items-center gap-1">
            <Lock size={12} className="text-accentEmerald" />
            <span>Connected Account</span>
          </label>
          <div className="flex gap-1.5">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="flex-1 bg-bgPrimary border border-borderColor rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-accentPurple"
            >
              <option value="account_1">{data.connectorId?.toUpperCase()} Work Account (AES-256)</option>
              <option value="account_2">{data.connectorId?.toUpperCase()} Personal (AES-256)</option>
            </select>
            <button
              onClick={handleConnectNewAccount}
              className="p-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded text-accentIndigo hover:bg-indigo-500/25 transition-colors"
              title="Connect New Account"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Operation Selection */}
        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1 block">Operation Action</label>
          <select className="w-full bg-bgPrimary border border-borderColor rounded px-3 py-1.5 text-xs text-white outline-none">
            <option>{data.operationId || 'send_message'}</option>
            <option>custom_action</option>
          </select>
        </div>

        {/* Interactive Output Variable Picker */}
        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1">
            <Tag size={12} className="text-accentPurple" />
            <span>Available Upstream Variables</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {sampleVariables.map((v) => (
              <button
                key={v.var}
                onClick={() => handleInsertVariable(v.var)}
                className="px-2 py-1 rounded bg-white/[0.04] hover:bg-indigo-500/20 border border-white/10 text-[10px] text-accentIndigo hover:text-white transition-colors"
              >
                + {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Field Mapping Template Input */}
        <div>
          <label className="text-xs font-semibold text-textSecondary mb-1 block">Input Payload Template</label>
          <textarea
            rows={3}
            value={templateInput}
            onChange={(e) => setTemplateInput(e.target.value)}
            className="w-full bg-bgPrimary border border-borderColor rounded p-2.5 text-xs font-mono text-white outline-none focus:border-accentPurple resize-none"
          />
          <Text variant="muted" className="text-[11px] mt-1">
            Output variables from upstream nodes are interpolated dynamically at step execution time.
          </Text>
        </div>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="mt-4 w-full"
        onClick={() => toast.success('Node Saved', { description: 'Updated node parameters and credentials.' })}
      >
        Save Node Configuration
      </Button>
    </div>
  );
}
