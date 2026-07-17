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
  metadataLabel?: string;
  compact?: boolean;
}

export function ColumnSelector({
  allColumns,
  metaKeys,
  isVisible,
  onToggle,
  metadataLabel,
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
          'border-[var(--c-line,#e2e8f0)] text-[var(--c-muted,#475569)] hover:bg-[var(--c-surface-2,#f8fafc)]',
          'dark:border-[var(--c-line,#475569)] dark:text-[var(--c-muted,#94a3b8)] dark:hover:bg-[var(--c-surface-2,#1e293b)]',
          open && 'bg-[var(--c-surface-2,#f1f5f9)] dark:bg-[var(--c-surface-2,#1e293b)]',
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="tabular-nums">
          {visibleCount}/{allColumns.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-[var(--c-line,#e2e8f0)] bg-[var(--c-raise,#fff)] shadow-lg dark:border-[var(--c-line,#334155)] dark:bg-[var(--c-raise,#0f172a)]">
          <div className="max-h-80 overflow-y-auto p-1.5">
            {dataCols.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--c-surface-2,#f8fafc)] dark:hover:bg-[var(--c-surface-2,#1e293b)]"
              >
                <input
                  type="checkbox"
                  checked={isVisible(col.key)}
                  onChange={() => onToggle(col.key)}
                  className="h-3.5 w-3.5 rounded border-[var(--c-line-strong,#cbd5e1)] accent-[var(--c-accent,#2563eb)]"
                />
                <span className="truncate">{col.title ?? col.key}</span>
              </label>
            ))}

            {metaCols.length > 0 && (
              <>
                <div className="my-1 border-t border-[var(--c-line,#f1f5f9)] dark:border-[var(--c-line,#1e293b)]" />
                <button
                  type="button"
                  onClick={() => setMetaExpanded(!metaExpanded)}
                  className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--c-faint,#94a3b8)] hover:bg-[var(--c-surface-2,#f8fafc)] dark:text-[var(--c-faint,#64748b)] dark:hover:bg-[var(--c-surface-2,#1e293b)]"
                >
                  <ChevronRight
                    className={cn(
                      'h-3 w-3 transition-transform',
                      metaExpanded && 'rotate-90',
                    )}
                  />
                  {metadataLabel ?? 'Metadata'}
                  <span className="ml-auto tabular-nums">{metaCols.length}</span>
                </button>
                {metaExpanded &&
                  metaCols.map((col) => (
                    <label
                      key={col.key}
                      className="flex cursor-pointer items-center gap-2 rounded py-1 pl-5 pr-2 text-xs hover:bg-[var(--c-surface-2,#f8fafc)] dark:hover:bg-[var(--c-surface-2,#1e293b)]"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible(col.key)}
                        onChange={() => onToggle(col.key)}
                        className="h-3.5 w-3.5 rounded border-[var(--c-line-strong,#cbd5e1)] accent-[var(--c-accent,#2563eb)]"
                      />
                      <span className="truncate text-[var(--c-muted,#64748b)] dark:text-[var(--c-muted,#94a3b8)]">
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
