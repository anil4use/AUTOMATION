import React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function Heading({ as: Component = 'h1', className, children, ...props }: HeadingProps) {
  const sizes = {
    h1: 'text-2xl sm:text-3xl font-bold tracking-tight text-white',
    h2: 'text-xl sm:text-2xl font-bold tracking-tight text-white',
    h3: 'text-lg font-semibold text-white',
    h4: 'text-base font-semibold text-white',
  };

  return (
    <Component className={cn(sizes[Component], className)} {...props}>
      {children}
    </Component>
  );
}
