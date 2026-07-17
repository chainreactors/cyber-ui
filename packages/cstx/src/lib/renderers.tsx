import React from 'react';
import { cn } from './cn';
import { formatTimeValue, type TimeDisplayValue } from './timeDisplay';

type Row = Record<string, unknown>;

export type CellRendererFn = (
  value: unknown,
  row: Row,
  options?: Record<string, unknown>,
) => React.ReactNode;

export class CellRendererRegistry {
  private renderers = new Map<string, CellRendererFn>();

  register(name: string, renderer: CellRendererFn): void {
    this.renderers.set(name, renderer);
  }

  get(name: string): CellRendererFn | undefined {
    return this.renderers.get(name);
  }

  has(name: string): boolean {
    return this.renderers.has(name);
  }

  list(): string[] {
    return Array.from(this.renderers.keys());
  }
}

function formatNumber(v: unknown, opts?: Record<string, unknown>): string {
  const num = Number(v);
  if (!Number.isFinite(num)) return String(v ?? '-');
  const precision = (opts?.precision as number) ?? undefined;
  const formatted =
    precision !== undefined ? num.toFixed(precision) : num.toLocaleString();
  const unit = opts?.unit as string;
  return unit ? `${formatted} ${unit}` : formatted;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  info: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  unknown: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export function registerBuiltinRenderers(registry: CellRendererRegistry): void {
  registry.register('text', (v) => {
    const text = String(v ?? '-');
    return (
      <span className="block min-w-0 max-w-full truncate" title={text}>
        {text}
      </span>
    );
  });

  registry.register('badge', (v, _row, opts) => {
    if (v == null) return <span className="text-slate-400">-</span>;
    const str = String(v);
    const colorMap = (opts?.colorMap ?? {}) as Record<string, string>;
    const color = colorMap[str];
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          color ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        )}
      >
        {str}
      </span>
    );
  });

  registry.register('severity', (v) => {
    const level = String(v ?? 'unknown').toLowerCase();
    const color = SEVERITY_COLORS[level] ?? SEVERITY_COLORS.unknown;
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          color,
        )}
      >
        {level}
      </span>
    );
  });

  registry.register('timestamp', (v) => (
    <span className="tabular-nums text-slate-600 dark:text-slate-400">
      {formatTimeValue(v as TimeDisplayValue)}
    </span>
  ));

  registry.register('tags', (v) => {
    const items = Array.isArray(v)
      ? v.map(String)
      : typeof v === 'string'
        ? v.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    if (items.length === 0) return <span className="text-[var(--c-faint,#94a3b8)]">-</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex rounded border border-[var(--c-line,#e2e8f0)] bg-[var(--c-surface-2,#f1f5f9)] px-1.5 py-0.5 text-xs text-[var(--c-muted,#475569)]"
          >
            {item}
          </span>
        ))}
      </span>
    );
  });

  registry.register('link', (v) => {
    if (!v) return <span className="text-slate-400">-</span>;
    const href = String(v);
    return (
      <span className="block min-w-0 max-w-full truncate text-slate-700 dark:text-slate-300" title={href}>
        {href}
      </span>
    );
  });

  registry.register('code', (v) => (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
      {String(v ?? '')}
    </code>
  ));

  registry.register('boolean', (v) => {
    const bool = Boolean(v);
    return (
      <span className={bool ? 'text-emerald-600' : 'text-slate-400'}>
        {bool ? '✓' : '✗'}
      </span>
    );
  });

  registry.register('number', (v, _row, opts) => (
    <span className="tabular-nums">{formatNumber(v, opts)}</span>
  ));

  registry.register('json', (v) => {
    if (v == null) return <span className="text-slate-400">-</span>;
    const str =
      typeof v === 'object' ? JSON.stringify(v, null, 0) : String(v);
    return (
      <code className="block max-w-full truncate rounded bg-slate-50 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800/50">
        {str}
      </code>
    );
  });

  registry.register('list', (v) => {
    if (!Array.isArray(v) || v.length === 0)
      return <span className="text-slate-400">-</span>;
    return (
      <span className="block min-w-0 max-w-full truncate" title={v.join(', ')}>
        {v.length <= 3 ? v.join(', ') : `${v.slice(0, 3).join(', ')} +${v.length - 3}`}
      </span>
    );
  });
}

export const defaultCellRenderers = new CellRendererRegistry();
registerBuiltinRenderers(defaultCellRenderers);
