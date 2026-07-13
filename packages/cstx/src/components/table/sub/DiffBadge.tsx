import React from 'react';
import { cn } from '../../../lib/cn';

const CHANGE_KIND_CONFIG: Record<string, { label: string; bg: string; text: string; rowBg: string }> = {
  added: { label: 'Added', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', rowBg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
  updated: { label: 'Updated', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', rowBg: 'bg-amber-50/50 dark:bg-amber-900/10' },
  inactive: { label: 'Inactive', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', rowBg: 'bg-red-50/50 dark:bg-red-900/10' },
  removed: { label: 'Removed', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', rowBg: 'bg-red-50/50 dark:bg-red-900/10' },
  reactivated: { label: 'Reactivated', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', rowBg: 'bg-blue-50/50 dark:bg-blue-900/10' },
};

export function getDiffRowClass(changeKind: string | undefined): string {
  if (!changeKind) return '';
  return CHANGE_KIND_CONFIG[changeKind]?.rowBg ?? '';
}

export function DiffBadge({ changeKind }: { changeKind: string | undefined }) {
  if (!changeKind) return <span className="text-slate-400">-</span>;
  const cfg = CHANGE_KIND_CONFIG[changeKind];
  if (!cfg) return <span className="text-xs text-slate-400">{changeKind}</span>;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', cfg.bg, cfg.text)}>
      {cfg.label}
    </span>
  );
}

export interface DiffSummaryBarProps {
  rows: Array<Record<string, unknown>>;
  diffField: string;
  compact?: boolean;
}

export function DiffSummaryBar({ rows, diffField, compact }: DiffSummaryBarProps) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const kind = String(row[diffField] ?? '');
    if (kind) counts[kind] = (counts[kind] || 0) + 1;
  }

  const entries = Object.entries(counts).sort(([a], [b]) => {
    const order = ['added', 'updated', 'reactivated', 'inactive', 'removed'];
    return order.indexOf(a) - order.indexOf(b);
  });

  if (entries.length === 0) return null;

  return (
    <div className={cn(
      'flex items-center gap-3 bg-slate-50/40 dark:bg-slate-800/20',
      compact ? 'px-3 py-1' : 'px-4 py-1.5',
    )}>
      <span className="text-[11px] text-slate-400 dark:text-slate-500">Changes:</span>
      {entries.map(([kind, count]) => {
        const cfg = CHANGE_KIND_CONFIG[kind];
        const prefix = kind === 'added' ? '+' : kind === 'updated' || kind === 'reactivated' ? '~' : '-';
        return (
          <span key={kind} className={cn('text-[11px] font-medium tabular-nums', cfg?.text ?? 'text-slate-500')}>
            {prefix}{count} {cfg?.label ?? kind}
          </span>
        );
      })}
    </div>
  );
}
