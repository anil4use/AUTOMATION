'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Send, Plus, Trash2, CheckCircle, XCircle, Loader2,
  AlertTriangle, Zap, RotateCcw, MessageSquare, Search, Copy, Check,
  Sparkles, Database, Mail, Globe, ChevronDown, ChevronUp,
  Square, SlidersHorizontal, Cpu, ArrowUpRight
} from 'lucide-react';
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

// ─── Markdown Renderer ─────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-800/90 border border-slate-700 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[11px]">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 font-medium underline underline-offset-2 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors">$1 <span class="text-[10px]">↗</span></a>')
    .replace(/^###\s+(.+)$/gm, '<h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400 mt-3 mb-1">$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2 class="text-sm font-bold text-white mt-4 mb-2 border-b border-slate-800 pb-1">$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1 class="text-base font-bold text-white mt-4 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300 list-disc text-xs my-0.5">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-slate-300 list-decimal text-xs my-0.5">$1</li>')
    .replace(/\n\n/g, '</p><p class="mt-2 text-slate-300 leading-relaxed text-xs">')
    .replace(/\n/g, '<br/>');
}

// ─── Step Execution Pipeline Component ─────────────────────────────────────────
function StepPipeline({ steps }: { steps: ExecutionStep[] }) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  if (!steps || steps.length === 0) return null;

  const total = steps.length;
  const completed = steps.filter(s => s.status === 'done').length;
  const hasError = steps.some(s => s.status === 'error');
  const isRunning = steps.some(s => s.status === 'running');

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 shadow-lg backdrop-blur-md mb-2 transition-all">
      {/* Stepper Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Cpu className={`w-3.5 h-3.5 ${isRunning ? 'text-indigo-400 animate-pulse' : hasError ? 'text-rose-400' : 'text-emerald-400'}`} />
            {isRunning && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />}
          </div>
          <span className="text-[11px] font-semibold text-slate-200 uppercase tracking-wider">
            Execution Pipeline ({completed}/{total})
          </span>
        </div>
        <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${hasError ? 'bg-rose-500' : isRunning ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-emerald-500'}`}
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Step items */}
      <div className="space-y-1.5">
        {steps.map((step, idx) => {
          const isExpanded = expandedStepId === step.id;
          return (
            <div
              key={step.id}
              className={`group flex flex-col rounded-lg text-xs border transition-all ${
                step.status === 'running'
                  ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300'
                  : step.status === 'done'
                  ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}
            >
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 flex-shrink-0">
                    {idx + 1}
                  </span>

                  {step.status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 flex-shrink-0" />}
                  {step.status === 'done' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  {step.status === 'error' && <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}

                  <span className="truncate text-[11px] font-medium text-slate-200">{step.description}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {step.preview && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono">
                      JSON
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                </div>
              </div>

              {/* Step Expanded Content / Preview */}
              {isExpanded && (
                <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/60 bg-slate-950/40 rounded-b-lg">
                  {step.error && (
                    <div className="text-rose-400 text-[11px] bg-rose-950/40 p-2 rounded border border-rose-900/50 mb-2 font-mono">
                      {step.error} {step.errorCode && <span className="text-rose-300 font-bold">[{step.errorCode}]</span>}
                    </div>
                  )}

                  {step.preview ? (
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span>Output Data Payload</span>
                      </div>
                      <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-indigo-200 font-mono overflow-x-auto max-h-36">
                        {typeof step.preview === 'object' ? JSON.stringify(step.preview, null, 2) : String(step.preview)}
                      </pre>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">No output payload generated</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start group`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-md transition-transform group-hover:scale-105 ${
        isUser
          ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-2 ring-indigo-500/20'
          : 'bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 text-white ring-2 ring-purple-500/20'
      }`}>
        {isUser ? 'U' : <Bot className="w-4.5 h-4.5" />}
      </div>

      <div className={`max-w-[82%] sm:max-w-[78%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Timestamp */}
        <span className="text-[10px] text-slate-500 px-1 font-mono">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Execution steps */}
        {message.steps && message.steps.length > 0 && (
          <StepPipeline steps={message.steps} />
        )}

        {/* Message Bubble Card */}
        <div className={`relative rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-lg backdrop-blur-md transition-all ${
          isUser
            ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-xs border border-indigo-400/30'
            : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs hover:border-slate-700/80 shadow-black/40'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.isStreaming ? (
            <div className="flex items-center gap-2.5 py-1 text-slate-400">
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <Sparkles className="w-2.5 h-2.5 text-purple-400 absolute animate-pulse" />
              </div>
              <span className="text-xs font-medium text-slate-300">Processing live request...</span>
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
          )}
        </div>

        {/* Action Toolbar for Agent messages */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-1.5 pt-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 transition-all"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onSaveAsWorkflow && (
              <button
                onClick={() => onSaveAsWorkflow(message.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 transition-all"
              >
                <Zap className="w-3 h-3 text-indigo-400" /> Convert to Workflow
              </button>
            )}

            {message.steps?.some(s => s.status === 'error') && onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all"
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
    <div className="mx-auto max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Safety Confirmation Required</h3>
          <p className="text-[11px] text-slate-400">Destructive operation detected</p>
        </div>
      </div>
      <p className="text-xs text-slate-300 mb-5 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono">
        {message}
      </p>
      <div className="flex gap-2.5 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
        >
          Abort Request
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-900/30 transition-all"
        >
          Yes, Execute Action
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl w-full max-w-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Save as Workflow</h3>
            <p className="text-[11px] text-slate-400">Convert execution steps into automation</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Select trigger mechanism to convert this execution history into a reusable, scheduled workflow:
        </p>

        <div className="space-y-2 mb-5">
          {(['schedule', 'webhook', 'manual'] as const).map((t) => (
            <label
              key={t}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                triggerType === t
                  ? 'border-indigo-500/60 bg-indigo-500/15 text-indigo-200 shadow-md shadow-indigo-950/50'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <input type="radio" className="hidden" checked={triggerType === t} onChange={() => setTriggerType(t)} />
              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${triggerType === t ? 'border-indigo-400 bg-indigo-400' : 'border-slate-600'}`}>
                {triggerType === t && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold capitalize text-white">
                  {t === 'manual' ? 'Manual Trigger (On-Demand)' : t === 'schedule' ? 'Scheduled Cron Job' : 'HTTP Webhook Endpoint'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {t === 'manual' ? 'Run manually via dashboard or API' : t === 'schedule' ? 'Run automatically on cron timer' : 'Trigger via incoming HTTP requests'}
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(triggerType)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Agent Chat Page Component ────────────────────────────────────────────
export default function AgentChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [confirmation, setConfirmation] = useState<{ message: string; confirmationId: string } | null>(null);
  const [saveWorkflowFor, setSaveWorkflowFor] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations & connected apps on mount
  useEffect(() => {
    fetchConversations();
    fetchConnectedApps();
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
      content: `### Welcome to AutoFlow Dynamic Agent Chat! ⚡\n\nI have live, direct execution access across all your connected apps. Ask any question or request real actions — zero manual workflow configuration needed.\n\nTry asking me:\n- *"How many users are in my MongoDB database?"*\n- *"Send an email to anil@example.com with title Hello"* \n- *"Post a status message to #general on Slack"*\n- *"Fetch GitHub repos or search the web for latest AI news"`,
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
            ? { ...m, isStreaming: false, content: '❌ Connection error. Please check your network connection.' }
            : m
        ));
      }
    } finally {
      setIsExecuting(false);
      fetchConversations();
    }
  }, [input, isExecuting, activeConvId]);

  const stopExecution = () => {
    abortRef.current?.abort();
    setIsExecuting(false);
    toast.info('Execution cancelled');
  };

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
      toast.error('Failed to create workflow', { description: err?.response?.data?.message || 'Could not convert execution plan.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredConversations = conversations.filter(c =>
    (c.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#080d16] text-slate-200 overflow-hidden font-sans">

      {/* ── Left Sidebar (Conversations Hub) ── */}
      {showSidebar && (
        <div className="w-72 bg-[#0b121f] border-r border-slate-800/80 flex flex-col flex-shrink-0 z-20 backdrop-blur-xl">
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-white tracking-wide">Agent Sessions</h2>
                <p className="text-[10px] text-slate-400">Live AI Execution History</p>
              </div>
            </div>

            <button
              onClick={startNewConversation}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-900/30"
              title="Start New Agent Chat"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Search box */}
          <div className="px-3 py-2.5 border-b border-slate-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search history..."
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-400">No active sessions</p>
                <p className="text-[10px] text-slate-600 mt-1">Start a conversation to execute live integrations.</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = activeConvId === conv.conversationId;
                return (
                  <div
                    key={conv.conversationId}
                    onClick={() => loadConversation(conv.conversationId)}
                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/40 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full" />}
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="flex-1 truncate font-medium">{conv.title || 'Untitled Session'}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversationId); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-400 transition-all text-slate-500"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Integration Widget */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Active Apps</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                {connectedApps.length} Connected
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* ── Header Toolbar ── */}
        <div className="border-b border-slate-800/80 bg-[#0a111c]/90 backdrop-blur-xl px-5 py-3 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Toggle Sidebar"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 p-0.5 shadow-md shadow-purple-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Bot className="w-4.5 h-4.5 text-indigo-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white tracking-wide">AutoFlow Dynamic Agent</h1>
                  <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Executor
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Directly operates connected apps via natural language</p>
              </div>
            </div>

            {/* Connected App Chips Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-md py-1 no-scrollbar">
              {connectedApps.map(app => (
                <div
                  key={app._id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 flex-shrink-0 shadow-sm"
                  title={`${app.name} is ready for execution`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="font-medium">{app.name.split(' ')[0]}</span>
                </div>
              ))}
              {connectedApps.length === 0 && (
                <a
                  href="/connectors"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs hover:bg-amber-500/20 transition-all font-medium"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Connect Integration Apps
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Confirmation Banner ── */}
        {confirmation && (
          <div className="p-4 border-b border-amber-500/30 bg-amber-950/20 backdrop-blur-md">
            <ConfirmationDialog
              message={confirmation.message}
              onConfirm={() => handleConfirm(true)}
              onCancel={() => handleConfirm(false)}
            />
          </div>
        )}

        {/* ── Message History Stream ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSaveAsWorkflow={msg.role === 'agent' && !msg.isStreaming ? (id) => setSaveWorkflowFor(id) : undefined}
              onRetry={msg.role === 'agent' && msg.steps?.some(s => s.status === 'error') ? () => sendMessage(lastUserMessage) : undefined}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Empty State Hero Inspiration Cards ── */}
        {messages.length === 1 && (
          <div className="px-6 pb-4 max-w-4xl mx-auto w-full">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Suggested Real-World Prompt Actions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { title: 'MongoDB Database', query: 'How many users are in my MongoDB database?', icon: Database, color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
                { title: 'Gmail Inbox', query: 'Let me know who sent me the last email?', icon: Mail, color: 'from-rose-500/20 to-orange-500/20 text-rose-400 border-rose-500/30' },
                { title: 'Slack Messaging', query: 'Send a message to general channel on Slack', icon: MessageSquare, color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30' },
                { title: 'GitHub Repos', query: 'Get all repositories from GitHub', icon: Globe, color: 'from-indigo-500/20 to-cyan-500/20 text-indigo-400 border-indigo-500/30' },
              ].map((card, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(card.query)}
                  className={`text-left p-3 rounded-2xl border bg-gradient-to-br ${card.color} bg-slate-900/60 hover:bg-slate-800/80 transition-all group flex flex-col justify-between shadow-lg hover:-translate-y-0.5`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <card.icon className="w-4 h-4" />
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">{card.title}</span>
                    <span className="text-xs text-slate-200 line-clamp-2 mt-0.5 font-medium">{card.query}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Floating Prompt Input Bar ── */}
        <div className="border-t border-slate-800/80 bg-[#080e18]/95 backdrop-blur-2xl px-4 sm:px-6 py-4">
          {/* Action Quick Chips */}
          <div className="flex items-center gap-2 mb-2.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider flex-shrink-0">Quick Action:</span>
            {[
              { label: '🗄️ Query DB', text: 'How many users are in my MongoDB database?' },
              { label: '✉️ Send Email', text: 'send a email to email@example.com title Hello message Hi there' },
              { label: '💬 Slack Msg', text: 'Send a message to general channel on Slack' },
              { label: '🌐 Web Search', text: 'Search for today\'s AI news on the web' },
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => setInput(chip.text)}
                className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-400 hover:text-slate-200 transition-all flex-shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Box Card */}
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-xl transition-all p-1.5 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... query databases, send emails, post messages, create docs or export sheets..."
              rows={1}
              disabled={isExecuting}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-100 placeholder-slate-500 resize-none focus:outline-none disabled:opacity-50 font-sans"
              style={{ maxHeight: '140px' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 140) + 'px';
              }}
            />

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0 pb-1 pr-1">
              {isExecuting ? (
                <button
                  onClick={stopExecution}
                  className="w-8 h-8 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/40 flex items-center justify-center transition-all"
                  title="Stop execution"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white flex items-center justify-center shadow-md shadow-indigo-900/30 transition-all group"
                  title="Send request"
                >
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 mt-2 text-center flex items-center justify-center gap-3">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px] border border-slate-700">Enter</kbd> to execute</span>
            <span>•</span>
            <span><kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px] border border-slate-700">Shift + Enter</kbd> for line break</span>
          </p>
        </div>
      </div>

      {/* ── Save As Workflow Modal ── */}
      {saveWorkflowFor && (
        <SaveWorkflowDialog
          onConfirm={confirmSaveWorkflow}
          onCancel={() => setSaveWorkflowFor(null)}
        />
      )}
    </div>
  );
}
