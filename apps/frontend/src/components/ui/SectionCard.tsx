import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SectionCard({ className, children, ...props }: SectionCardProps) {
  return (
    <div className={cn('glass-card p-6', className)} {...props}>
      {children}
    </div>
  );
}
