'use client';
import React, { useState } from 'react';
import { Bot, Sparkles, Send, Loader2, X, Plus, Trash2, Sliders, CheckCircle2, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  changesSummary?: string[];
  timestamp: string;
}

export function AICopilotDrawer({
  isOpen,
  onClose,
  canvasNodes,
  canvasEdges,
  onApplyCanvasUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  canvasNodes: any[];
  canvasEdges: any[];
  onApplyCanvasUpdate: (newNodes: any[], newEdges: any[]) => void;
}) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init_1',
      role: 'assistant',
      content:
        '👋 Hi! I am your **In-Canvas AI Co-Pilot**. Ask me to **add steps**, **delete steps**, **update configurations**, **re-wire pipelines**, or **auto-fill parameter mappings** on your live canvas!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [suggestions, setSuggestions] = useState<{ label: string; prompt: string }[]>([
    { label: '💬 Create Telegram Bot Automation', prompt: 'Create a Telegram bot trigger that routes intent using AI and sends a chat reply' },
    { label: '📊 Change Sheet to "Anil_dev"', prompt: 'Change Google Sheet name to Anil_dev' },
    { label: '🔍 Search "React developer jobs"', prompt: 'Set Web Search query to React developer jobs' },
    { label: '🤖 Insert AI Intent Router Step', prompt: 'Insert an AI Command Router step after trigger' },
    { label: '⏱️ Change Schedule to Hourly', prompt: 'Change schedule frequency to hourly every 1 hour' },
  ]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendPrompt = async (textToSend?: string) => {
    const query = textToSend || prompt;
    if (!query.trim() || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setIsLoading(true);

    try {
      // Send current live canvas state (nodes & edges) to AI Co-Pilot API
      const res = await apiClient.post('/v1/ai-agent/copilot', {
        nodes: canvasNodes.map((n) => ({
          id: n.id,
          name: n.data?.name || n.data?.label || n.id,
          connectorId: n.data?.connectorId || 'autoflow-schedule',
          operationId: n.data?.operationId || 'execute',
          type: n.data?.type || 'action',
          config: n.data?.config || {},
          fieldMapping: n.data?.fieldMapping || {},
          position: n.position || { x: 250, y: 80 },
        })),
        edges: canvasEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
        userPrompt: query.trim(),
      });

      const data = res.data.data;
      const aiMsg: CopilotMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: data.replyMessage || '✨ Updated visual workflow canvas.',
        changesSummary: data.changesSummary || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      if (data.aiSuggestions && Array.isArray(data.aiSuggestions) && data.aiSuggestions.length > 0) {
        setSuggestions(data.aiSuggestions);
      }

      // Dynamically apply updated nodes and edges to visual canvas
      if (data.nodes && Array.isArray(data.nodes)) {
        onApplyCanvasUpdate(data.nodes, data.edges || []);
        toast.success('Live Canvas Updated by AI Co-Pilot!', {
          description: `Applied ${data.nodes.length} canvas nodes. Check your visual builder!`,
        });
      }
    } catch (err: any) {
      console.error('Co-Pilot error:', err);
      toast.error('AI Co-Pilot Error', {
        description: err?.response?.data?.message || 'Could not update canvas.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-96 border-l border-borderColor bg-bgSecondary flex flex-col h-full shadow-2xl z-30 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-borderColor bg-bgPrimary flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accentPurple/20 text-accentPurple">
            <Bot size={18} />
          </div>
          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>AI Canvas Co-Pilot</span>
              <Sparkles size={12} className="text-accentPurple" />
            </div>
            <div className="text-[10px] text-textMuted">Live Dynamic Canvas Assistant</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-textMuted hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Dynamic AI Suggestions Chips */}
      <div className="p-3 border-b border-borderColor bg-white/[0.01] flex flex-wrap gap-1.5 text-[11px]">
        <div className="w-full text-[10px] text-accentPurple font-semibold mb-1 flex items-center justify-between">
          <span>Smart AI Canvas Suggestions:</span>
          <Sparkles size={11} />
        </div>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(s.prompt)}
            className="px-2 py-1 bg-white/5 border border-white/10 text-accentIndigo hover:border-accentPurple hover:bg-purple-500/10 rounded-md transition-all text-[10px] flex items-center gap-1 font-medium"
          >
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col gap-1.5 max-w-[90%] ${
              m.role === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            <div
              className={`p-3 rounded-xl border leading-relaxed ${
                m.role === 'user'
                  ? 'bg-accentPurple text-white border-accentPurple/50 rounded-br-none'
                  : 'bg-white/5 text-textPrimary border-borderColor rounded-bl-none'
              }`}
            >
              {m.content}

              {/* Changes Summary Badges */}
              {m.changesSummary && m.changesSummary.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-1">
                  <div className="text-[10px] font-semibold text-accentEmerald flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    <span>Canvas Mutations Applied:</span>
                  </div>
                  {m.changesSummary.map((c, i) => (
                    <div key={i} className="text-[10px] text-textMuted flex items-center gap-1">
                      <ArrowRight size={9} className="text-accentPurple" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[9px] text-textMuted px-1">{m.timestamp}</span>
          </div>
        ))}

        {isLoading && (
          <div className="self-start flex items-center gap-2 p-2.5 bg-white/5 border border-borderColor rounded-xl text-textMuted text-xs">
            <Loader2 size={14} className="animate-spin text-accentPurple" />
            <span>AI Co-Pilot is modifying visual canvas...</span>
          </div>
        )}
      </div>

      {/* Prompt Input Footer */}
      <div className="p-3 border-t border-borderColor bg-bgPrimary">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex items-center gap-1.5 bg-bgSecondary border border-borderColor rounded-xl px-3 py-1.5 focus-within:border-accentPurple transition-colors"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to add, delete, or fix steps..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-xs text-white placeholder-textMuted outline-none"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="p-1.5 bg-accentPurple text-white rounded-lg disabled:opacity-40 hover:bg-accentPurple/90 transition-all"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
