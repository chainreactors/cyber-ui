import React from 'react';
import { Search, Filter, Database } from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface EmptyGuideLabels {
  noMatch?: string;
  noMatchHint?: string;
  noTypeMatch?: string;
  noTypeMatchHint?: string;
  emptyHint?: string;
  clearSearch?: string;
  clearFilters?: string;
}

export interface EmptyGuideProps {
  totalRows: number;
  hasSearch: boolean;
  hasTypeFilter: boolean;
  emptyText?: string;
  compact?: boolean;
  onClearSearch?: () => void;
  onClearTypeFilter?: () => void;
  labels?: EmptyGuideLabels;
}

export function EmptyGuide({
  totalRows,
  hasSearch,
  hasTypeFilter,
  emptyText,
  compact,
  onClearSearch,
  onClearTypeFilter,
  labels,
}: EmptyGuideProps) {
  const isFilteredEmpty = totalRows > 0;

  const Icon = isFilteredEmpty
    ? (hasSearch ? Search : Filter)
    : Database;

  const title = isFilteredEmpty
    ? (hasSearch ? (labels?.noMatch ?? 'No matching results') : (labels?.noTypeMatch ?? 'No items match selected types'))
    : (emptyText || 'No data');

  const description = isFilteredEmpty
    ? (hasSearch
        ? (labels?.noMatchHint ?? 'Try adjusting your search query or clearing filters.')
        : (labels?.noTypeMatchHint ?? 'Try selecting different types or clearing the filter.'))
    : (labels?.emptyHint ?? 'This table has no records to display.');

  const clearAction = isFilteredEmpty
    ? (hasSearch ? onClearSearch : onClearTypeFilter)
    : undefined;

  const clearLabel = hasSearch ? (labels?.clearSearch ?? 'Clear search') : (labels?.clearFilters ?? 'Clear filters');

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2 text-center',
      compact ? 'py-8' : 'py-12',
    )}>
      <Icon className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
        {title}
      </div>
      <div className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
        {description}
      </div>
      {clearAction && (
        <button
          type="button"
          onClick={clearAction}
          className="mt-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
