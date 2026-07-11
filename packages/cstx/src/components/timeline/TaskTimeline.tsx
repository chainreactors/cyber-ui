import React, {useMemo} from 'react';
import {Activity, Zap, Layers, Clock, Database, AlertTriangle} from 'lucide-react';
import {Badge} from '@cyber/ui';
import {DataState} from '../primitives';
import {formatShortTimeValue} from '../../lib/timeDisplay';

export interface TaskGraphStats {
    nodes?: number;
    edges?: number;
    node_type_counts?: Record<string, number>;
    delta?: {
        added_nodes?: number;
        updated_nodes?: number;
        removed_nodes?: number;
        added_edges?: number;
        updated_edges?: number;
        removed_edges?: number;
    } | null;
}

export interface TaskWithStats {
    task_id: string;
    name: string;
    status?: string;
    task_time?: number;
    count?: number;
    artifact?: string;
    operation?: string;
    error?: string;
    graph_stats?: TaskGraphStats | null;
}

export interface TaskTimelineProps {
    tasks: TaskWithStats[];
    loading?: boolean;
    compact?: boolean;
    onTaskClick?: (task: TaskWithStats) => void;
    renderStatusIcon?: (status: string | undefined) => React.ReactNode;
    getStatusColor?: (status: string | undefined) => string;
}

const formatTimestamp = (epoch: number | undefined): string => {
    if (!epoch) return '';
    return formatShortTimeValue(epoch);
};

const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value}`;

const deltaText = (stats: TaskGraphStats | null | undefined): string | null => {
    if (!stats?.delta) return null;
    const d = stats.delta;
    const parts: string[] = [];
    if (d.added_nodes) parts.push(`${formatSigned(d.added_nodes)} nodes`);
    if (d.updated_nodes) parts.push(`${d.updated_nodes} updated`);
    if (d.added_edges) parts.push(`${formatSigned(d.added_edges)} edges`);
    return parts.length > 0 ? parts.join(' / ') : null;
};

const topTypes = (stats: TaskGraphStats | null | undefined, max = 3): string | null => {
    const counts = stats?.node_type_counts;
    if (!counts) return null;
    const entries = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, max);
    if (entries.length === 0) return null;
    return entries.map(([t, n]) => `${t}(${n})`).join(', ');
};

const defaultStatusIcon = (status: string | undefined): React.ReactNode => {
    const s = String(status ?? '').toLowerCase();
    if (s === 'completed') return <Zap className="w-3 h-3 text-emerald-500" />;
    if (s === 'failed') return <AlertTriangle className="w-3 h-3 text-red-500" />;
    return <Activity className="w-3 h-3 text-gray-400" />;
};

export function TaskTimeline({
    tasks,
    loading,
    compact,
    onTaskClick,
    renderStatusIcon = defaultStatusIcon,
}: TaskTimelineProps) {
    const sorted = useMemo(
        () => [...tasks].sort((a, b) => (b.task_time ?? 0) - (a.task_time ?? 0)),
        [tasks],
    );

    const totals = useMemo(() => {
        let addedNodes = 0;
        let addedEdges = 0;
        let completed = 0;
        let failed = 0;
        for (const t of tasks) {
            const status = String(t.status ?? '').toLowerCase();
            const d = t.graph_stats?.delta;
            if (d) {
                addedNodes += d.added_nodes ?? 0;
                addedEdges += d.added_edges ?? 0;
            }
            if (status === 'completed') completed++;
            if (status === 'failed') failed++;
        }
        return {total: tasks.length, addedNodes, addedEdges, completed, failed};
    }, [tasks]);

    if (loading) return <DataState loading loadingText="Loading task timeline..." />;
    if (sorted.length === 0) {
        return compact
            ? <div className="text-xs text-gray-400 py-2">No tasks</div>
            : <DataState empty emptyText="No task data" emptyHint="Tasks will appear after flow execution" icon={Clock} />;
    }

    const timeline = (
        <div className="relative">
            {sorted.map((task, idx) => {
                const isLatest = idx === 0;
                const dt = deltaText(task.graph_stats);
                const types = topTypes(task.graph_stats);
                const status = String(task.status ?? '').toLowerCase();
                const errorText = typeof task.error === 'string' ? task.error.trim() : '';
                return (
                    <div
                        key={task.task_id}
                        className="relative pl-7 py-2 border-l-2 border-gray-200 cursor-pointer hover:bg-interactive-hover rounded-r-md transition-colors"
                        onClick={() => onTaskClick?.(task)}
                    >
                        <div className={`absolute left-[-5px] top-[12px] w-2.5 h-2.5 rounded-full border-2 ${
                            isLatest ? 'bg-blue-400 border-blue-400'
                                : status === 'failed' ? 'bg-red-400 border-red-400'
                                    : 'bg-white border-gray-300'
                        }`}/>

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {renderStatusIcon(task.status)}
                                <span className="text-[13px] font-medium text-gray-900 truncate">
                                    {task.name}
                                </span>
                                {task.artifact && (
                                    <span className="inline-flex items-center gap-0.5 rounded border border-purple-200 bg-purple-50 px-1 py-0 text-[10px] text-purple-700 shrink-0">
                                        <Database className="w-2.5 h-2.5"/>
                                        {task.artifact}
                                    </span>
                                )}
                                {task.operation && task.operation !== 'baseline' && (
                                    <span className="inline-flex items-center gap-0.5 rounded border border-orange-200 bg-orange-50 px-1 py-0 text-[10px] text-orange-700 shrink-0">
                                        <Zap className="w-2.5 h-2.5"/>
                                        {task.operation}
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
                                {formatTimestamp(task.task_time)}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 pl-5">
                            {task.count != null && task.count > 0 && (
                                <span>{task.count} results</span>
                            )}
                            {dt && <span className="text-emerald-600">{dt}</span>}
                            {types && <span className="text-gray-400 truncate max-w-[220px]">{types}</span>}
                        </div>

                        {errorText && (
                            <div
                                className="mt-1 ml-5 flex items-start gap-1.5 rounded border border-red-100 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0"/>
                                <span className="min-w-0 max-h-8 overflow-hidden break-words"
                                      title={errorText}>{errorText}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    if (compact) return timeline;

    return (
        <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    {label: 'Total Tasks', value: totals.total, icon: Activity},
                    {label: 'Completed', value: totals.completed, icon: Zap},
                    {label: 'Failed', value: totals.failed, icon: Activity},
                    {label: 'Added Nodes', value: totals.addedNodes, icon: Layers},
                    {label: 'Added Edges', value: totals.addedEdges, icon: Layers},
                ].map(({label, value, icon: Icon}) => (
                    <div key={label} className="p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3.5 h-3.5 text-gray-400"/>
                            <span className="text-xs text-gray-500">{label}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            <div className="p-3 border border-gray-200 rounded-lg bg-white">
                <div className="text-xs font-semibold text-gray-600 mb-3">Task Timeline</div>
                {timeline}
            </div>
        </div>
    );
}
