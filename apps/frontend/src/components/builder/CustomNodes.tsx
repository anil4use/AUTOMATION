import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Mail, MessageSquare, Table, Sparkles, Zap, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui';

const iconMap: Record<string, any> = {
  gmail: Mail,
  slack: MessageSquare,
  'google-sheets': Table,
  'ai-agent': Sparkles,
};

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const Icon = iconMap[data.connectorId] || Zap;
  const isTrigger = data.type === 'trigger';
  const isAINode = data.type === 'ai-agent';

  return (
    <div
      className={`glass-card p-4 min-w-[240px] border transition-all shadow-xl ${
        selected ? 'border-accentPurple ring-2 ring-accentPurple/30' : 'border-borderColor'
      }`}
    >
      {/* Input Handle (if not trigger) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3.5 h-3.5 !bg-accentIndigo !border-2 !border-bgPrimary hover:scale-125 transition-transform"
        />
      )}

      {/* Node Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-md ${
              isTrigger
                ? 'bg-emerald-500/15 text-accentEmerald'
                : isAINode
                ? 'bg-purple-500/15 text-accentPurple'
                : 'bg-indigo-500/15 text-accentIndigo'
            }`}
          >
            <Icon size={18} />
          </div>
          <div>
            <div className="font-semibold text-xs text-white">{data.label || data.name}</div>
            <div className="text-[10px] text-textMuted uppercase">{data.connectorId || 'Connector'}</div>
          </div>
        </div>
        <Badge variant={isTrigger ? 'active' : isAINode ? 'info' : 'draft'}>
          {isTrigger ? 'TRIGGER' : isAINode ? 'AI NODE' : 'ACTION'}
        </Badge>
      </div>

      {/* Operation Label */}
      <div className="text-[11px] text-textSecondary bg-white/[0.03] p-1.5 px-2 rounded border border-white/5 font-mono">
        {data.operationId || 'default_operation'}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3.5 h-3.5 !bg-accentPurple !border-2 !border-bgPrimary hover:scale-125 transition-transform"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
