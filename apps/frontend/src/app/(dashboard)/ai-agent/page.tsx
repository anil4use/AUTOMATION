'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Heading, Text, SectionCard, Badge } from '@/components/ui';
import { Sparkles, Send, Bot, User, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Workflow, Link as LinkIcon, Trash2 } from 'lucide-react';
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between">
        <div>
          <Heading as="h1" className="flex items-center gap-2">
            <Sparkles className="text-accentPurple" size={24} />
            <span>AI Conversational Workflow Builder</span>
          </Heading>
          <Text variant="secondary" className="text-xs">
            Saved to MongoDB Atlas for <strong className="text-white">{user.email}</strong>. Powered by Groq / Gemini.
          </Text>
        </div>
        <button
          onClick={handleClearHistory}
          className="p-2 rounded-lg bg-white/5 border border-borderColor text-textMuted hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
          title="Clear Chat History from Database"
        >
          <Trash2 size={14} />
          <span>Clear DB Chat</span>
        </button>
      </div>

      {/* Main Chat Stream Box */}
      <SectionCard className="flex-1 flex flex-col p-0 overflow-hidden border-purple-500/30">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-12 gap-2 text-textMuted text-xs">
              <Loader2 size={18} className="animate-spin text-accentPurple" />
              <span>Loading chat history from MongoDB Atlas...</span>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-accentPurple text-white shadow-glow'
                      : 'bg-indigo-500/20 text-accentIndigo border border-indigo-500/30'
                  }`}
                >
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Message Content Bubble */}
                <div className="flex flex-col gap-3">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-accentPurple text-white rounded-tr-none shadow-glow'
                        : 'bg-white/[0.03] border border-borderColor text-white rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Suggested Connectors & Account Connection Verification Badges */}
                  {msg.userConnectionsStatus && msg.userConnectionsStatus.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-borderColor flex flex-col gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-textMuted flex items-center gap-1.5">
                        <LinkIcon size={12} className="text-accentIndigo" />
                        <span>Required Connectors Verification:</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {msg.userConnectionsStatus.map((conn) => (
                          <div
                            key={conn.connectorId}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                              conn.isConnected
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-accentEmerald'
                                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {conn.isConnected ? (
                              <>
                                <CheckCircle2 size={13} />
                                <span>{conn.name} (Connected)</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={13} />
                                <span>{conn.name} (Not Connected)</span>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Flag unauthenticated connectors */}
                      {msg.userConnectionsStatus.some((c) => !c.isConnected) && (
                        <div className="mt-1 pt-2 border-t border-borderColor/60 flex items-center justify-between text-xs text-amber-300">
                          <span>Some required connectors need authentication.</span>
                          <Link href="/connectors" className="text-accentPurple font-semibold hover:underline">
                            Connect Accounts Now →
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Workflow Draft Card */}
                  {msg.workflowDraft && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Workflow size={18} className="text-accentPurple" />
                          <span className="font-semibold text-xs text-white">
                            {msg.workflowDraft.name}
                          </span>
                        </div>
                        <Badge variant="active">AUTO-MAPPED ({msg.workflowDraft.nodes?.length || 0} STEPS)</Badge>
                      </div>

                      <p className="text-xs text-textSecondary">
                        {msg.workflowDraft.description}
                      </p>

                      <button
                        onClick={() => handleOpenCanvasWithDraft(msg.workflowDraft)}
                        className="glow-button py-2 text-xs flex items-center justify-center gap-1.5"
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
            <div className="flex items-center gap-3 self-start">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-accentIndigo flex items-center justify-center border border-indigo-500/30">
                <Bot size={16} />
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-borderColor text-textMuted text-xs flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-accentPurple" />
                <span>AI Agent is mapping workflow &amp; saving to database...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-bgSecondary border-t border-borderColor flex items-center gap-3">
          <input
            type="text"
            placeholder="Type your requirement (e.g. 'Schedule daily 8pm message to girlfriend on WhatsApp')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-bgPrimary border border-borderColor rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-accentPurple transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="glow-button px-4 py-2.5 text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
