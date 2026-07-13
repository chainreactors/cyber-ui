import React from 'react';
import { Inbox, FileQuestion, AlertCircle, Search, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface EmptyStateProps extends React.ComponentProps<'div'> {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'warning' | 'error' | 'info';
}

const VARIANT_STYLE = { default: 'text-slate-500', warning: 'text-amber-600', error: 'text-red-600', info: 'text-blue-600' };
const VARIANT_ICON = { default: Inbox, warning: AlertCircle, error: AlertCircle, info: Search };

export function EmptyState({
  icon, title = 'No data', description, action, variant = 'default', className, ...props
}: EmptyStateProps): React.JSX.Element {
  const Icon = VARIANT_ICON[variant] ?? icon ?? Inbox;
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)} {...props}>
      <Icon className="mb-4 h-16 w-16 text-slate-300" />
      <h3 className={cn('mb-2 text-lg font-medium', VARIANT_STYLE[variant])}>{title}</h3>
      {description && <p className="mx-auto max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
