import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

export function TrendChart({ data, loading, config }: RuntimeComponentProps): React.JSX.Element {
  const title = config.title as string;
  const color = (config.color as string) || '#3b82f6';
  const showArea = config.showArea !== false;
  const height = (config.height as number) || 200;

  const items = (data.items as ChartDataItem[] | undefined) ?? [];
  const isLoading = loading.items;
  const lastValue = items.length > 0 ? items[items.length - 1].value : null;

  return (
    <div className={cn(CARD_CLASS, 'p-4')}>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {lastValue !== null && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Current: <span className="font-medium tabular-nums">{lastValue}</span>
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
          {showArea ? (
            <AreaChart data={items}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="text-slate-500 dark:text-slate-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-slate-500 dark:text-slate-400"
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <LineChart data={items}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                className="text-slate-500 dark:text-slate-400"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-slate-500 dark:text-slate-400"
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
