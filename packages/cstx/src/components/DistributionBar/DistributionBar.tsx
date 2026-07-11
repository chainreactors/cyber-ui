import React from 'react';
import type { RuntimeComponentProps } from '../../runtime/registry';
import { CHART_COLORS } from '../../lib/chartColors';
import { cn } from '../../lib/cn';
import { CARD_CLASS } from '../primitives/Card';

interface DistItem {
  label: string;
  value: number;
}

export function DistributionBar({ data, loading, config }: RuntimeComponentProps): React.JSX.Element {
  const rawItems = data.items as DistItem[] | undefined;
  const isLoading = loading.items;
  const title = config.title as string;
  const maxItems = (config.maxItems as number) || 10;
  const showPercentage = config.showPercentage !== false;
  const showValue = config.showValue !== false;

  const hasData = Array.isArray(rawItems) && rawItems.length > 0;
  const items = hasData ? rawItems.slice(0, maxItems) : [];
  const total = items.reduce((sum, it) => sum + it.value, 0);
  const maxValue = Math.max(...items.map((it) => it.value), 1);

  return (
    <div className={cn(CARD_CLASS, 'p-4')}>
      {title && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="flex h-24 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
          No data
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            const widthPct = (item.value / maxValue) * 100;
            const barColor = CHART_COLORS[idx % CHART_COLORS.length];

            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {showValue && item.value.toLocaleString()}
                    {showValue && showPercentage && ' '}
                    {showPercentage && `(${pct.toFixed(1)}%)`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn('h-full rounded-full transition-all duration-300')}
                    style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
