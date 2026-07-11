import React from 'react';
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface GraphToolbarProps {
    title: string;
    titleExtra?: React.ReactNode;
    children?: React.ReactNode;
    onToggleStatistics?: () => void;
    statisticsDisabled?: boolean;
    statisticsLabel?: string;
    onReload?: () => void;
    reloading?: boolean;
    reloadDisabled?: boolean;
    reloadLabel?: string;
    reloadingLabel?: string;
}

export function GraphToolbar({
    title,
    titleExtra,
    children,
    onToggleStatistics,
    statisticsDisabled = false,
    statisticsLabel = 'Statistics',
    onReload,
    reloading = false,
    reloadDisabled = false,
    reloadLabel = 'Reload',
    reloadingLabel = 'Loading...',
}: GraphToolbarProps): React.JSX.Element {
    return (
        <div className="flex-shrink-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold">{title}</h1>
                        {titleExtra}
                    </div>
                    <div className="flex items-center gap-2">
                        {children}
                        {onToggleStatistics && (
                            <button
                                type="button"
                                onClick={onToggleStatistics}
                                disabled={statisticsDisabled}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                                    'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800',
                                    statisticsDisabled && 'cursor-not-allowed opacity-50',
                                )}
                            >
                                <BarChart3 className="h-4 w-4" />
                                {statisticsLabel}
                            </button>
                        )}
                        {onReload && (
                            <button
                                type="button"
                                onClick={onReload}
                                disabled={reloading || reloadDisabled}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                                    'border-slate-200 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800',
                                    (reloading || reloadDisabled) && 'cursor-not-allowed opacity-50',
                                )}
                            >
                                {reloading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {reloadingLabel}
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        {reloadLabel}
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
