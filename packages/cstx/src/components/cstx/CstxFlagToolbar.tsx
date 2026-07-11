import React from 'react';
import { cn } from '../../lib/cn';
import {
  CSTX_FLAG_OPTIONS,
  DEFAULT_CSTX_EXCLUDE_MASK,
  getCstxFlagFilterMasks,
  normalizeCstxFlagMask,
  type CstxFlagFilterState,
} from '../../lib/cstxFlags';

export interface CstxFlagToolbarProps {
  value: CstxFlagFilterState;
  onChange: (value: CstxFlagFilterState) => void;
  total?: number;
  visible?: number;
  hidden?: number;
  flagged?: number;
  variant?: 'graph' | 'search';
  compact?: boolean;
  showStats?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CstxFlagToolbar({
  value,
  onChange,
  total,
  visible,
  hidden,
  flagged,
  variant = 'graph',
  compact = false,
  showStats = true,
  disabled = false,
  className,
}: CstxFlagToolbarProps): React.JSX.Element {
  const isSearch = variant === 'search';
  const { excludeMask } = getCstxFlagFilterMasks(value);
  const mask = normalizeCstxFlagMask(excludeMask);

  const handleFlagToggle = (flagValue: number) => {
    const baseMask = Number.isFinite(mask) ? mask : DEFAULT_CSTX_EXCLUDE_MASK;
    const nextMask = (baseMask & flagValue) !== 0
      ? (baseMask & ~flagValue)
      : (baseMask | flagValue);
    onChange({ mode: 'clean', mask: Math.max(0, nextMask) });
  };

  return (
    <div className={cn(
      'flex min-w-0 flex-wrap items-center gap-1.5',
      isSearch ? 'text-xs' : 'justify-start lg:justify-end',
      className,
    )}>
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {CSTX_FLAG_OPTIONS.map((option) => {
          const active = (mask & option.value) === 0;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => handleFlagToggle(option.value)}
              className={cn(
                'inline-flex items-center rounded-md border text-xs font-medium transition-colors',
                compact ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2',
                active
                  ? 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {showStats && typeof total === 'number' && (
        <div className="flex min-w-0 items-center gap-1">
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-slate-100 px-1.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {visible ?? 0}/{total}
          </span>
          {typeof hidden === 'number' && hidden > 0 && (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200 px-1.5 text-[10px] text-slate-500 dark:border-slate-700">
              hidden {hidden}
            </span>
          )}
          {typeof flagged === 'number' && flagged > 0 && (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-slate-200 px-1.5 text-[10px] text-slate-500 dark:border-slate-700">
              flagged {flagged}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
