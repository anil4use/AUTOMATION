import '../styles/globals.css';
import React from 'react';

export const metadata = {
  title: 'AutoFlow — AI Automation Platform',
  description: 'Next-Generation AI-Native Workflow Automation Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
