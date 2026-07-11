import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface LinkRowProps {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  className?: string;
}

export function LinkRow({ label, value, icon: Icon, onClick, className }: LinkRowProps): React.JSX.Element | null {
  if (!value) return null;
  return (
    <div className="group flex items-center justify-between">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3 w-3 flex-shrink-0 text-slate-400" />}
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        title={`查看${label}详情`}
        className={cn('flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline', className)}
      >
        {value}
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
}
