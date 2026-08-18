'use client';
import React from 'react';
import { Zap, Bell, User } from 'lucide-react';

export function Navbar() {
  return (
    <header className="h-16 border-b border-borderColor bg-bgSecondary flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-gradient-glow flex items-center justify-center shadow-glow">
          <Zap size={20} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">
          AutoFlow <span className="text-accentPurple text-xs font-semibold">AI PLATFORM</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button className="bg-transparent border border-borderColor text-textSecondary hover:text-white p-2 rounded-md transition-colors flex items-center gap-2">
          <Bell size={16} />
        </button>
        <div className="w-9 h-9 rounded-full bg-accentIndigo flex items-center justify-center font-semibold text-sm text-white">
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
