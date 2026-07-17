import React, { useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface PaginationBarProps {
  mode: 'client' | 'server';
  compact?: boolean;
  // client mode
  totalRows?: number;
  pageIndex?: number;
  pageCount?: number;
  canPreviousPage?: boolean;
  canNextPage?: boolean;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  onGoToPage?: (page: number) => void;
  // server mode
  serverTotal?: number;
  serverPage?: number;
  serverPageCount?: number;
  onServerPageChange?: (page: number) => void;
  // shared
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  // optional localization; placeholders {start} {end} {total} {n} are substituted
  labels?: {
    rangeOf?: string;
    perPage?: string;
    emptyRows?: string;
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function PaginationBar({
  mode,
  compact,
  totalRows = 0,
  pageIndex = 0,
  pageCount = 1,
  canPreviousPage = false,
  canNextPage = false,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  serverTotal = 0,
  serverPage = 0,
  serverPageCount = 1,
  onServerPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  labels,
}: PaginationBarProps) {
  const [jumpValue, setJumpValue] = useState('');

  const isServer = mode === 'server';
  const currentPage = isServer ? serverPage : pageIndex;
  const totalPages = isServer ? serverPageCount : pageCount;
  const total = isServer ? serverTotal : totalRows;
  const hasPrev = isServer ? serverPage > 0 : canPreviousPage;
  const hasNext = isServer ? serverPage < serverPageCount - 1 : canNextPage;

  const goTo = useCallback((page: number) => {
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    if (isServer) {
      onServerPageChange?.(clamped);
    } else {
      onGoToPage?.(clamped);
    }
  }, [isServer, totalPages, onServerPageChange, onGoToPage]);

  const handlePrev = useCallback(() => {
    if (isServer) onServerPageChange?.(serverPage - 1);
    else onPreviousPage?.();
  }, [isServer, serverPage, onServerPageChange, onPreviousPage]);

  const handleNext = useCallback(() => {
    if (isServer) onServerPageChange?.(serverPage + 1);
    else onNextPage?.();
  }, [isServer, serverPage, onServerPageChange, onNextPage]);

  const handleJumpSubmit = useCallback(() => {
    const num = parseInt(jumpValue, 10);
    if (Number.isFinite(num) && num >= 1) {
      goTo(num - 1);
    }
    setJumpValue('');
  }, [jumpValue, goTo]);

  const rangeStart = total > 0 ? currentPage * pageSize + 1 : 0;
  const rangeEnd = Math.min((currentPage + 1) * pageSize, total);

  const navBtnClass = cn(
    'rounded p-1 hover:bg-[var(--c-surface-2,#f1f5f9)] dark:hover:bg-[var(--c-surface-2,#1e293b)] disabled:pointer-events-none disabled:opacity-30',
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-[var(--c-line,#f1f5f9)] text-[11px] text-[var(--c-faint,#94a3b8)] dark:border-[var(--c-line,#1e293b99)] dark:text-[var(--c-faint,#64748b)]',
        compact ? 'px-3 py-1.5' : 'px-4 py-1.5',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          {total > 0
            ? (labels?.rangeOf ?? '{start}-{end} of {total}')
                .replace('{start}', formatNumber(rangeStart))
                .replace('{end}', formatNumber(rangeEnd))
                .replace('{total}', formatNumber(total))
            : (labels?.emptyRows ?? '0 rows')}
        </span>
        {pageSizeOptions && pageSizeOptions.length > 1 && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={cn(
              'rounded border border-[var(--c-line,#e2e8f0)] bg-transparent px-1.5 py-0.5 text-xs tabular-nums',
              'dark:border-[var(--c-line,#475569)]',
            )}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {(labels?.perPage ?? '{n} / page').replace('{n}', String(size))}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button type="button" className={navBtnClass} onClick={() => goTo(0)} disabled={!hasPrev}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" className={navBtnClass} onClick={handlePrev} disabled={!hasPrev}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        <input
          type="text"
          inputMode="numeric"
          value={jumpValue}
          onChange={(e) => setJumpValue(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleJumpSubmit(); }}
          onBlur={handleJumpSubmit}
          placeholder={String(currentPage + 1)}
          className={cn(
            'w-10 rounded border border-[var(--c-line,#e2e8f0)] bg-transparent px-1 py-0.5 text-center text-xs tabular-nums',
            'dark:border-[var(--c-line,#475569)]',
          )}
        />
        <span className="px-0.5 tabular-nums text-[var(--c-faint,#94a3b8)]">/ {totalPages}</span>

        <button type="button" className={navBtnClass} onClick={handleNext} disabled={!hasNext}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={navBtnClass} onClick={() => goTo(totalPages - 1)} disabled={!hasNext}>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
