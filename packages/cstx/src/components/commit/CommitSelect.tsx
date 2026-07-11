import React, { useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/cn';
import { asCount } from '../../lib/coerce';
import { formatShortTimeValue, formatTimeValue, type TimeDisplayValue } from '../../lib/timeDisplay';
import { useClickOutside } from '../../lib/useClickOutside';
import type { CSTXStat } from '../../types';

export interface CstxCommitSummary {
  checkpoint_id?: string;
  commit_id?: string;
  created_at?: TimeDisplayValue;
  flow_id?: string | null;
  stats?: Partial<CSTXStat> & { threat?: number };
}

export interface CstxCommitSelectProps {
  label: string;
  commits: CstxCommitSummary[];
  value: string;
  onChange: (commitId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  getFlowLabel?: (commit: CstxCommitSummary) => string | null | undefined;
}

export const getCstxCommitId = (commit: CstxCommitSummary | undefined): string =>
  String(commit?.commit_id ?? commit?.checkpoint_id ?? '');

export const getCstxCommitValue = (commit: CstxCommitSummary | undefined): string =>
  String(commit?.checkpoint_id ?? commit?.commit_id ?? '');

export const getCstxCommitShortId = (
  commit: CstxCommitSummary | undefined,
  length = 4,
): string => {
  const id = getCstxCommitId(commit);
  return id ? id.slice(0, length) : '-';
};

export const getCstxCommitThreatCount = (commit: CstxCommitSummary | undefined): number =>
  asCount(commit?.stats?.threat ?? commit?.stats?.anchor_counts?.threat);

export const formatCstxCommitSelectLabel = (commit: CstxCommitSummary): string =>
  `${formatShortTimeValue(commit.created_at, '-')} · ${getCstxCommitShortId(commit)}`;

export const buildCstxCommitSearchText = (
  commit: CstxCommitSummary,
  flowLabel?: string | null,
): string => [
  getCstxCommitValue(commit),
  getCstxCommitId(commit),
  commit.flow_id,
  flowLabel,
  formatTimeValue(commit.created_at, ''),
  formatShortTimeValue(commit.created_at, ''),
  String(asCount(commit.stats?.nodes)),
  String(asCount(commit.stats?.edges)),
  String(getCstxCommitThreatCount(commit)),
].filter(Boolean).join(' ');

function CommitMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-12 text-right">
      <div className="text-[10px] leading-3 text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function CommitOption({
  commit,
  selected,
  flowLabel,
}: {
  commit: CstxCommitSummary;
  selected: boolean;
  flowLabel?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
            {formatTimeValue(commit.created_at, '-')}
          </span>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {getCstxCommitShortId(commit)}
          </span>
          {selected && <span className="shrink-0 text-[10px] text-blue-600 dark:text-blue-400">当前选择</span>}
        </div>
        {(flowLabel || commit.flow_id) && (
          <div className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
            Flow {flowLabel ?? String(commit.flow_id)}
          </div>
        )}
      </div>
      <div className="grid shrink-0 grid-cols-3 gap-3">
        <CommitMetric label="节点" value={asCount(commit.stats?.nodes)} />
        <CommitMetric label="边" value={asCount(commit.stats?.edges)} />
        <CommitMetric label="威胁" value={getCstxCommitThreatCount(commit)} />
      </div>
    </div>
  );
}

export function CstxCommitSelect({
  label,
  commits,
  value,
  onChange,
  placeholder = '选择 commit',
  searchPlaceholder = '搜索 commit、Flow、时间...',
  emptyText = '暂无 commit',
  disabled = false,
  className,
  triggerClassName,
  menuClassName,
  getFlowLabel,
}: CstxCommitSelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(rootRef, () => setOpen(false));

  const selectedCommit = useMemo(
    () => commits.find((commit) => getCstxCommitValue(commit) === value || getCstxCommitId(commit) === value),
    [commits, value],
  );

  const filteredCommits = useMemo(() => {
    const normalized = searchText.trim().toLocaleLowerCase();
    if (!normalized) return commits;
    return commits.filter((commit) => (
      buildCstxCommitSearchText(commit, getFlowLabel?.(commit)).toLocaleLowerCase().includes(normalized)
    ));
  }, [commits, getFlowLabel, searchText]);

  const handleSelect = (commit: CstxCommitSummary) => {
    const next = getCstxCommitValue(commit);
    if (!next) return;
    onChange(next);
    setOpen(false);
    setSearchText('');
  };

  return (
    <div ref={rootRef} className={cn('relative min-w-0 flex-1', className)}>
      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{label}</label>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 text-left text-xs text-slate-700 shadow-sm transition-colors',
          'hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
          'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
          triggerClassName,
        )}
      >
        <span className={cn('min-w-0 truncate', !selectedCommit && 'text-slate-400')}>
          {selectedCommit ? formatCstxCommitSelectLabel(selectedCommit) : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 z-50 mt-1 w-[min(36rem,calc(100vw-24px))] min-w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg',
            'dark:border-slate-700 dark:bg-slate-900',
            menuClassName,
          )}
        >
          <div className="flex h-9 items-center gap-2 border-b border-slate-100 px-2 dark:border-slate-800">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-full min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              autoFocus
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto overscroll-contain py-1" role="listbox">
            {filteredCommits.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">{emptyText}</div>
            ) : (
              filteredCommits.map((commit) => {
                const commitValue = getCstxCommitValue(commit);
                const selected = commitValue === value || getCstxCommitId(commit) === value;
                return (
                  <button
                    key={commitValue || getCstxCommitId(commit)}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(commit)}
                    className={cn(
                      'flex w-full min-w-0 items-start gap-2 px-2 py-2 text-left transition-colors',
                      'hover:bg-slate-50 dark:hover:bg-slate-800/80',
                      selected && 'bg-blue-50/60 dark:bg-blue-900/20',
                    )}
                  >
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0 text-blue-500', selected ? 'opacity-100' : 'opacity-0')} />
                    <CommitOption commit={commit} selected={selected} flowLabel={getFlowLabel?.(commit) ?? null} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

