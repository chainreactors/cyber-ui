import React from 'react';
import type { RuntimeComponentProps } from '../../runtime/registry';
import { cn } from '../../lib/cn';
import { CARD_CLASS } from '../primitives/Card';

function buildPolyline(values: number[], width: number, height: number, padding: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) return `${width / 2},${height / 2}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const drawHeight = height - padding * 2;
  const step = (width - padding * 2) / (values.length - 1);

  return values
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + drawHeight - ((v - min) / range) * drawHeight;
      return `${x},${y}`;
    })
    .join(' ');
}

export function Sparkline({ data, loading, config }: RuntimeComponentProps): React.JSX.Element {
  const values = data.values as number[] | undefined;
  const isLoading = loading.values;
  const color = (config.color as string) || '#3b82f6';
  const height = (config.height as number) || 40;
  const strokeWidth = (config.strokeWidth as number) || 1.5;
  const showEndDot = config.showEndDot !== false;
  const title = config.title as string;

  const padding = 4;
  const svgWidth = 200;

  const hasData = Array.isArray(values) && values.length > 0;
  const points = hasData ? buildPolyline(values, svgWidth, height, padding) : '';

  // Compute last point coordinates for the end dot
  let lastX = 0;
  let lastY = 0;
  if (hasData && values.length > 0) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const drawHeight = height - padding * 2;
    const step = values.length > 1 ? (svgWidth - padding * 2) / (values.length - 1) : 0;
    lastX = padding + (values.length - 1) * step;
    lastY = padding + drawHeight - ((values[values.length - 1] - min) / range) * drawHeight;
  }

  return (
    <div className={cn(CARD_CLASS, 'p-4')}>
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {title}
        </p>
      )}

      {isLoading ? (
        <div
          className={cn('animate-pulse rounded bg-slate-200 dark:bg-slate-700')}
          style={{ height }}
        />
      ) : !hasData ? (
        <div
          className="flex items-center justify-center text-xs text-slate-400 dark:text-slate-500"
          style={{ height }}
        >
          No data
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${svgWidth} ${height}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height }}
          role="img"
          aria-label={title || 'Sparkline chart'}
        >
          <polyline
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {showEndDot && (
            <circle cx={lastX} cy={lastY} r={strokeWidth + 1} fill={color} />
          )}
        </svg>
      )}
    </div>
  );
}
