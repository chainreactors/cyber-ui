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
                'inline-flex items-center rounded-md border font-medium transition-colors',
                compact ? 'h-6 px-1.5 text-[11px]' : 'h-7 px-2 text-xs',
                // Cairn tokens (this toolbar renders only inside the Cairn app).
                // Inactive chips were text-slate-400/500 (~2.8:1 on the dark
                // surface) — the readability complaint. Muted foreground clears 7:1.
                active
                  ? 'border-accent/40 bg-accent-soft text-accent-fg hover:border-accent/60'
                  : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:bg-raise hover:text-fg',
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
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-surface-2 px-1.5 text-[10px] font-medium text-muted">
            {visible ?? 0}/{total}
          </span>
          {typeof hidden === 'number' && hidden > 0 && (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-line px-1.5 text-[10px] text-faint">
              hidden {hidden}
            </span>
          )}
          {typeof flagged === 'number' && flagged > 0 && (
            <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-line px-1.5 text-[10px] text-faint">
              flagged {flagged}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
