'use client';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useUserRole } from '@/context/UserRoleContext';
import { getSocketClient } from '@/lib/socket-client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoadingSession } = useUserRole();

  const isChatPage = pathname === '/agent-chat';

  // Route guard — redirect unauthenticated users only AFTER session restoration check completes
  useEffect(() => {
    if (!isLoadingSession && !user.isAuthenticated) {
      router.replace('/login');
    }
  }, [user.isAuthenticated, isLoadingSession, router]);

  // Global Socket.IO listener for connection auth expiration warnings
  useEffect(() => {
    if (user.isAuthenticated) {
      const socket = getSocketClient();
      socket.emit('join_org', user.organizationId || 'unknown');

      const handleAuthExpired = (data: { connectionId: string; connectorId: string; name?: string }) => {
        console.warn(`[Socket.IO] OAuth token expired for connection ${data.connectionId} (${data.connectorId})`);
        alert(`⚠️ Action Required: Authentication for ${data.name || data.connectorId} has expired. Please re-authenticate on the Connections page.`);
      };

      socket.on('connection:auth_expired', handleAuthExpired);

      return () => {
        socket.off('connection:auth_expired', handleAuthExpired);
      };
    }
  }, [user.isAuthenticated, user.organizationId]);

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
        <main className={`flex-1 ${isChatPage ? 'overflow-hidden p-0' : 'overflow-y-auto p-6'} bg-bgPrimary`}>
          {children}
        </main>
      </div>
    </div>
  );
}
