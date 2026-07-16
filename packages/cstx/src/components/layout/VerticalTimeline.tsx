import React from 'react';
import type { RuntimeComponentProps } from '../../runtime/registry';
import { cn } from '../../lib/cn';
import { formatTimeValue } from '../../lib/timeDisplay';
import { CARD_CLASS } from '../primitives/Card';

interface TimelineEntry {
  id: string;
  timestamp: number | string;
  label: string;
  sublabel?: string;
  kind?: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_KIND_STYLES: Record<string, { dot: string; line: string }> = {
  added: {
    dot: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/50',
    line: 'text-emerald-700 dark:text-emerald-400',
  },
  updated: {
    dot: 'bg-blue-500 ring-blue-100 dark:ring-blue-900/50',
    line: 'text-blue-700 dark:text-blue-400',
  },
  removed: {
    dot: 'bg-red-500 ring-red-100 dark:ring-red-900/50',
    line: 'text-red-700 dark:text-red-400',
  },
  reactivated: {
    dot: 'bg-amber-500 ring-amber-100 dark:ring-amber-900/50',
    line: 'text-amber-700 dark:text-amber-400',
  },
};

const DEFAULT_STYLE = {
  dot: 'bg-slate-400 ring-slate-100 dark:ring-slate-800',
  line: 'text-slate-600 dark:text-slate-400',
};

function getKindStyle(kind: string | undefined) {
  if (!kind) return DEFAULT_STYLE;
  return DEFAULT_KIND_STYLES[kind] ?? DEFAULT_STYLE;
}

export function VerticalTimeline({
  data,
  loading,
  config,
  onAction,
}: RuntimeComponentProps): React.JSX.Element {
  const entries = (data.entries ?? []) as TimelineEntry[];
  const isLoading = loading.entries;
  const title = config.title as string;
  const maxItems = (config.maxItems as number) || 50;
  const emptyText = (config.emptyText as string) || 'No events';

  const visibleEntries = entries.slice(0, maxItems);

  return (
    <div className={cn(CARD_CLASS, 'overflow-hidden')}>
      {title && (
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
            <span className="ml-2">Loading...</span>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
            {emptyText}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-4">
              {visibleEntries.map((entry, idx) => {
                const style = getKindStyle(entry.kind);
                return (
                  <div
                    key={entry.id ?? idx}
                    className={cn(
                      'relative flex gap-3 pl-0',
                      onAction && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded',
                    )}
                    onClick={() =>
                      onAction?.('entryClick', {
                        entryId: entry.id,
                        entry: entry as unknown as Record<string, unknown>,
                      })
                    }
                  >
                    {/* Dot */}
                    <div
                      className={cn(
                        'relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full ring-2',
                        style.dot,
                      )}
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-baseline gap-2">
                        <span className={cn('text-sm font-medium', style.line)}>
                          {entry.label}
                        </span>
                        {entry.kind && (
                          <span className="text-xs text-slate-400">
                            {entry.kind}
                          </span>
                        )}
                      </div>
                      {entry.sublabel && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {entry.sublabel}
                        </p>
                      )}
                      {entry.detail && (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          {entry.detail}
                        </p>
                      )}
                      <time className="mt-0.5 block text-xs tabular-nums text-slate-400">
                        {formatTimeValue(entry.timestamp, '')}
                      </time>
                    </div>
                  </div>
                );
              })}
            </div>

            {entries.length > maxItems && (
              <div className="mt-3 text-center text-xs text-slate-400">
                Showing {maxItems} of {entries.length} entries
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
