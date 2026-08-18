import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'active' | 'draft' | 'failed' | 'info';
}

export function Badge({ variant = 'active', className, children, ...props }: BadgeProps) {
  const variants = {
    active: 'bg-emerald-500/15 text-accentEmerald border-emerald-500/30',
    draft: 'bg-amber-500/15 text-accentAmber border-amber-500/30',
    failed: 'bg-rose-500/15 text-accentRose border-rose-500/30',
    info: 'bg-indigo-500/15 text-accentIndigo border-indigo-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
