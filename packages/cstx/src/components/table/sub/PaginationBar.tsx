import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../../lib/cn';

export interface PaginationLabels {
  rangeOf?: string;
  range?: string;
  perPage?: string;
  emptyRows?: string;
  firstPage?: string;
  previousPage?: string;
  nextPage?: string;
  lastPage?: string;
  navigation?: string;
  pageNumber?: string;
  pageOf?: string;
  pageSize?: string;
  jumpTo?: string;
  jump?: string;
}

export interface PaginationBarProps {
  mode: 'client' | 'server';
  compact?: boolean;
  loading?: boolean;
  className?: string;
  ariaLabel?: string;
  locale?: string;
  /** Cursor endpoints can only move to the adjacent page. */
  allowPageJump?: boolean;
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
  serverTotalKnown?: boolean;
  serverHasNext?: boolean;
  serverRows?: number;
  serverPage?: number;
  serverPageCount?: number;
  onServerPageChange?: (page: number) => void;
  // shared
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  labels?: PaginationLabels;
}

export function PaginationBar({
  mode, compact, loading = false, className, ariaLabel, locale, allowPageJump = true,
  totalRows = 0, pageIndex = 0, pageCount = 1,
  canPreviousPage = false, canNextPage = false,
  onPreviousPage, onNextPage, onGoToPage,
  serverTotal = 0, serverTotalKnown = true, serverHasNext = false,
  serverRows = 0, serverPage = 0, serverPageCount = 1, onServerPageChange,
  pageSize, pageSizeOptions, onPageSizeChange, labels,
}: PaginationBarProps) {
  const isServer = mode === 'server';
  const totalKnown = !isServer || serverTotalKnown;
  const currentPage = isServer ? serverPage : pageIndex;
  const totalPages = Math.max(1, isServer ? serverPageCount : pageCount);
  const total = isServer ? serverTotal : totalRows;
  const hasPrev = isServer ? currentPage > 0 : canPreviousPage;
  const hasNext = isServer ? (totalKnown ? currentPage < totalPages - 1 : serverHasNext) : canNextPage;
  const [jumpValue, setJumpValue] = useState(String(currentPage + 1));

  useEffect(() => setJumpValue(String(currentPage + 1)), [currentPage]);

  const goTo = useCallback((page: number) => {
    if (loading || !Number.isSafeInteger(page)) return;
    const clamped = Math.max(0, totalKnown ? Math.min(page, totalPages - 1) : page);
    if (clamped === currentPage) return;
    if (isServer) onServerPageChange?.(clamped);
    else onGoToPage?.(clamped);
  }, [loading, totalKnown, totalPages, currentPage, isServer, onServerPageChange, onGoToPage]);

  // A refreshed or filtered result can have fewer pages than the old result.
  useEffect(() => {
    if (allowPageJump && totalKnown && !loading && currentPage >= totalPages) goTo(totalPages - 1);
  }, [allowPageJump, totalKnown, loading, currentPage, totalPages, goTo]);

  const handlePrev = () => {
    if (loading || !hasPrev) return;
    if (isServer) onServerPageChange?.(currentPage - 1);
    else onPreviousPage?.();
  };
  const handleNext = () => {
    if (loading || !hasNext) return;
    if (isServer) onServerPageChange?.(currentPage + 1);
    else onNextPage?.();
  };

  const formatNumber = (n: number) => n.toLocaleString(locale);
  const rowCount = totalKnown ? total : serverRows;
  const rangeStart = rowCount > 0 ? currentPage * pageSize + 1 : 0;
  const rangeEnd = totalKnown ? Math.min((currentPage + 1) * pageSize, total) : currentPage * pageSize + serverRows;
  const pageLabel = (page: number) => (labels?.pageNumber ?? 'Page {n}').replace('{n}', String(page + 1));
  const pageWindowStart = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
  const nearbyPages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => pageWindowStart + i);
  const navBtnClass = 'flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded border border-[var(--c-line,#e2e8f0)] px-1.5 text-[var(--c-muted,#64748b)] transition-colors hover:bg-[var(--c-surface-2,#f1f5f9)] hover:text-[var(--c-fg,#0f172a)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-accent,#3b82f6)] disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav
      aria-label={ariaLabel ?? labels?.navigation ?? 'Pagination'}
      aria-busy={loading}
      className={cn('@container/pagination w-full min-w-0 shrink-0 border-t border-[var(--c-line,#e2e8f0)] text-xs text-[var(--c-faint,#94a3b8)]', compact ? 'px-3 py-2' : 'px-4 py-2.5', className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="tabular-nums">
            {rowCount > 0
              ? (totalKnown ? (labels?.rangeOf ?? '{start}-{end} of {total}') : (labels?.range ?? '{start}-{end}'))
                  .replace('{start}', formatNumber(rangeStart))
                  .replace('{end}', formatNumber(rangeEnd))
                  .replace('{total}', formatNumber(total))
              : (labels?.emptyRows ?? '0 rows')}
          </span>
          {pageSizeOptions && pageSizeOptions.length > 1 && onPageSizeChange && (
            <select
              aria-label={labels?.pageSize ?? 'Rows per page'}
              value={pageSize}
              disabled={loading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded border border-[var(--c-line,#e2e8f0)] bg-[var(--c-surface,#fff)] px-1.5 text-xs tabular-nums text-[var(--c-muted,#64748b)] focus-visible:outline-2 focus-visible:outline-[var(--c-accent,#3b82f6)] disabled:opacity-40"
            >
              {pageSizeOptions.map((size) => <option key={size} value={size}>{(labels?.perPage ?? '{n} / page').replace('{n}', String(size))}</option>)}
            </select>
          )}
        </div>

        <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            {allowPageJump && <button type="button" aria-label={labels?.firstPage ?? 'First page'} title={labels?.firstPage ?? 'First page'} className={navBtnClass} onClick={() => goTo(0)} disabled={loading || !hasPrev}>
              <ChevronsLeft size={14} aria-hidden="true" />
            </button>}
            <button type="button" aria-label={labels?.previousPage ?? 'Previous page'} title={labels?.previousPage ?? 'Previous page'} className={navBtnClass} onClick={handlePrev} disabled={loading || !hasPrev}>
              <ChevronLeft size={14} aria-hidden="true" />
              <span className="hidden @[800px]/pagination:inline">{labels?.previousPage ?? 'Previous'}</span>
            </button>
            {allowPageJump && totalKnown && totalPages > 1 && (
              <div className="hidden items-center gap-1 @[640px]/pagination:flex">
                {nearbyPages.map((page) => <button key={page} type="button" aria-label={pageLabel(page)} aria-current={page === currentPage ? 'page' : undefined} disabled={loading} onClick={() => goTo(page)} className={cn(navBtnClass, page === currentPage && '!border-[var(--c-accent,#3b82f6)] !bg-[var(--c-accent-soft,#eff6ff)] !text-[var(--c-accent-fg,#2563eb)]')}>
                  {page + 1}
                </button>)}
              </div>
            )}
            <span className="whitespace-nowrap px-1 tabular-nums" aria-live="polite">
              {totalKnown
                ? (labels?.pageOf ?? '{page} / {pages}').replace('{page}', String(currentPage + 1)).replace('{pages}', String(totalPages))
                : pageLabel(currentPage)}
            </span>
            <button type="button" aria-label={labels?.nextPage ?? 'Next page'} title={labels?.nextPage ?? 'Next page'} className={navBtnClass} onClick={handleNext} disabled={loading || !hasNext}>
              <span className="hidden @[800px]/pagination:inline">{labels?.nextPage ?? 'Next'}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            {allowPageJump && <button type="button" aria-label={labels?.lastPage ?? 'Last page'} title={labels?.lastPage ?? 'Last page'} className={navBtnClass} onClick={() => goTo(totalPages - 1)} disabled={loading || !totalKnown || !hasNext}>
              <ChevronsRight size={14} aria-hidden="true" />
            </button>}
          </div>
          {allowPageJump && totalKnown && totalPages > 1 && (
            <form className="flex items-center gap-1.5" onSubmit={(event) => {
              event.preventDefault();
              if (!/^\d+$/.test(jumpValue)) return;
              const page = Number(jumpValue);
              if (Number.isSafeInteger(page) && page >= 1 && page <= totalPages) goTo(page - 1);
            }}>
              <input
                type="number" inputMode="numeric" min={1} max={totalPages} step={1} required
                aria-label={labels?.jumpTo ?? 'Go to page'}
                title={labels?.jumpTo ?? 'Go to page'}
                value={jumpValue} disabled={loading}
                onChange={(e) => setJumpValue(e.target.value)}
                className="h-8 w-14 rounded border border-[var(--c-line,#e2e8f0)] bg-[var(--c-surface,#fff)] px-1 text-center text-xs tabular-nums text-[var(--c-fg,#0f172a)] focus-visible:outline-2 focus-visible:outline-[var(--c-accent,#3b82f6)] disabled:opacity-40"
              />
              <button type="submit" disabled={loading} className={navBtnClass}>{labels?.jump ?? 'Go'}</button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}
