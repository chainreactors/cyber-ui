import React from 'react';
import { Loader2 } from 'lucide-react';

export interface DataStateProps {
  loading?: boolean;
  empty?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  loadingText?: string;
  emptyText?: string;
  emptyHint?: string;
}

export function DataState({
  loading = false,
  empty = false,
  icon: EmptyIcon,
  loadingText = 'Loading...',
  emptyText = 'No data',
  emptyHint,
}: DataStateProps): React.JSX.Element | null {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-slate-300" />
        {loadingText}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="py-8 text-center">
        {EmptyIcon && <EmptyIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />}
        <p className="text-sm text-slate-500">{emptyText}</p>
        {emptyHint && <p className="mt-2 text-xs text-slate-400">{emptyHint}</p>}
      </div>
    );
  }
  return null;
}
