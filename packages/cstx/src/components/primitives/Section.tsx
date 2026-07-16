import React from 'react';
import { cn } from '../../lib/cn';

export interface SectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, icon: Icon, children, className }: SectionProps): React.JSX.Element {
  return (
    <div className={cn('flex flex-col space-y-3', className)}>
      <h3 className="flex items-center gap-2 text-sm font-medium">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{title}</span>
      </h3>
      <div className="flex-1 space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}
