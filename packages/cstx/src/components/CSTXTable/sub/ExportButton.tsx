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
          'border-slate-200 text-slate-600 hover:bg-slate-50',
          'dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800',
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
          'border-slate-200 text-slate-600 hover:bg-slate-50',
          'dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800',
          open && 'bg-slate-100 dark:bg-slate-800',
        )}
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="p-1">
            {formats.map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => { onExport(fmt as 'xlsx' | 'csv' | 'report'); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
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
