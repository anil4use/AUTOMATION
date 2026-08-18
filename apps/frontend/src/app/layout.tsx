import '../styles/globals.css';
import React from 'react';
import { Toaster } from 'sonner';
import { UserRoleProvider } from '@/context/UserRoleContext';

export const metadata = {
  title: 'AutoFlow — AI Automation Platform',
  description: 'Next-Generation AI-Native Workflow Automation Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bgPrimary text-textPrimary antialiased">
        <UserRoleProvider>
          {children}
          <Toaster theme="dark" position="top-right" richColors closeButton />
        </UserRoleProvider>
      </body>
    </html>
  );
}
