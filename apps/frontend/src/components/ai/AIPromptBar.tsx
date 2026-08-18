'use client';
import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface AIPromptBarProps {
  onGenerate?: (prompt: string) => void;
}

export function AIPromptBar({ onGenerate }: AIPromptBarProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && onGenerate) {
      onGenerate(prompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card flex items-center p-2 px-4 gap-3 border-purple-500/40 shadow-purpleGlow">
      <Sparkles className="text-accentPurple" size={20} />
      <input
        type="text"
        placeholder='Describe your automation (e.g. "When a new lead arrives in WhatsApp, summarize it and notify Slack")...'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-textMuted"
      />
      <button type="submit" className="glow-button flex items-center gap-1.5 text-xs">
        <span>Generate</span>
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
