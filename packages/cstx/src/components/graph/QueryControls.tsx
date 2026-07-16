import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn';

export const GRAPH_QUERY_LIMIT_OPTIONS = [100, 500, 1000, 2000, 5000, 10000] as const;

export function formatGraphQueryLimitLabel(limit: number): string {
    if (limit >= 1000) return `${limit / 1000}K`;
    return String(limit);
}

export interface GraphQueryControlsProps {
    limit: number;
    page: number;
    onLimitChange: (limit: number) => void;
    onPageChange: (page: number) => void;
    disabled?: boolean;
    compact?: boolean;
}

export function GraphQueryControls({
    limit,
    page,
    onLimitChange,
    onPageChange,
    disabled = false,
    compact = false,
}: GraphQueryControlsProps): React.JSX.Element {
    const limitOptions = useMemo(
        () => Array.from(new Set([...GRAPH_QUERY_LIMIT_OPTIONS, limit])).sort((a, b) => a - b),
        [limit],
    );

    const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

    return (
        <div
            className={cn('flex items-center gap-2', compact && 'shrink-0')}
            onClick={stopPropagation}
            onKeyDown={stopPropagation}
        >
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span>Limit</span>
                <select
                    value={String(limit)}
                    disabled={disabled}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    className={cn(
                        'h-7 rounded-md border border-slate-200 bg-transparent px-2 text-xs outline-none',
                        'focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
                        'dark:border-slate-600',
                        disabled && 'cursor-not-allowed opacity-50',
                    )}
                >
                    {limitOptions.map((opt) => (
                        <option key={opt} value={String(opt)}>
                            {formatGraphQueryLimitLabel(opt)}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span>Page</span>
                <div className="flex items-center overflow-hidden rounded-md border border-slate-200 dark:border-slate-600">
                    <button
                        type="button"
                        onClick={() => onPageChange(page - 1)}
                        disabled={disabled || page <= 1}
                        className="flex h-7 w-7 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <input
                        type="number"
                        min={1}
                        value={page}
                        disabled={disabled}
                        onChange={(e) => onPageChange(Number(e.target.value))}
                        className="h-7 w-14 border-x border-slate-200 bg-transparent px-1 text-center text-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
                    />
                    <button
                        type="button"
                        onClick={() => onPageChange(page + 1)}
                        disabled={disabled}
                        className="flex h-7 w-7 items-center justify-center text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 dark:hover:bg-slate-800"
                    >
                        <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>
            </label>
        </div>
    );
}
