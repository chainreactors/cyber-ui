import React from 'react';
import { cn } from '../../lib/cn';

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value: number; payload?: Record<string, unknown> }>;
  label?: string;
  formatter?: (entry: { name?: string; value: number; payload?: Record<string, unknown> }) => React.ReactNode;
  className?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  className,
}: ChartTooltipProps): React.JSX.Element | null {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const heading = label ?? entry.name;
  return (
    <div
      className={cn(
        'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-md dark:border-slate-600 dark:bg-slate-800',
        className,
      )}
    >
      {heading != null && (
        <p className="font-medium text-slate-900 dark:text-slate-100">{heading}</p>
      )}
      <p className="text-slate-600 dark:text-slate-300">
        {formatter ? formatter(entry) : entry.value}
      </p>
    </div>
  );
}
