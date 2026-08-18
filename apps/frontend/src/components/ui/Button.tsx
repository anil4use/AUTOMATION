import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-150 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'glow-button',
    secondary: 'glass-card bg-white/5 hover:bg-white/10 text-white border-borderColor',
    ghost: 'bg-transparent text-textSecondary hover:text-white hover:bg-white/5',
    danger: 'bg-rose-500/15 text-accentRose border border-rose-500/30 hover:bg-rose-500/25',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
