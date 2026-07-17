import React, { useState, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useClickOutside } from '../../../lib/useClickOutside';

export interface ExportButtonProps {
  compact?: boolean;
  onExport: (format: 'xlsx' | 'csv' | 'report') => void;
  formats?: string[];
}

const FORMAT_LABELS: Record<string, string> = {
  xlsx: 'Export XLSX',
  csv: 'Export CSV',
  report: 'Generate Report',
};

export function ExportButton({ compact, onExport, formats = ['xlsx', 'csv'] }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpen(false), []);
  useClickOutside(ref, closeMenu);

  if (formats.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onExport(formats[0] as 'xlsx' | 'csv' | 'report')}
        className={cn(
          'flex items-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
          compact ? 'h-7 px-2' : 'h-8 px-2.5',
          'border-[var(--c-line,#e2e8f0)] text-[var(--c-muted,#475569)] hover:bg-[var(--c-surface-2,#f8fafc)]',
          'dark:border-[var(--c-line,#475569)] dark:text-[var(--c-muted,#94a3b8)] dark:hover:bg-[var(--c-surface-2,#1e293b)]',
        )}
      >
        <Download className="h-3.5 w-3.5" />
        {FORMAT_LABELS[formats[0]] ?? 'Export'}
      </button>
    );
  }

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
        <Download className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--c-line,#e2e8f0)] bg-[var(--c-raise,#fff)] shadow-lg dark:border-[var(--c-line,#334155)] dark:bg-[var(--c-raise,#0f172a)]">
          <div className="p-1">
            {formats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => { onExport(fmt as 'xlsx' | 'csv' | 'report'); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-[var(--c-fg,#334155)] hover:bg-[var(--c-surface-2,#f8fafc)] dark:text-[var(--c-fg,#cbd5e1)] dark:hover:bg-[var(--c-surface-2,#1e293b)]"
              >
                {FORMAT_LABELS[fmt] ?? fmt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
