import React from 'react';
import * as icons from 'lucide-react';
import type { RuntimeComponentProps } from '../../runtime/registry';
import type { Tone } from '../../types/common';
import { cn } from '../../lib/cn';
import { CARD_CLASS } from '../primitives/Card';

const TONE_STYLES: Record<Tone, { bg: string; icon: string; text: string }> = {
  slate:   { bg: 'bg-slate-100 dark:bg-slate-800',     icon: 'text-slate-600 dark:text-slate-300',   text: 'text-slate-500 dark:text-slate-400' },
  blue:    { bg: 'bg-blue-100 dark:bg-blue-900/50',    icon: 'text-blue-600 dark:text-blue-400',     text: 'text-blue-500 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/50', icon: 'text-emerald-600 dark:text-emerald-400', text: 'text-emerald-500 dark:text-emerald-400' },
  amber:   { bg: 'bg-amber-100 dark:bg-amber-900/50',  icon: 'text-amber-600 dark:text-amber-400',   text: 'text-amber-500 dark:text-amber-400' },
  rose:    { bg: 'bg-rose-100 dark:bg-rose-900/50',    icon: 'text-rose-600 dark:text-rose-400',     text: 'text-rose-500 dark:text-rose-400' },
  violet:  { bg: 'bg-violet-100 dark:bg-violet-900/50', icon: 'text-violet-600 dark:text-violet-400', text: 'text-violet-500 dark:text-violet-400' },
  cyan:    { bg: 'bg-cyan-100 dark:bg-cyan-900/50',    icon: 'text-cyan-600 dark:text-cyan-400',     text: 'text-cyan-500 dark:text-cyan-400' },
  teal:    { bg: 'bg-teal-100 dark:bg-teal-900/50',    icon: 'text-teal-600 dark:text-teal-400',     text: 'text-teal-500 dark:text-teal-400' },
  orange:  { bg: 'bg-orange-100 dark:bg-orange-900/50', icon: 'text-orange-600 dark:text-orange-400', text: 'text-orange-500 dark:text-orange-400' },
};

const CHANGE_COLORS = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-500 dark:text-slate-400',
} as const;

function resolveIcon(name: string): icons.LucideIcon | null {
  if (!name) return null;
  return (icons as Record<string, unknown>)[name] as icons.LucideIcon | undefined ?? null;
}

export function StatCard({ data, loading, config }: RuntimeComponentProps): React.JSX.Element {
  const title = config.title as string;
  const description = config.description as string;
  const tone = (config.tone as Tone) || 'slate';
  const iconName = config.icon as string;
  const change = config.change as string;
  const changeType = (config.changeType as keyof typeof CHANGE_COLORS) || 'neutral';

  const metric = data.metric;
  const isLoading = loading.metric;
  const styles = TONE_STYLES[tone];
  const Icon = resolveIcon(iconName);

  return (
    <div className={cn(CARD_CLASS, 'p-4')}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {isLoading ? (
              <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            ) : (
              String(metric ?? '-')
            )}
          </p>
          {change && (
            <p className={cn('mt-1 text-xs font-medium', CHANGE_COLORS[changeType])}>
              {change}
            </p>
          )}
          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', styles.bg)}>
            <Icon className={cn('h-5 w-5', styles.icon)} />
          </div>
        )}
      </div>
    </div>
  );
}
