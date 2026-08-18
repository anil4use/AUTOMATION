'use client';
import React from 'react';
import { Zap, Bell, User, Crown, LogOut } from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function Navbar() {
  const { user, toggleRole, logout } = useUserRole();
  const router = useRouter();

  const handleToggleRole = () => {
    toggleRole();
    const newRole = user.role === 'admin' ? 'MEMBER (User)' : 'ADMIN';
    toast.info(`Switched Active Role to ${newRole}`, {
      description: `Dashboard metrics and settings controls updated for ${newRole} role.`,
    });
  };

  const handleLogout = () => {
    logout();
    toast.error('Logged Out', { description: 'Session ended. Redirecting to login...' });
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-borderColor bg-bgSecondary flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-gradient-glow flex items-center justify-center shadow-glow">
          <Zap size={20} className="text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">
          AutoFlow <span className="text-accentPurple text-xs font-semibold">AI PLATFORM</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Interactive Role Switcher Toggle Pill */}
        <button
          onClick={handleToggleRole}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shadow ${
            user.role === 'admin'
              ? 'bg-purple-500/15 border-purple-500/30 text-accentPurple hover:bg-purple-500/25'
              : 'bg-indigo-500/15 border-indigo-500/30 text-accentIndigo hover:bg-indigo-500/25'
          }`}
          title="Click to Switch Role (ADMIN <-> MEMBER)"
        >
          {user.role === 'admin' ? <Crown size={14} className="text-amber-400" /> : <User size={14} />}
          <span>ROLE: {user.role.toUpperCase()}</span>
          <span className="text-[10px] text-textMuted font-normal">(Click to Switch)</span>
        </button>

        <button className="bg-transparent border border-borderColor text-textSecondary hover:text-white p-2 rounded-md transition-colors flex items-center gap-2">
          <Bell size={16} />
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
          <div className="w-7 h-7 rounded-full bg-accentIndigo flex items-center justify-center font-bold text-xs text-white">
            {user.name ? user.name.slice(0, 2).toUpperCase() : 'AA'}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight">{user.name}</span>
            <span className="text-[10px] text-textMuted leading-none">{user.email}</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          title="Log Out of AutoFlow"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
