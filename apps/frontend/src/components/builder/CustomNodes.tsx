import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Mail, MessageSquare, Table, Sparkles, Zap, HardDrive, FileText, CreditCard, Send, Globe, Clock, Plus, MoreVertical, Edit2, Sliders, Copy, Trash2, Check, X, GitFork, ShoppingBag } from 'lucide-react';

const iconMap: Record<string, any> = {
  'autoflow-schedule': Clock,
  gmail: Mail,
  slack: MessageSquare,
  'google-sheets': Table,
  'google-drive': HardDrive,
  notion: FileText,
  stripe: CreditCard,
  whatsapp: Send,
  'http-request': Globe,
  'ai-agent': Sparkles,
  'autoflow-condition': GitFork,
  condition: GitFork,
  'amazon-flipkart': ShoppingBag,
  amazon: ShoppingBag,
  flipkart: ShoppingBag,
};

export const CustomNode = memo(({ data, selected, id }: NodeProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState(data.label || data.name || '');

  const menuRef = useRef<HTMLDivElement>(null);

  const Icon = iconMap[data.connectorId] || Zap;
  const isTrigger = data.type === 'trigger';
  const isAINode = data.type === 'ai-agent';
  const isConfigured = Boolean(data.connectorId && data.operationId);

  // Capture-phase event listener guarantees click-outside executes even if React Flow stops propagation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      window.addEventListener('click', handleClickOutside, true);
      window.addEventListener('pointerdown', handleClickOutside, true);
    }
    return () => {
      window.removeEventListener('click', handleClickOutside, true);
      window.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [showMenu]);

  const handleSaveRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onRenameNode && renameText.trim()) {
      data.onRenameNode(id, renameText.trim());
    }
    setIsRenaming(false);
    setShowMenu(false);
  };

  return (
    <div
      className={`p-4 rounded-xl min-w-[320px] max-w-[360px] bg-bgSecondary transition-all shadow-xl relative group ${
        isConfigured ? 'border-2 border-indigo-500/40' : 'border-2 border-dashed border-borderColor'
      } ${selected ? 'ring-2 ring-accentPurple shadow-glow' : ''}`}
    >
      {/* Top Connection Handle (if not trigger) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3.5 h-3.5 !bg-accentIndigo !border-2 !border-bgPrimary hover:scale-125 transition-transform"
        />
      )}

      {/* Node Header Pill & Context Menu */}
      <div className="flex items-center justify-between mb-2 relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-textSecondary">
            <Zap size={12} className={isTrigger ? 'text-accentEmerald' : isAINode ? 'text-accentPurple' : 'text-accentIndigo'} />
            <span>{isTrigger ? 'Trigger' : isAINode ? 'AI Action' : 'Action'}</span>
          </div>

          {/* Connection Status Badge directly on Canvas Node Card */}
          {['autoflow-schedule', 'ai-agent', 'web-search', 'autoflow-condition', 'http-request'].includes(data.connectorId) ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-accentEmerald">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>System</span>
            </div>
          ) : (data.isConnected || Boolean(data.connectionId)) ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected 🟢</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400 shadow-sm animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Connect ⚠️</span>
            </div>
          )}
        </div>

        {/* 3 Dots Menu Button Container with Click-Outside Ref */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((prev) => !prev);
            }}
            className="text-textMuted hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            title="Step Options"
          >
            <MoreVertical size={16} />
          </button>

          {/* Context Menu Dropdown */}
          {showMenu && (
            <div
              className="absolute right-0 top-8 w-52 bg-[#111625] border border-borderColor/80 rounded-xl shadow-2xl p-1.5 z-50 ring-1 ring-white/10 animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Edit2 size={14} className="text-accentIndigo" />
                <span>Rename Step</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.onEditNode) data.onEditNode(id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Sliders size={14} className="text-amber-400" />
                <span>Edit Configuration</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (data.onDuplicateNode) data.onDuplicateNode(id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <Copy size={14} className="text-accentPurple" />
                <span>Duplicate Step</span>
              </button>

              {!isTrigger && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (data.onDeleteNode) data.onDeleteNode(id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Delete Step</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Node Content Body */}
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-lg ${
            isTrigger
              ? 'bg-emerald-500/15 text-accentEmerald'
              : isAINode
              ? 'bg-purple-500/15 text-accentPurple'
              : 'bg-indigo-500/15 text-accentIndigo'
          }`}
        >
          <Icon size={20} />
        </div>

        <div className="flex-1">
          {isRenaming ? (
            <div className="flex items-center gap-1 my-1">
              <input
                type="text"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                autoFocus
                className="w-full bg-bgPrimary border border-accentPurple rounded px-2 py-1 text-xs text-white outline-none"
              />
              <button onClick={handleSaveRename} className="p-1 text-accentEmerald hover:text-white">
                <Check size={14} />
              </button>
              <button onClick={() => setIsRenaming(false)} className="p-1 text-textMuted hover:text-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="font-semibold text-xs text-white">
              {data.stepNumber ? `${data.stepNumber}. ` : ''}{data.label || data.name}
            </div>
          )}
          <div className="text-[11px] text-textMuted truncate">
            {isConfigured ? `${data.connectorId?.toUpperCase()} — ${data.operationId}` : 'Select the event for step to run'}
          </div>
        </div>
      </div>

      {/* Trailing Vertical Line Extension with Centered Plus Icon (Zapier Style) */}
      {data.isLastInChain && data.onAddNext && (
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
          <div className="w-0.5 h-14 bg-accentIndigo" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onAddNext(id);
            }}
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-accentIndigo text-white flex items-center justify-center shadow-lg border-2 border-bgPrimary hover:scale-125 hover:bg-accentPurple transition-all"
            title="Add step"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Bottom Connection Handles for Condition vs Standard Nodes */}
      {data.connectorId === 'autoflow-condition' || data.connectorId === 'condition' ? (
        <div className="flex items-center justify-between px-6 pt-2 border-t border-white/10 mt-2 text-[10px] font-bold">
          <div className="flex items-center gap-1 text-emerald-400 relative">
            <Check size={12} />
            <span>TRUE</span>
            <Handle
              type="source"
              id="true"
              position={Position.Bottom}
              style={{ left: '25%' }}
              className="w-3.5 h-3.5 !bg-emerald-500 !border-2 !border-bgPrimary hover:scale-125 transition-transform"
            />
          </div>

          <div className="flex items-center gap-1 text-red-400 relative">
            <span>FALSE</span>
            <X size={12} />
            <Handle
              type="source"
              id="false"
              position={Position.Bottom}
              style={{ left: '75%' }}
              className="w-3.5 h-3.5 !bg-red-500 !border-2 !border-bgPrimary hover:scale-125 transition-transform"
            />
          </div>
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3.5 h-3.5 !bg-accentPurple !border-2 !border-bgPrimary hover:scale-125 transition-transform"
        />
      )}
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
