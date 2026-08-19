'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useUserRole } from '@/context/UserRoleContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoadingSession } = useUserRole();

  // Route guard — redirect unauthenticated users only AFTER session restoration check completes
  useEffect(() => {
    if (!isLoadingSession && !user.isAuthenticated) {
      router.replace('/login');
    }
  }, [user.isAuthenticated, isLoadingSession, router]);

  // Show loading spinner while reading session cookies/storage
  if (isLoadingSession || !user.isAuthenticated) {
    return (
      <div className="min-h-screen bg-bgPrimary flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accentPurple border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-textMuted font-mono">Restoring session...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-bgPrimary p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
