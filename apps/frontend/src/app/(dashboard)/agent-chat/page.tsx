'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Plus, Trash2, ChevronRight, CheckCircle, XCircle, Loader2, AlertTriangle, Zap, RotateCcw, ExternalLink, RefreshCw, MessageSquare, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';


// ─── Types ─────────────────────────────────────────────────────────────────────
interface SSEEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'confirmation_required' | 'final_response' | 'rate_limited' | 'execution_in_progress';
  stepId?: string;
  description?: string;
  preview?: any;
  error?: string;
  errorCode?: string;
  message?: string;
  data?: any;
  confirmationId?: string;
}

interface ExecutionStep {
  id: string;
  status: 'running' | 'done' | 'error';
  description: string;
  preview?: any;
  error?: string;
  errorCode?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  steps?: ExecutionStep[];
  isStreaming?: boolean;
  timestamp: Date;
}

interface Conversation {
  _id: string;
  conversationId: string;
  title: string;
  updatedAt: string;
}

interface ConnectedApp {
  _id: string;
  connectorId: string;
  name: string;
  status: string;
}

// ─── Markdown Renderer (lightweight) ──────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-indigo-300 text-xs">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300 inline-flex items-center gap-1">$1 ↗</a>')
    .replace(/^#{1,6}\s+(.+)$/gm, '<strong class="block text-white text-sm mt-2 mb-1">$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-300 list-decimal">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br/>');
}

// ─── Step Badge Component ──────────────────────────────────────────────────────
function StepBadge({ step }: { step: ExecutionStep }) {
  return (
    <div className={`flex items-start gap-2 py-1.5 px-3 rounded-lg text-xs border ${
      step.status === 'running' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' :
      step.status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
      'bg-red-500/10 border-red-500/30 text-red-300'
    }`}>
      {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin mt-0.5 flex-shrink-0" />}
      {step.status === 'done' && <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
      {step.status === 'error' && <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
      <div>
        <span>{step.description}</span>
        {step.error && <p className="text-red-400 mt-0.5">{step.error} {step.errorCode && `(${step.errorCode})`}</p>}
        {step.preview && step.status === 'done' && (
          <p className="text-slate-400 mt-0.5 font-mono text-[10px]">
            {typeof step.preview === 'object' ? JSON.stringify(step.preview).slice(0, 120) : String(step.preview).slice(0, 120)}
            {JSON.stringify(step.preview).length > 120 && '...'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Message Bubble Component ──────────────────────────────────────────────────
function MessageBubble({
  message,
  onSaveAsWorkflow,
  onRetry,
}: {
  message: ChatMessage;
  onSaveAsWorkflow?: (messageId: string) => void;
  onRetry?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        isUser ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
      }`}>
        {isUser ? 'U' : <Bot className="w-4 h-4" />}
      </div>

      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Execution steps */}
        {message.steps && message.steps.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {message.steps.map((step) => <StepBadge key={step.id} step={step} />)}
          </div>
        )}

        {/* Message content */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm'
        }`}>
          {isUser ? (
            <p>{message.content}</p>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
          )}
        </div>

        {/* Action buttons for agent messages */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex gap-2">
            {onSaveAsWorkflow && (
              <button
                onClick={() => onSaveAsWorkflow(message.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              >
                <Zap className="w-3 h-3" /> Save as Workflow
              </button>
            )}
            {message.steps?.some(s => s.status === 'error') && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirmation Dialog ────────────────────────────────────────────────────────
function ConfirmationDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-auto max-w-md bg-slate-800 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-300">Confirmation Required</h3>
      </div>
      <p className="text-sm text-slate-300 mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors border border-slate-600"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
        >
          Yes, proceed
        </button>
      </div>
    </div>
  );
}

// ─── Save As Workflow Dialog ────────────────────────────────────────────────────
function SaveWorkflowDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (triggerType: 'schedule' | 'webhook' | 'manual') => void;
  onCancel: () => void;
}) {
  const [triggerType, setTriggerType] = useState<'schedule' | 'webhook' | 'manual'>('manual');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-sm">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-400" /> Save as Workflow</h3>
        <p className="text-xs text-slate-400 mb-4">Select a trigger type to create a repeatable workflow from this agent execution.</p>
        <div className="flex flex-col gap-2 mb-5">
          {(['schedule', 'webhook', 'manual'] as const).map((t) => (
            <label key={t} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${triggerType === t ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>
              <input type="radio" className="hidden" checked={triggerType === t} onChange={() => setTriggerType(t)} />
              <div className={`w-3 h-3 rounded-full border-2 ${triggerType === t ? 'border-indigo-400 bg-indigo-400' : 'border-slate-500'}`} />
              <span className="text-sm font-medium capitalize">{t === 'manual' ? 'Manual Run' : t === 'schedule' ? 'Scheduled (Cron)' : 'Webhook Trigger'}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600">Cancel</button>
          <button onClick={() => onConfirm(triggerType)} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">Create Workflow</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Agent Chat Page ───────────────────────────────────────────────────────
export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [confirmation, setConfirmation] = useState<{ message: string; confirmationId: string } | null>(null);
  const [saveWorkflowFor, setSaveWorkflowFor] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations and connected apps on mount
  useEffect(() => {
    fetchConversations();
    fetchConnectedApps();
    // Start a new conversation
    startNewConversation();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await apiClient.get('/v1/agent-chat/conversations');
      setConversations(res.data.data || []);
    } catch {}
  };

  const fetchConnectedApps = async () => {
    try {
      const res = await apiClient.get('/v1/connectors/connections');
      setConnectedApps((res.data.data || []).filter((c: ConnectedApp) => c.status === 'connected' || c.status === 'active'));
    } catch {}
  };

  const startNewConversation = () => {
    const newId = `conv_${Date.now()}`;
    setActiveConvId(newId);
    setMessages([{
      id: 'welcome',
      role: 'agent',
      content: `👋 **Welcome to AutoFlow Agent Chat!**\n\nI have direct access to all your connected apps and can perform real actions for you right now — no workflow setup needed.\n\nJust tell me what you want to do. For example:\n\n- *"How many users are in my MongoDB database?"*\n- *"Send a message to #general on Slack"*\n- *"Search the web for today's AI news and save to Google Sheets"*\n- *"Create a Google Doc called Meeting Notes"*\n\nWhat would you like me to do?`,
      timestamp: new Date(),
    }]);
  };

  const loadConversation = async (convId: string) => {
    try {
      const res = await apiClient.get(`/v1/agent-chat/conversations/${convId}`);
      const conv = res.data.data;
      if (!conv) return;
      setActiveConvId(conv.conversationId);
      const loaded: ChatMessage[] = conv.messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        steps: m.stepsExecuted?.map((s: any, i: number) => ({
          id: `${m.id}_step_${i}`,
          status: s.success ? 'done' : 'error',
          description: s.description,
          preview: s.output,
          error: s.error,
          errorCode: s.errorCode,
        })) || [],
      }));
      setMessages(loaded);
    } catch {
      toast.error('Failed to load conversation');
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await apiClient.delete(`/v1/agent-chat/conversations/${convId}`);
      setConversations(prev => prev.filter(c => c.conversationId !== convId));
      if (activeConvId === convId) startNewConversation();
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isExecuting) return;

    setLastUserMessage(userText);
    setInput('');
    setIsExecuting(true);

    // Cancel previous stream if any
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const userMsgId = `user_${Date.now()}`;
    const agentMsgId = `agent_${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user', content: userText, timestamp: new Date() },
      { id: agentMsgId, role: 'agent', content: '', isStreaming: true, steps: [], timestamp: new Date() },
    ]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v1/agent-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userText, conversationId: activeConvId }),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        const err = await res.json();
        toast.error(err.error === 'EXECUTION_IN_PROGRESS' ? 'An operation is already running. Please wait.' : 'Too many requests. Wait a moment and try again.');
        setMessages(prev => prev.filter(m => m.id !== agentMsgId));
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            handleSSEEvent(event, agentMsgId);
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId
            ? { ...m, isStreaming: false, content: '❌ Connection error. Please check your network and try again.' }
            : m
        ));
      }
    } finally {
      setIsExecuting(false);
      fetchConversations();
    }
  }, [input, isExecuting, activeConvId]);

  const handleSSEEvent = (event: SSEEvent, agentMsgId: string) => {
    switch (event.type) {
      case 'step_start':
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId
            ? {
                ...m,
                steps: [...(m.steps || []), {
                  id: event.stepId!,
                  status: 'running',
                  description: event.description || event.stepId!,
                }],
              }
            : m
        ));
        break;

      case 'step_complete':
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId
            ? {
                ...m,
                steps: (m.steps || []).map(s =>
                  s.id === event.stepId
                    ? { ...s, status: 'done', description: event.description || s.description, preview: event.preview }
                    : s
                ),
              }
            : m
        ));
        break;

      case 'step_error':
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId
            ? {
                ...m,
                steps: (m.steps || []).map(s =>
                  s.id === event.stepId
                    ? { ...s, status: 'error', error: event.error, errorCode: event.errorCode }
                    : s
                ),
              }
            : m
        ));
        break;

      case 'confirmation_required':
        setConfirmation({ message: event.message || 'Are you sure?', confirmationId: event.confirmationId! });
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId ? { ...m, isStreaming: false, content: '' } : m
        ));
        setIsExecuting(false);
        break;

      case 'final_response':
        setMessages(prev => prev.map(m =>
          m.id === agentMsgId
            ? { ...m, isStreaming: false, content: event.message || '' }
            : m
        ));
        break;
    }
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!confirmation) return;
    const { confirmationId } = confirmation;
    setConfirmation(null);
    setIsExecuting(true);

    const agentMsgId = `agent_confirm_${Date.now()}`;
    setMessages(prev => [
      ...prev,
      { id: agentMsgId, role: 'agent', content: '', isStreaming: true, steps: [], timestamp: new Date() },
    ]);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/v1/agent-chat/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: activeConvId, confirmationId, confirmed }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { handleSSEEvent(JSON.parse(line.slice(6)), agentMsgId); } catch {}
        }
      }
    } catch {}
    finally {
      setIsExecuting(false);
    }
  };

  const handleSaveAsWorkflow = (messageId: string) => {
    setSaveWorkflowFor(messageId);
  };

  const confirmSaveWorkflow = async (triggerType: 'schedule' | 'webhook' | 'manual') => {
    if (!saveWorkflowFor) return;
    setSaveWorkflowFor(null);
    try {
      const res = await apiClient.post('/v1/agent-chat/convert-workflow', {
        conversationId: activeConvId,
        messageId: saveWorkflowFor,
        triggerType,
      });
      const { workflowId, name } = res.data.data;
      toast.success(`Workflow "${name}" created!`, { description: 'Opening workflow builder...' });
      setTimeout(() => { window.location.href = `/workflows/${workflowId}`; }, 1200);
    } catch (err: any) {
      toast.error('Failed to create workflow', { description: err?.response?.data?.message || 'Could not convert execution plan to workflow.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#080d14] text-slate-200 overflow-hidden">

      {/* ── Conversations Sidebar ── */}
      {showSidebar && (
        <div className="w-64 bg-[#0c1420] border-r border-slate-800 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" /> Agent Chat
            </h2>
            <button
              onClick={startNewConversation}
              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 transition-colors"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.conversationId}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    activeConvId === conv.conversationId ? 'bg-indigo-500/15 border border-indigo-500/30 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  onClick={() => loadConversation(conv.conversationId)}
                >
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1 truncate">{conv.title || 'Untitled Chat'}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversationId); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top Bar ── */}
        <div className="border-b border-slate-800 bg-[#0a1219]/80 backdrop-blur-sm px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">AutoFlow Agent</h1>
                <p className="text-[11px] text-slate-400">Natural language executor — no workflow setup required</p>
              </div>
            </div>

            {/* Connected Apps Indicator */}
            <div className="flex items-center gap-2 flex-wrap max-w-lg">
              {connectedApps.slice(0, 8).map(app => (
                <div
                  key={app._id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300"
                  title={`${app.name} — Available`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="truncate max-w-[80px]">{app.name.split(' ')[0]}</span>
                </div>
              ))}
              {connectedApps.length > 8 && (
                <span className="text-[10px] text-slate-500">+{connectedApps.length - 8} more</span>
              )}
              {connectedApps.length === 0 && (
                <a href="/connectors" className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Connect apps
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Confirmation Dialog ── */}
        {confirmation && (
          <div className="px-6 py-4 border-b border-amber-500/20 bg-amber-900/10">
            <ConfirmationDialog
              message={confirmation.message}
              onConfirm={() => handleConfirm(true)}
              onCancel={() => handleConfirm(false)}
            />
          </div>
        )}

        {/* ── Message Thread ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSaveAsWorkflow={msg.role === 'agent' && !msg.isStreaming ? handleSaveAsWorkflow : undefined}
              onRetry={msg.role === 'agent' && msg.steps?.some(s => s.status === 'error') ? () => sendMessage(lastUserMessage) : undefined}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Example Prompts (empty state) ── */}
        {messages.length === 1 && (
          <div className="px-6 pb-4 grid grid-cols-2 gap-2">
            {[
              'How many users are in my MongoDB database?',
              'Send a message to Slack #general',
              'Search for today\'s AI news on the web',
              'Create a Google Doc called Meeting Notes',
            ].map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-left px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ChevronRight className="w-3 h-3 inline mr-1 text-indigo-500" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Box ── */}
        <div className="border-t border-slate-800 bg-[#0a1219]/80 px-5 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type anything… ask about your connected apps, query data, send messages, create files…"
              rows={1}
              disabled={isExecuting}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50 transition-colors"
              style={{ maxHeight: '160px' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 160) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isExecuting}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">
            Press <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px]">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>

      {/* ── Save As Workflow Dialog ── */}
      {saveWorkflowFor && (
        <SaveWorkflowDialog
          onConfirm={confirmSaveWorkflow}
          onCancel={() => setSaveWorkflowFor(null)}
        />
      )}
    </div>
  );
}
