import React from 'react';
import { cn } from '@/lib/utils';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'primary' | 'secondary' | 'muted' | 'subtitle';
}

export function Text({ variant = 'primary', className, children, ...props }: TextProps) {
  const variants = {
    primary: 'text-textPrimary text-sm',
    secondary: 'text-textSecondary text-sm',
    muted: 'text-textMuted text-xs',
    subtitle: 'text-textSecondary text-base',
  };

  return (
    <p className={cn(variants[variant], className)} {...props}>
      {children}
    </p>
  );
}
