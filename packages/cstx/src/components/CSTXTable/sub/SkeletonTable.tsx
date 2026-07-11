import React from 'react';
import { cn } from '../../../lib/cn';

export interface SkeletonTableProps {
  columns?: number;
  rows?: number;
  compact?: boolean;
  gridTemplate?: string;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded bg-slate-200 dark:bg-slate-700', className)} />
  );
}

export function SkeletonTable({
  columns = 5,
  rows = 5,
  compact,
  gridTemplate,
}: SkeletonTableProps) {
  const style: React.CSSProperties = gridTemplate
    ? { gridTemplateColumns: gridTemplate }
    : { gridTemplateColumns: `repeat(${columns}, 1fr)` };

  return (
    <>
      <div
        className={cn(
          'grid border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50',
          compact ? 'px-3' : 'px-4',
        )}
        style={style}
      >
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className={cn(compact ? 'py-2 pr-1.5' : 'py-3 pr-2')}>
            <SkeletonBar className={cn('h-3', i === 0 ? 'w-24' : 'w-16')} />
          </div>
        ))}
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
          {Array.from({ length: columns }, (_, colIdx) => (
            <div key={colIdx} className={cn(compact ? 'py-1.5 pr-1.5' : 'py-3 pr-2')}>
              <SkeletonBar
                className={cn(
                  'h-3.5',
                  colIdx === 0 ? 'w-32' : colIdx === columns - 1 ? 'w-12' : 'w-20',
                )}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
