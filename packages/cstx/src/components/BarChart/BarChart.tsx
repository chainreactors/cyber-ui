import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RuntimeComponentProps } from '../../runtime/registry';
import type { ChartDataItem } from '../../types/chart';
import { cn } from '../../lib/cn';
import { ChartTooltip } from '../primitives/ChartTooltip';
import { CARD_CLASS } from '../primitives/Card';

export function BarChart({ data, loading, config }: RuntimeComponentProps): React.JSX.Element {
  const title = config.title as string;
  const color = (config.color as string) || '#10b981';
  const height = (config.height as number) || 200;

  const items = (data.items as ChartDataItem[] | undefined) ?? [];
  const isLoading = loading.items;
  const maxValue = items.length > 0 ? Math.max(...items.map((d) => d.value)) : null;

  return (
    <div className={cn(CARD_CLASS, 'p-4')}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {maxValue !== null && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Max: <span className="font-medium tabular-nums">{maxValue}</span>
          </span>
        )}
      </div>

      {isLoading ? (
        <div
          className="animate-pulse rounded bg-slate-200 dark:bg-slate-700"
          style={{ height }}
        />
      ) : items.length === 0 ? (
        <div
          className="flex items-center justify-center text-sm text-slate-400 dark:text-slate-500"
          style={{ height }}
        >
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart data={items}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
              className="text-slate-500 dark:text-slate-400"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-slate-500 dark:text-slate-400"
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
