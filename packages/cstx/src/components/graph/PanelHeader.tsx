import React from 'react';
import { Network } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { LayoutConfig } from '../../types/graph';

export interface GraphPanelHeaderProps {
    title: string;
    subtitle?: string | null;
    titleExtra?: React.ReactNode;
    layoutConfigs: Record<string, LayoutConfig>;
    layoutType: string;
    expandedLayoutButton: string | null;
    onLayoutChange: (type: string) => void;
    onExpandedLayoutButtonChange: (type: string | null) => void;
    disabled?: boolean;
    icon?: React.ReactNode;
    leftExtra?: React.ReactNode;
}

export function GraphPanelHeader({
    title,
    subtitle,
    titleExtra,
    layoutConfigs,
    layoutType,
    expandedLayoutButton,
    onLayoutChange,
    onExpandedLayoutButtonChange,
    disabled = false,
    icon,
    leftExtra,
}: GraphPanelHeaderProps): React.JSX.Element {
    return (
        <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="mb-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2">
                    {leftExtra}
                    <div className="flex-shrink-0 rounded-lg bg-slate-50 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {icon ?? <Network className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{title}</h2>
                            {titleExtra}
                        </div>
                        {subtitle && (
                            <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-start lg:justify-end">
                    <div className="flex flex-wrap items-center gap-2">
                        {Object.entries(layoutConfigs).map(([type, config]) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    if (expandedLayoutButton === type) {
                                        onExpandedLayoutButtonChange(null);
                                    } else {
                                        onExpandedLayoutButtonChange(type);
                                        if (layoutType !== type) onLayoutChange(type);
                                    }
                                }}
                                disabled={disabled}
                                title={config.description}
                                className={cn(
                                    'flex items-center justify-center rounded-lg border p-2 transition-all',
                                    layoutType === type
                                        ? 'border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-400'
                                        : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                                    disabled && 'cursor-not-allowed opacity-50',
                                )}
                            >
                                <config.icon className="h-4 w-4 flex-shrink-0" />
                                {expandedLayoutButton === type && (
                                    <span className="ml-2 whitespace-nowrap text-sm font-medium">
                                        {config.name}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
