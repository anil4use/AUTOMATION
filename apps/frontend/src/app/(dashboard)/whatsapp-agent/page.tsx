'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle, Send, Plus, Sparkles, Bot, User,
  CheckCheck, Clock, ChevronDown, Trash2, Cpu,
  AlertCircle, Loader2, Settings2, Brain, RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered';
}

interface Automation {
  _id: string;
  name: string;
  agentPersonality: string;
  enabled: boolean;
  enableLongTermMemory: boolean;
}

interface SimulateResponse {
  reply: string;
  conversationId: string;
  memoryFacts: number;
  historyLength: number;
}

// ── Default Personalities ─────────────────────────────────────────────────────

const PRESET_PERSONALITIES = [
  {
    label: 'Friendly Assistant',
    value: `You are a warm, friendly personal assistant communicating over WhatsApp.
- Keep messages short and natural (2-3 sentences max).
- Ask one follow-up question at a time.
- Use the user's name if you know it.
- Never use bullet points or markdown — plain conversational text only.
- Be genuinely curious about the user's life and goals.`,
  },
  {
    label: 'Customer Support',
    value: `You are a helpful customer support agent for a tech company, chatting via WhatsApp.
- Be professional but friendly.
- Resolve issues concisely without unnecessary jargon.
- Ask clarifying questions one at a time.
- If you cannot help, offer to escalate.`,
  },
  {
    label: 'Life Coach',
    value: `You are an empathetic life coach helping people with their daily routines, goals, and habits.
- Ask thoughtful questions about the user's routine and aspirations.
- Remember what they tell you across conversations.
- Celebrate small wins.
- Keep messages warm and encouraging.`,
  },
  {
    label: 'Sales Agent',
    value: `You are a friendly sales agent following up with leads over WhatsApp.
- Be conversational, not pushy.
- Ask about their needs before pitching anything.
- Build rapport naturally.
- Follow up on what they mentioned in earlier conversations.`,
  },
];

// ── WhatsApp Chat Bubble ──────────────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-1`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 mb-1">
          <Bot size={14} className="text-white" />
        </div>
      )}

      {/* Bubble */}
      <div className={`max-w-[72%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-[#005c4b] text-white rounded-tr-sm'
              : 'bg-[#1f2937] text-gray-100 rounded-tl-sm border border-white/5'
          }`}
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
        >
          {message.content}
        </div>

        {/* Timestamp + status */}
        <div className={`flex items-center gap-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] text-gray-500">{time}</span>
          {isUser && (
            message.status === 'sending'
              ? <Clock size={10} className="text-gray-500" />
              : <CheckCheck size={10} className="text-blue-400" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-1">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-white" />
      </div>
      <div className="bg-[#1f2937] border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Setup Panel ───────────────────────────────────────────────────────────────

function SetupPanel({ onCreated }: { onCreated: (a: Automation) => void }) {
  const [name, setName] = useState('My AI Agent');
  const [personality, setPersonality] = useState(PRESET_PERSONALITIES[0].value);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/v1/wa/automations/quick-create', {
        name: name.trim(),
        agentPersonality: personality,
      });
      onCreated({
        _id: res.data.data.automationId,
        name: res.data.data.name,
        agentPersonality: res.data.data.agentPersonality,
        enabled: true,
        enableLongTermMemory: true,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
            <MessageCircle size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Create Your AI Agent</h2>
          <p className="text-sm text-gray-400">No WhatsApp credentials needed — test the agent right here in your browser</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#111827] border border-white/8 rounded-2xl p-6 space-y-5">

          {/* Agent Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Agent Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Customer Support Bot"
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Personality Presets */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Personality Preset</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESET_PERSONALITIES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedPreset(i); setPersonality(p.value); }}
                  className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${
                    selectedPreset === i
                      ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 font-semibold'
                      : 'bg-white/3 border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Personality */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Agent Personality
              <span className="ml-2 text-gray-600 normal-case font-normal">(customize freely)</span>
            </label>
            <textarea
              value={personality}
              onChange={e => { setPersonality(e.target.value); setSelectedPreset(-1); }}
              rows={5}
              className="w-full bg-[#0b0f19] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200"
            style={{ boxShadow: loading ? 'none' : '0 0 20px rgba(16,185,129,0.3)' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
            {loading ? 'Creating Agent...' : 'Launch Chat Simulator'}
          </button>
        </div>

        {/* Info note */}
        <p className="text-center text-xs text-gray-600 mt-4">
          💡 The agent uses Gemini/Groq AI, remembers facts across conversations, and behaves exactly as it would on WhatsApp.
        </p>
      </div>
    </div>
  );
}

// ── Memory Panel ──────────────────────────────────────────────────────────────

function MemoryPanel({ facts }: { facts: number }) {
  if (facts === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-xs text-purple-300">
      <Brain size={12} />
      <span>{facts} memory fact{facts !== 1 ? 's' : ''} stored</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WhatsAppAgentPage() {
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [memoryFacts, setMemoryFacts] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !automation || isTyping) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError('');

    try {
      const res = await apiClient.post('/v1/wa/simulate', {
        automationId: automation._id,
        message: userMessage.content,
        simulatedUserId: 'sim_user_browser',
      });

      const data: SimulateResponse = res.data.data;

      // Mark user message as delivered
      setMessages(prev =>
        prev.map(m => m.id === userMessage.id ? { ...m, status: 'delivered' } : m)
      );

      // Add agent reply
      const agentMessage: Message = {
        id: `agent_${Date.now()}`,
        role: 'agent',
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMessage]);
      setMemoryFacts(data.memoryFacts);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to get response. Is the backend running?');
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setMemoryFacts(0);
    setError('');
  };

  const resetAll = () => {
    setAutomation(null);
    setMessages([]);
    setMemoryFacts(0);
    setError('');
  };

  // ── Setup Screen ─────────────────────────────────────────────────────────────
  if (!automation) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <MessageCircle size={18} className="text-white" />
              </div>
              WhatsApp Agent Simulator
            </h1>
            <p className="text-sm text-gray-400 mt-1">Test your AI agent without a real WhatsApp number</p>
          </div>
        </div>

        <div className="flex-1 bg-[#0b0f19] rounded-2xl border border-white/8 overflow-hidden flex">
          <SetupPanel onCreated={setAutomation} />
        </div>
      </div>
    );
  }

  // ── Chat Screen ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            WhatsApp Agent Simulator
          </h1>
          <p className="text-sm text-gray-400 mt-1">Chatting with <span className="text-white font-medium">{automation.name}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <MemoryPanel facts={memoryFacts} />
          <button onClick={resetChat} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all">
            <RefreshCw size={12} /> Clear Chat
          </button>
          <button onClick={resetAll} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all">
            <Plus size={12} /> New Agent
          </button>
        </div>
      </div>

      {/* WhatsApp-style chat window */}
      <div className="flex-1 rounded-2xl border border-white/8 overflow-hidden flex flex-col min-h-0"
        style={{ background: 'linear-gradient(180deg, #0d1117 0%, #111827 100%)' }}>

        {/* Chat Header (like WhatsApp) */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-shrink-0"
          style={{ background: 'rgba(17,24,39,0.95)', backdropFilter: 'blur(8px)' }}>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#111827]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{automation.name}</p>
            <p className="text-xs text-emerald-400">AI Agent · Online</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>

        {/* Settings Drawer */}
        {showSettings && (
          <div className="border-b border-white/8 px-4 py-3 bg-[#111827]/80 flex-shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Agent Personality</p>
            <p className="text-xs text-gray-400 leading-relaxed font-mono bg-black/30 rounded-lg p-3 whitespace-pre-wrap">
              {automation.agentPersonality}
            </p>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0" id="chat-messages"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}>

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Say hello to your AI Agent!</p>
                <p className="text-xs text-gray-500 max-w-xs">
                  Start a conversation. The agent will remember what you tell it across sessions using long-term memory.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 w-full max-w-xs">
                {['Hey! What can you help me with?', 'I usually wake up at 7am', 'Tell me about yourself'].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-xs px-4 py-2.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/20 text-gray-400 hover:text-white transition-all text-left">
                    💬 {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(msg => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 mx-auto max-w-sm text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 my-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area (WhatsApp-style) */}
        <div className="px-4 py-3 border-t border-white/8 flex-shrink-0"
          style={{ background: 'rgba(17,24,39,0.95)' }}>
          <div className="flex items-end gap-3">
            <div className="flex-1 bg-[#1f2937] border border-white/8 rounded-2xl px-4 py-2.5 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={isTyping}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none leading-relaxed disabled:opacity-50"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={{ boxShadow: input.trim() && !isTyping ? '0 0 16px rgba(16,185,129,0.4)' : 'none' }}
            >
              {isTyping
                ? <Loader2 size={18} className="text-white animate-spin" />
                : <Send size={18} className="text-white" />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-700 mt-2">
            Press Enter to send · Shift+Enter for new line · Replies powered by Gemini / Groq
          </p>
        </div>
      </div>
    </div>
  );
}
