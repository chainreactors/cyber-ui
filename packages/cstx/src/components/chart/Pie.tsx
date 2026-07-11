import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RuntimeComponentProps } from '../../runtime/registry';
import type { ChartDataItem } from '../../types/chart';
import { CHART_COLORS } from '../../lib/chartColors';
import { cn } from '../../lib/cn';
import { ChartTooltip } from '../primitives/ChartTooltip';
import { CARD_CLASS } from '../primitives/Card';

function formatPieValue(entry: { name?: string; value: number; payload?: Record<string, unknown> }): React.ReactNode {
  const pct = (entry.payload as { percentage?: number } | undefined)?.percentage;
  return pct != null ? `${entry.value} (${pct.toFixed(1)}%)` : entry.value;
}

interface PieLabel {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percentage: number;
}

function renderLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}: PieLabel): React.JSX.Element | null {
  if (percentage < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {percentage.toFixed(0)}%
    </text>
  );
}

export function PieChart({ data, loading, config }: RuntimeComponentProps): React.JSX.Element {
  const title = config.title as string;
  const isDonut = Boolean(config.isDonut);
  const height = (config.height as number) || 240;

  const items = (data.items as ChartDataItem[] | undefined) ?? [];
  const isLoading = loading.items;

  const total = items.reduce((sum, d) => sum + d.value, 0);
  const enriched = items.map((item) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
  }));

  return (
    <div className={cn(CARD_CLASS, 'p-4')}>
      <h3 className="mb-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </h3>

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
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={height}>
              <RechartsPieChart>
                <Pie
                  data={enriched}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={isDonut ? 50 : 0}
                  outerRadius={80}
                  label={renderLabel}
                  labelLine={false}
                >
                  {enriched.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={formatPieValue} />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            {enriched.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
                <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                <span className="tabular-nums text-slate-500 dark:text-slate-400">
                  {item.value} ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
