import React from 'react';
import { cn } from '../../../lib/cn';

export interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  compact?: boolean;
  gridTemplate?: string;
  /** IDs in the same order as the grid tracks (system columns included). */
  columnIds?: string[];
  /** Keep the loading surface's scroll width in step with the real table. */
  minWidth?: number;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn('max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700', className)} />
  );
}

function systemBarClass(columnId: string | undefined, header: boolean): string | null {
  switch (columnId) {
    case '__row_control':
      return 'h-3.5 w-3.5';
    case '__diff':
      return header ? 'h-3 w-10' : 'h-5 w-12';
    case '__expand':
      return 'h-3.5 w-3.5';
    case '__actions':
      return header ? 'hidden' : 'h-3.5 w-8';
    default:
      return null;
  }
}

export function SkeletonTable({
  columns = 5,
  rows = 5,
  compact,
  gridTemplate,
  columnIds,
  minWidth,
}: SkeletonTableProps) {
  // An empty inline grid-template value is invalid CSS.  Falling back to an
  // explicit template is important for data-inferred tables: before the first
  // response there may be no real columns yet, but every skeleton child still
  // needs a track of its own.
  const style: React.CSSProperties = {
    gridTemplateColumns: gridTemplate?.trim()
      ? gridTemplate
      : `repeat(${Math.max(1, columns)}, minmax(0, 1fr))`,
    ...(minWidth && minWidth > 0 ? { minWidth: `${minWidth}px` } : {}),
  };

  return (
    <>
      <div
        className={cn(
          'grid border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
          compact ? 'px-3' : 'px-4',
        )}
        style={style}
      >
        {Array.from({ length: columns }, (_, i) => {
          const systemClass = systemBarClass(columnIds?.[i], true);
          return (
            <div key={i} className={cn('min-w-0', compact ? 'py-2 pr-1.5' : 'py-3 pr-2')}>
              <SkeletonBar
                className={cn(
                  'h-3',
                  systemClass ?? (i === 0 ? 'w-24' : 'w-16'),
                )}
              />
            </div>
          );
        })}
      </div>

      {Array.from({ length: rows }, (_, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            'grid border-b border-slate-100 last:border-b-0 dark:border-slate-800',
            compact ? 'px-3' : 'px-4',
          )}
          style={style}
        >
          {Array.from({ length: columns }, (_, colIdx) => {
            const systemClass = systemBarClass(columnIds?.[colIdx], false);
            return (
              <div key={colIdx} className={cn('min-w-0', compact ? 'py-1.5 pr-1.5' : 'py-3 pr-2')}>
                <SkeletonBar
                  className={cn(
                    'h-3.5',
                    systemClass ?? (
                      colIdx === 0 ? 'w-32' : colIdx === columns - 1 ? 'w-12' : 'w-20'
                    ),
                  )}
                />
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
