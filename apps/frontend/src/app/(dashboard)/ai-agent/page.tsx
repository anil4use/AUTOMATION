'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Heading, Text, SectionCard, Badge } from '@/components/ui';
import { Sparkles, Send, Bot, User, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Workflow, Link as LinkIcon, Trash2, Key, Lock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUserRole } from '@/context/UserRoleContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isGreeting?: boolean;
  suggestedConnectors?: string[];
  userConnectionsStatus?: Array<{ connectorId: string; name: string; isConnected: boolean }>;
  workflowDraft?: any;
}

interface InlineConnectCardProps {
  connectorId: string;
  name: string;
  onSuccess: (connectorId: string) => void;
}

function InlineConnectCard({ connectorId, name, onSuccess }: InlineConnectCardProps) {
  const [key, setKey] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setConnecting(true);
    try {
      await apiClient.post('/v1/connectors/connections/api-key', {
        connectorId,
        name: `${name} (Verified via AI Chat)`,
        apiKey: key.trim(),
      });
      toast.success(`${name} Verified & Connected!`, {
        description: 'Credentials encrypted via AES-256 in MongoDB Atlas.',
      });
      onSuccess(connectorId);
    } catch (err: any) {
      toast.error(`Verification Failed`, {
        description: err?.response?.data?.message || 'Invalid credentials.',
      });
    } finally {
      setConnecting(false);
    }
  };

  return (
    <form onSubmit={handleConnect} className="mt-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
          <Key size={13} className="text-amber-400" />
          <span>Connect {name} inline:</span>
        </div>
        <Link
          href="/connectors"
          target="_blank"
          className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
        >
          <span>Guide</span>
          <ExternalLink size={10} />
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={`Enter secret key / token for ${connectorId.toUpperCase()}...`}
          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
          className="flex-1 px-3 py-1.5 bg-[#0f172a] border border-amber-500/40 rounded-lg text-xs text-white placeholder:text-slate-400 outline-none focus:border-amber-400 font-mono text-[11px]"
          required
        />
        <button
          type="submit"
          disabled={connecting || !key.trim()}
          className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
        >
          {connecting ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
          <span>Verify &amp; Connect</span>
        </button>
      </div>
    </form>
  );
}

export default function AIAgentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  const { user } = useUserRole();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your AutoFlow AI Assistant. Describe what you'd like to automate (e.g. *'Schedule a daily message at 8pm to my girlfriend via WhatsApp'* or *'When a new email arrives in Gmail, summarize it with AI and send a notification to Slack'*), and I will help you design and build the workflow!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const initialSentRef = useRef(false);

  // Fetch persistent chat history from MongoDB Atlas for the authenticated user
  useEffect(() => {
    async function loadDbChatHistory() {
      try {
        setIsLoadingHistory(true);
        const res = await apiClient.get('/v1/ai-agent/chat-history');
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setMessages(res.data.data);
        }
      } catch (e) {
        console.error('Error fetching chat history from MongoDB:', e);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadDbChatHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && !initialSentRef.current && !isLoadingHistory) {
      initialSentRef.current = true;
      setInput(initialPrompt);
      setTimeout(() => {
        handleSendMessageDirect(initialPrompt);
      }, 300);
    }
  }, [initialPrompt, isLoadingHistory]);

  const handleSendMessageDirect = async (promptText: string) => {
    if (!promptText.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: promptText.trim(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsProcessing(true);

    try {
      // Send chat history to Express API + MongoDB Atlas
      const res = await apiClient.post('/v1/ai-agent/chat', {
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
      });

      const data = res.data.data;

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: data.replyMessage || 'I have analyzed your request.',
        isGreeting: data.isGreeting,
        suggestedConnectors: data.suggestedConnectors,
        userConnectionsStatus: data.userConnectionsStatus,
        workflowDraft: data.workflowDraft,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      toast.error('AI Processing Error', {
        description: err?.response?.data?.message || 'Could not communicate with AI service.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSendMessageDirect(input);
  };

  const handleClearHistory = async () => {
    try {
      await apiClient.delete('/v1/ai-agent/chat-history');
      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: "Chat history cleared from MongoDB Atlas. What workflow would you like to build next?",
      };
      setMessages([welcomeMsg]);
      toast.info('Chat History Cleared from Database');
    } catch (e) {
      toast.error('Failed to clear chat history');
    }
  };

  const handleOpenCanvasWithDraft = (draft: any) => {
    if (!draft) return;
    try {
      localStorage.setItem('autoflow_draft_workflow', JSON.stringify(draft));
      toast.success('AI Workflow Mapped & Ready!', {
        description: `Loading ${draft.nodes?.length || 0} pre-configured steps onto the builder canvas...`,
      });
      router.push('/workflows/new?draft=true');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto h-[calc(100vh-6.5rem)]">
      {/* Sleek Copilot Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-glow">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <Heading as="h1" className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-purple-300">
                AI Conversational Copilot Studio
              </Heading>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-accentEmerald flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gemini 3.6 Flash / Groq Active</span>
              </span>
            </div>
            <Text variant="secondary" className="text-[11px]">
              Persistent MongoDB Atlas Chat History &amp; Execution Inspector for <strong className="text-purple-300 font-semibold">{user.email}</strong>
            </Text>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSendMessageDirect('Check my execution error logs and diagnose recent workflow failures')}
            className="px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Inspect Runtime Execution Logs"
          >
            <Workflow size={14} className="text-indigo-400" />
            <span>Inspect Logs</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-textMuted hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Clear Chat History from Database"
          >
            <Trash2 size={14} />
            <span>Clear DB</span>
          </button>
        </div>
      </div>

      {/* Main Chat Stream Container Card */}
      <div className="flex-1 flex flex-col rounded-2xl bg-gradient-to-b from-bgSecondary/90 via-bgSecondary/70 to-bgSecondary/90 border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-16 gap-3 text-textMuted text-xs">
              <Loader2 size={20} className="animate-spin text-accentPurple" />
              <span>Syncing chat history from MongoDB Atlas...</span>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl animate-fadeIn ${
                  msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-glow'
                      : 'bg-indigo-500/20 text-accentIndigo border border-indigo-500/30'
                  }`}
                >
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Message Content Bubble */}
                <div className="flex flex-col gap-3 max-w-2xl">
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-glow font-medium'
                        : 'bg-white/[0.03] border border-white/10 text-slate-200 rounded-tl-none backdrop-blur-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Suggested Connectors & Account Connection Verification Badges */}
                  {msg.userConnectionsStatus && msg.userConnectionsStatus.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md flex flex-col gap-3 shadow-md">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <LinkIcon size={13} className="text-accentIndigo" />
                        <span>Required Connectors &amp; Account Status:</span>
                      </div>

                      <div className="flex flex-col gap-2">
                        {msg.userConnectionsStatus.map((conn) => (
                          <div key={conn.connectorId} className="flex flex-col gap-1">
                            <div
                              className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm ${
                                conn.isConnected
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-accentEmerald'
                                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {conn.isConnected ? (
                                  <>
                                    <CheckCircle2 size={14} className="text-accentEmerald" />
                                    <span>{conn.name}</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle size={14} className="text-amber-400" />
                                    <span>{conn.name}</span>
                                  </>
                                )}
                              </div>
                              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/20">
                                {conn.isConnected ? 'CONNECTED 🟢' : 'NOT CONNECTED ⚠️'}
                              </span>
                            </div>

                            {/* Inline In-Chat Connection Card if Not Connected */}
                            {!conn.isConnected && (
                              <InlineConnectCard
                                connectorId={conn.connectorId}
                                name={conn.name}
                                onSuccess={(connectedCid) => {
                                  setMessages((prevMsgs) =>
                                    prevMsgs.map((m) => {
                                      if (m.id === msg.id && m.userConnectionsStatus) {
                                        return {
                                          ...m,
                                          userConnectionsStatus: m.userConnectionsStatus.map((c) =>
                                            c.connectorId === connectedCid ? { ...c, isConnected: true } : c
                                          ),
                                        };
                                      }
                                      return m;
                                    })
                                  );
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Workflow Draft Card */}
                  {msg.workflowDraft && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border border-purple-500/40 flex flex-col gap-3 shadow-xl backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Workflow size={18} className="text-accentPurple animate-pulse" />
                          <span className="font-bold text-xs text-white">
                            {msg.workflowDraft.name}
                          </span>
                        </div>
                        <Badge variant="active">AUTO-MAPPED ({msg.workflowDraft.nodes?.length || 0} STEPS)</Badge>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {msg.workflowDraft.description}
                      </p>

                      <button
                        onClick={() => handleOpenCanvasWithDraft(msg.workflowDraft)}
                        className="glow-button py-2.5 text-xs flex items-center justify-center gap-2 font-semibold shadow-lg hover:scale-[1.01] transition-transform"
                      >
                        <span>Open Builder Canvas &amp; Activate All Steps</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isProcessing && (
            <div className="flex items-center gap-3 self-start animate-fadeIn">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-accentIndigo flex items-center justify-center border border-indigo-500/30">
                <Bot size={16} />
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-slate-300 text-xs flex items-center gap-2.5 shadow-md">
                <Loader2 size={16} className="animate-spin text-accentPurple" />
                <span>AI Copilot is processing request &amp; compiling DAG JSON...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Category Prompt Chips */}
        <div className="px-4 py-2 bg-black/20 border-t border-white/10 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-textMuted font-bold shrink-0 flex items-center gap-1.5">
            <Sparkles size={12} className="text-accentPurple" />
            <span>Prompt Ideas:</span>
          </span>
          <button
            type="button"
            onClick={() => handleSendMessageDirect('Search for React developer jobs, analyze with AI, and log to Google Sheets')}
            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/60 text-slate-300 hover:text-white hover:bg-purple-500/10 transition-all shrink-0 font-medium"
          >
            🚀 React Jobs &rarr; Google Sheets
          </button>
          <button
            type="button"
            onClick={() => handleSendMessageDirect('When a new email arrives in Gmail, summarize with AI and send to Slack')}
            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/60 text-slate-300 hover:text-white hover:bg-purple-500/10 transition-all shrink-0 font-medium"
          >
            📩 Gmail &rarr; AI &rarr; Slack
          </button>
          <button
            type="button"
            onClick={() => handleSendMessageDirect('Schedule a daily WhatsApp message at 8pm')}
            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/60 text-slate-300 hover:text-white hover:bg-purple-500/10 transition-all shrink-0 font-medium"
          >
            💬 Daily WhatsApp Schedule
          </button>
          <button
            type="button"
            onClick={() => handleSendMessageDirect('What 55+ connectors do you support and how do I connect MongoDB Atlas?')}
            className="px-3 py-1 rounded-full bg-white/5 border border-white/10 hover:border-purple-500/60 text-slate-300 hover:text-white hover:bg-purple-500/10 transition-all shrink-0 font-medium"
          >
            ❓ Supported Connectors &amp; Setup
          </button>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#090d16] border-t border-white/10 flex items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              placeholder="Describe what you'd like to automate (e.g. 'Schedule daily WhatsApp message at 8pm')..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
              className="w-full bg-[#0f172a] border border-purple-500/30 rounded-xl px-4 py-3.5 text-xs text-white placeholder:text-slate-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all disabled:opacity-50 font-medium shadow-inner caret-purple-400"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="glow-button px-6 py-3.5 text-xs flex items-center gap-2 shadow-xl disabled:opacity-50 font-bold shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl"
          >
            <span>Send Prompt</span>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
