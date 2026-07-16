import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Clock, Trash2, Star } from 'lucide-react';
import { cn } from './cn';
import { formatRelativeTimeValue } from './timeDisplay';
import { useClickOutside } from './useClickOutside';
import type { SearchHistoryEntry } from './useSearchHistory';

export interface DropdownActions {
  close: () => void;
  select: (query: string) => void;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  className?: string;
  autoFocus?: boolean;
  history?: SearchHistoryEntry[];
  onSelectHistory?: (query: string) => void;
  onRemoveHistory?: (query: string) => void;
  onClearHistory?: () => void;
  saved?: SearchHistoryEntry[];
  onSave?: (query: string) => void;
  onUnsave?: (query: string) => void;
  isSaved?: (query: string) => boolean;
  trailingAction?: React.ReactNode;
  dropdownExtra?: (actions: DropdownActions) => React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
}

function formatMeta(entry: SearchHistoryEntry): string | null {
  const total = entry.meta?.resultTotal;
  if (typeof total === 'number') {
    const time = formatRelativeTimeValue(entry.timestamp, { absoluteThresholdDays: 30 });
    return `${total} results · ${time}`;
  }
  return formatRelativeTimeValue(entry.timestamp, { absoluteThresholdDays: 30 });
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  compact = false,
  className,
  autoFocus = false,
  history,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  saved,
  onSave,
  onUnsave,
  isSaved,
  trailingAction,
  dropdownExtra,
  inputRef: externalInputRef,
  onKeyDown: externalOnKeyDown,
  onFocus: externalOnFocus,
}: SearchInputProps): React.JSX.Element {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  const hasSaved = saved && saved.length > 0;
  const hasHistory = history && history.length > 0;
  const hasExtra = !!dropdownExtra;
  const hasTrailingChrome = !!trailingAction || !!value;
  const hasDropdownContent = hasSaved || hasHistory || hasExtra;
  const showDropdown = dropdownOpen && hasDropdownContent && !value;

  const flatItems = useMemo(() => {
    const items: { type: 'saved' | 'history'; entry: SearchHistoryEntry }[] = [];
    if (saved) {
      for (const entry of saved) items.push({ type: 'saved', entry });
    }
    if (history) {
      for (const entry of history) items.push({ type: 'history', entry });
    }
    return items;
  }, [saved, history]);

  const handleClickOutside = useCallback(() => {
    if (showDropdown) setDropdownOpen(false);
  }, [showDropdown]);
  useClickOutside(containerRef, handleClickOutside);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [showDropdown]);

  const handleSelect = useCallback(
    (query: string) => {
      onChange(query);
      onSelectHistory?.(query);
      onSubmit?.(query);
      setDropdownOpen(false);
      inputRef.current?.focus();
    },
    [inputRef, onChange, onSelectHistory, onSubmit],
  );

  const dropdownActions = useMemo<DropdownActions>(
    () => ({
      close: () => setDropdownOpen(false),
      select: (query: string) => handleSelect(query),
    }),
    [handleSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (showDropdown && focusedIndex >= 0 && flatItems[focusedIndex]) {
          e.preventDefault();
          handleSelect(flatItems[focusedIndex].entry.query);
        } else if (value.trim()) {
          onSubmit?.(value);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showDropdown) {
          setDropdownOpen(false);
        } else if (value) {
          onChange('');
        }
        return;
      }

      if (showDropdown && flatItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < flatItems.length - 1 ? prev + 1 : 0,
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : flatItems.length - 1,
          );
        }
      }
    },
    [showDropdown, focusedIndex, flatItems, value, onChange, onSubmit, handleSelect],
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      onRemoveHistory?.(query);
    },
    [onRemoveHistory],
  );

  const handleToggleSave = useCallback(
    (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      if (isSaved?.(query)) {
        onUnsave?.(query);
      } else {
        onSave?.(query);
      }
    },
    [isSaved, onSave, onUnsave],
  );

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-slate-400',
            compact ? 'left-2.5 h-3.5 w-3.5' : 'left-3.5 h-4 w-4',
          )}
        />
        <input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { setDropdownOpen(true); externalOnFocus?.(); }}
          onKeyDown={(e) => { handleKeyDown(e); externalOnKeyDown?.(e); }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full rounded-lg border bg-transparent outline-none transition-colors',
            'placeholder:text-slate-400',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            'dark:focus:border-blue-500',
            compact
              ? cn('h-8 border-slate-200 pl-8 text-sm dark:border-slate-600', trailingAction ? 'pr-16' : 'pr-8')
              : cn('h-10 border-slate-300 pl-10 text-sm dark:border-slate-600', trailingAction ? 'pr-20' : 'pr-10'),
          )}
        />
        {hasTrailingChrome && (
          <div
            className={cn(
              'absolute top-1/2 flex -translate-y-1/2 items-center gap-1',
              compact ? 'right-1.5' : 'right-2',
            )}
          >
            {trailingAction}
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  inputRef.current?.focus();
                }}
                className={cn(
                  'inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300',
                  compact ? 'h-6 w-6' : 'h-7 w-7',
                )}
              >
                <X className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
              </button>
            )}
          </div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-72 overflow-y-auto">
            {hasSaved && (
              <div>
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-2">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Saved
                  </span>
                </div>
                {saved!.map((entry, idx) => {
                  const globalIdx = idx;
                  return (
                    <div
                      key={`s-${entry.query}`}
                      className={cn(
                        'group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm',
                        'hover:bg-slate-50 dark:hover:bg-slate-800',
                        focusedIndex === globalIdx &&
                          'bg-slate-50 dark:bg-slate-800',
                      )}
                      onClick={() => handleSelect(entry.query)}
                      onMouseEnter={() => setFocusedIndex(globalIdx)}
                    >
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="min-w-0 flex-1 truncate">
                        {entry.query}
                      </span>
                      {onUnsave && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleSave(e, entry.query)}
                          className="shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {hasHistory && (
              <div>
                <div className="flex items-center justify-between px-3 pb-1 pt-2">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Recent
                  </span>
                  {onClearHistory && (
                    <button
                      type="button"
                      onClick={onClearHistory}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
                {history!.map((entry, idx) => {
                  const globalIdx = (saved?.length ?? 0) + idx;
                  return (
                    <div
                      key={`h-${entry.query}`}
                      className={cn(
                        'group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm',
                        'hover:bg-slate-50 dark:hover:bg-slate-800',
                        focusedIndex === globalIdx &&
                          'bg-slate-50 dark:bg-slate-800',
                      )}
                      onClick={() => handleSelect(entry.query)}
                      onMouseEnter={() => setFocusedIndex(globalIdx)}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate">
                        {entry.query}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {formatMeta(entry)}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        {onSave && (
                          <button
                            type="button"
                            onClick={(e) => handleToggleSave(e, entry.query)}
                          >
                            <Star
                              className={cn(
                                'h-3 w-3',
                                isSaved?.(entry.query)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-400 hover:text-amber-400',
                              )}
                            />
                          </button>
                        )}
                        {onRemoveHistory && (
                          <button
                            type="button"
                            onClick={(e) => handleRemove(e, entry.query)}
                          >
                            <X className="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasExtra && (
              <>
                {(hasSaved || hasHistory) && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                )}
                {dropdownExtra!(dropdownActions)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
