import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useClickOutside } from '../../../lib/useClickOutside';
import type { ColumnConfig } from '../columns';

export interface ColumnSelectorProps {
  allColumns: ColumnConfig[];
  metaKeys: Set<string>;
  isVisible: (key: string) => boolean;
  onToggle: (key: string) => void;
  compact?: boolean;
}

export function ColumnSelector({
  allColumns,
  metaKeys,
  isVisible,
  onToggle,
  compact,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [metaExpanded, setMetaExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const closeSelector = useCallback(() => setOpen(false), []);
  useClickOutside(ref, closeSelector);

  const dataCols = useMemo(() => allColumns.filter((c) => !metaKeys.has(c.key)), [allColumns, metaKeys]);
  const metaCols = useMemo(() => allColumns.filter((c) => metaKeys.has(c.key)), [allColumns, metaKeys]);
  const visibleCount = allColumns.filter((c) => isVisible(c.key)).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
          compact ? 'h-7 px-2' : 'h-8 px-2.5',
          'border-slate-200 text-slate-600 hover:bg-slate-50',
          'dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800',
          open && 'bg-slate-100 dark:bg-slate-800',
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="tabular-nums">
          {visibleCount}/{allColumns.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-80 overflow-y-auto p-1.5">
            {dataCols.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={isVisible(col.key)}
                  onChange={() => onToggle(col.key)}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                />
                <span className="truncate">{col.title ?? col.key}</span>
              </label>
            ))}

            {metaCols.length > 0 && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => setMetaExpanded(!metaExpanded)}
                  className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-slate-800"
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform',
                      metaExpanded && 'rotate-90',
                    )}
                  />
                  Metadata
                  <span className="ml-auto tabular-nums">{metaCols.length}</span>
                </button>
                {metaExpanded &&
                  metaCols.map((col) => (
                    <label
                      key={col.key}
                      className="flex cursor-pointer items-center gap-2 rounded py-1 pl-5 pr-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible(col.key)}
                        onChange={() => onToggle(col.key)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                      />
                      <span className="truncate text-slate-500 dark:text-slate-400">
                        {col.title ?? col.key}
                      </span>
                    </label>
                  ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
