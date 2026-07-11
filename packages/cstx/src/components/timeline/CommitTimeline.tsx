import React, {useState, useMemo, useCallback, useEffect} from 'react';
import {
    Clock, Hash, Activity, GitCompare, Database, Layers, ExternalLink, Target, ChevronRight, Search, Loader2,
} from 'lucide-react';
import {Badge, Button} from '@cyber/ui';
import {DataState} from '../primitives';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    CstxCommitSelect,
    formatCstxCommitSelectLabel,
    getCstxCommitShortId,
    getCstxCommitThreatCount,
} from '../commit/CommitSelect';
import {formatShortTimeValue, formatTimeValue} from '../../lib/timeDisplay';
import {DiffMetricCard, DiffObjectChangeSvg} from '../commit/DiffWidgets';
import {TaskTimeline, type TaskWithStats} from './TaskTimeline';

export interface CheckpointSummary {
    checkpoint_id: string;
    created_at: string | number;
    flow_id?: string;
    task_id?: string;
    stats: {
        nodes: number;
        edges: number;
        node_type_counts: Record<string, number>;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface CstxDiffSummary {
    added_nodes?: number;
    removed_nodes?: number;
    modified_nodes?: number;
    added_edges?: number;
    removed_edges?: number;
    modified_edges?: number;
    added?: number;
    removed?: number;
    modified?: number;
    total_changes?: number;
    [key: string]: unknown;
}

export interface CommitTimelineProps {
    checkpoints: CheckpointSummary[];
    loading: boolean;
    emptyText?: string;
    emptyHint?: string;
    onPreviewCheckpoint?: (checkpointId: string) => void;
    onOpenCheckpoint?: (checkpointId: string) => void;
    onOpenDiff?: (base: string, head: string) => void;
    idLabel?: string;
    idValue?: string | null;
    fetchTasksForFlow?: (flowId: string) => Promise<TaskWithStats[]>;
    onTaskClick?: (task: TaskWithStats) => void;
    flowPipelineMap?: Record<string, string>;
    onFetchDiffSummary?: (base: string, head: string) => Promise<CstxDiffSummary | null>;
    renderCommitId?: (checkpointId: string, shortId: string) => React.ReactNode;
    renderFlowChip?: (flowId: string) => React.ReactNode;
}

type TrendDataKey = 'nodes' | 'edges' | 'threat';
type TrendPoint = Record<TrendDataKey, number> & {label: string; checkpointId: string};
type TrendDotProps = {
    cx?: number;
    cy?: number;
    fill?: string;
    stroke?: string;
    payload?: TrendPoint;
};

const formatTime = (ts: number | string) => formatTimeValue(ts, '');
const formatShortTime = (ts: number | string) => formatShortTimeValue(ts, '');
const toCheckpointTimestamp = (value: number | string): number => {
    if (typeof value === 'number') {
        return value > 1e12 ? value : value * 1000;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const threatCount = (cp: CheckpointSummary | undefined): number => getCstxCommitThreatCount(cp);
const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${value}`;
const formatTrend = (from: number, to: number): string => `${from} -> ${to} (${formatSigned(to - from)})`;
const formatCountTrend = (from: number | undefined, to: number | undefined): string => {
    const safeFrom = Number(from ?? 0);
    const safeTo = Number(to ?? 0);
    return `${safeFrom.toLocaleString()} -> ${safeTo.toLocaleString()} (${formatSigned(safeTo - safeFrom)})`;
};

const makeTrendDomain = (data: TrendPoint[], keys: TrendDataKey[]): [number, number] => {
    const values = data
        .flatMap(item => keys.map(key => item[key]))
        .filter((value): value is number => Number.isFinite(value));
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const padding = Math.max(1, Math.ceil((range || Math.max(Math.abs(max), 1)) * 0.08));
    const lowerBound = min <= 0 ? 0 : Math.max(1, min - padding);
    return [lowerBound, max + padding];
};

const sortCheckpointsNewestFirst = (items: CheckpointSummary[]): CheckpointSummary[] =>
    [...items].sort((a, b) => toCheckpointTimestamp(b.created_at) - toCheckpointTimestamp(a.created_at));

export function CommitTimeline({
    checkpoints,
    loading,
    emptyText = 'No commit data',
    emptyHint = 'Commits will appear after task execution',
    onPreviewCheckpoint,
    onOpenCheckpoint,
    onOpenDiff,
    idLabel,
    idValue,
    fetchTasksForFlow,
    onTaskClick,
    flowPipelineMap = {},
    onFetchDiffSummary,
    renderCommitId,
    renderFlowChip,
}: CommitTimelineProps) {
    const [diffBase, setDiffBase] = useState('');
    const [diffHead, setDiffHead] = useState('');
    const [expandedCkpts, setExpandedCkpts] = useState<Set<string>>(new Set());
    const [taskCache, setTaskCache] = useState<Record<string, TaskWithStats[]>>({});
    const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
    const [diffSummary, setDiffSummary] = useState<CstxDiffSummary | null>(null);
    const [diffSummaryLoading, setDiffSummaryLoading] = useState(false);
    const [diffSummaryError, setDiffSummaryError] = useState('');

    const orderedCheckpoints = useMemo(
        () => sortCheckpointsNewestFirst(checkpoints),
        [checkpoints],
    );
    const canDiff = Boolean(diffBase && diffHead && diffBase !== diffHead);

    const toggleExpand = useCallback((cpId: string, flowId: string | undefined) => {
        if (!flowId || !fetchTasksForFlow) return;
        setExpandedCkpts(prev => {
            const next = new Set(prev);
            if (next.has(cpId)) {
                next.delete(cpId);
            } else {
                next.add(cpId);
                if (!taskCache[flowId]) {
                    setLoadingTasks(p => new Set(p).add(cpId));
                    fetchTasksForFlow(flowId)
                        .then(tasks => setTaskCache(c => ({...c, [flowId]: tasks})))
                        .catch(() => setTaskCache(c => ({...c, [flowId]: []})))
                        .finally(() => setLoadingTasks(p => {
                            const n = new Set(p);
                            n.delete(cpId);
                            return n;
                        }));
                }
            }
            return next;
        });
    }, [fetchTasksForFlow, taskCache]);

    React.useEffect(() => {
        if (orderedCheckpoints.length < 2) {
            setDiffBase('');
            setDiffHead('');
            return;
        }
        const validIds = new Set(orderedCheckpoints.map(cp => cp.checkpoint_id));
        setDiffBase(current => (validIds.has(current) ? current : orderedCheckpoints[1].checkpoint_id));
        setDiffHead(current => (validIds.has(current) ? current : orderedCheckpoints[0].checkpoint_id));
    }, [orderedCheckpoints]);

    useEffect(() => {
        if (!canDiff || !onFetchDiffSummary) {
            setDiffSummary(null);
            setDiffSummaryError('');
            setDiffSummaryLoading(false);
            return;
        }

        let cancelled = false;
        setDiffSummaryLoading(true);
        setDiffSummaryError('');
        onFetchDiffSummary(diffBase, diffHead)
            .then(summary => {
                if (cancelled) return;
                setDiffSummary(summary);
                setDiffSummaryError(summary ? '' : 'No diff summary returned');
            })
            .catch(error => {
                if (cancelled) return;
                setDiffSummary(null);
                setDiffSummaryError(error instanceof Error ? error.message : String(error));
            })
            .finally(() => {
                if (!cancelled) setDiffSummaryLoading(false);
            });

        return () => { cancelled = true; };
    }, [canDiff, diffBase, diffHead, onFetchDiffSummary]);

    const renderTrendDot = useCallback((props: TrendDotProps) => {
        const {cx, cy, fill, stroke, payload} = props;
        if (typeof cx !== 'number' || typeof cy !== 'number') {
            return <circle cx={0} cy={0} r={0}/>;
        }
        const checkpointId = payload?.checkpointId ?? '';
        return (
            <circle
                key={`trend-dot-${checkpointId || `${cx}-${cy}`}-${stroke ?? fill ?? 'default'}`}
                cx={cx}
                cy={cy}
                r={3.5}
                fill={stroke ?? fill ?? '#3b82f6'}
                stroke="var(--card)"
                strokeWidth={1.5}
                className="cursor-pointer"
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (checkpointId && onOpenCheckpoint) onOpenCheckpoint(checkpointId);
                }}
            >
                <title>Double-click to view commit</title>
            </circle>
        );
    }, [onOpenCheckpoint]);

    const latest = orderedCheckpoints[0];
    const oldest = orderedCheckpoints[orderedCheckpoints.length - 1];

    const trendData = useMemo<TrendPoint[]>(() =>
        [...orderedCheckpoints].reverse().map(cp => ({
            label: formatShortTime(cp.created_at),
            checkpointId: cp.checkpoint_id,
            nodes: cp.stats?.nodes ?? 0,
            edges: cp.stats?.edges ?? 0,
            threat: threatCount(cp),
        })),
    [orderedCheckpoints]);
    const graphTrendDomain = useMemo(() => makeTrendDomain(trendData, ['nodes', 'edges']), [trendData]);
    const threatTrendDomain = useMemo(() => makeTrendDomain(trendData, ['threat']), [trendData]);

    const nodeTypeCounts = useMemo(
        () => latest?.stats?.node_type_counts ?? {},
        [latest?.stats?.node_type_counts],
    );
    const nodeTypeData = useMemo(() =>
        Object.entries(nodeTypeCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, value]) => ({name, value})),
    [nodeTypeCounts]);
    const selectedBase = useMemo(
        () => orderedCheckpoints.find(cp => cp.checkpoint_id === diffBase),
        [diffBase, orderedCheckpoints],
    );
    const selectedHead = useMemo(
        () => orderedCheckpoints.find(cp => cp.checkpoint_id === diffHead),
        [diffHead, orderedCheckpoints],
    );
    const selectedThreatDelta = selectedBase && selectedHead
        ? threatCount(selectedHead) - threatCount(selectedBase)
        : 0;

    if (loading) return <DataState loading loadingText="Loading commit data..." />;
    if (orderedCheckpoints.length === 0) {
        return <DataState empty emptyText={emptyText} emptyHint={emptyHint} icon={Clock} />;
    }

    const latestThreats = threatCount(latest);
    const oldestThreats = threatCount(oldest);
    const nodeTrendLabel = orderedCheckpoints.length > 1 && oldest && latest
        ? formatTrend(oldest.stats.nodes, latest.stats.nodes)
        : `${latest?.stats?.nodes ?? 0}`;
    const edgeTrendLabel = orderedCheckpoints.length > 1 && oldest && latest
        ? formatTrend(oldest.stats.edges, latest.stats.edges)
        : `${latest?.stats?.edges ?? 0}`;
    const threatTrendLabel = orderedCheckpoints.length > 1
        ? formatTrend(oldestThreats, latestThreats)
        : `${latestThreats}`;

    return (
        <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    {label: 'Total Commits', value: checkpoints.length, icon: Database},
                    {label: 'Current Nodes', value: latest?.stats?.nodes ?? 0, icon: Activity},
                    {label: 'Current Edges', value: latest?.stats?.edges ?? 0, icon: Layers},
                    {label: 'Current Threats', value: latestThreats, icon: Target},
                    {label: 'Type Coverage', value: Object.keys(nodeTypeCounts).length, icon: Hash},
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

            {idLabel && idValue && (
                <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Info</div>
                    <div className="grid gap-1 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">{idLabel}</span>
                            <span className="font-mono text-gray-700">{idValue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">First execution</span>
                            <span className="text-gray-700">{oldest ? formatTime(oldest.created_at) : '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">Latest execution</span>
                            <span className="text-gray-700">{latest ? formatTime(latest.created_at) : '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">Node trend</span>
                            <span className="text-gray-700">{nodeTrendLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">Edge trend</span>
                            <span className="text-gray-700">{edgeTrendLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">Threat trend</span>
                            <span className="text-gray-700">{threatTrendLabel}</span>
                        </div>
                    </div>
                </div>
            )}

            {trendData.length > 1 && (
                <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Asset Trend</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                            <XAxis dataKey="label" tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                            <YAxis yAxisId="graph" tick={{fontSize: 10}} tickLine={false} axisLine={false} domain={graphTrendDomain} allowDecimals={false}/>
                            <YAxis yAxisId="threat" orientation="right" tick={{fontSize: 10, fill: '#f59e0b'}} tickLine={false} axisLine={false} domain={threatTrendDomain} allowDecimals={false}/>
                            <Tooltip contentStyle={{fontSize: 12}}/>
                            <Legend wrapperStyle={{fontSize: 11}}/>
                            <Line yAxisId="graph" type="monotone" dataKey="nodes" stroke="#3b82f6" strokeWidth={2} dot={renderTrendDot} activeDot={renderTrendDot} name="Nodes"/>
                            <Line yAxisId="graph" type="monotone" dataKey="edges" stroke="#10b981" strokeWidth={2} dot={renderTrendDot} activeDot={renderTrendDot} strokeDasharray="5 3" name="Edges"/>
                            <Line yAxisId="threat" type="monotone" dataKey="threat" stroke="#f59e0b" strokeWidth={2} dot={renderTrendDot} activeDot={renderTrendDot} strokeDasharray="2 3" name="Threats"/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="p-3 border border-gray-200 rounded-lg bg-white">
                <div className="text-xs font-semibold text-gray-600 mb-3">Commit Timeline</div>
                <div className="relative">
                    {orderedCheckpoints.map((cp, idx) => {
                        const isFirst = idx === orderedCheckpoints.length - 1;
                        const isLatest = idx === 0;
                        const prev = idx < orderedCheckpoints.length - 1 ? orderedCheckpoints[idx + 1] : null;
                        const nodeDelta = prev ? cp.stats.nodes - prev.stats.nodes : 0;
                        const edgeDelta = prev ? cp.stats.edges - prev.stats.edges : 0;
                        const currentThreats = threatCount(cp);
                        const threatDelta = prev ? currentThreats - threatCount(prev) : 0;

                        return (
                            <div
                                key={cp.checkpoint_id}
                                className="relative pl-7 py-2.5 border-l-2 border-gray-200"
                            >
                                <div className={`absolute left-[-5px] top-[14px] w-2.5 h-2.5 rounded-full border-2 ${
                                    isLatest ? 'bg-blue-400 border-blue-400' : 'bg-white border-gray-300'
                                }`}/>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatShortTime(cp.created_at)}
                                        </span>
                                        {renderCommitId
                                            ? renderCommitId(cp.checkpoint_id, getCstxCommitShortId(cp))
                                            : (
                                                <Badge variant="outline" className="min-h-4 px-1 py-0 text-[10px] font-mono">
                                                    {getCstxCommitShortId(cp)}
                                                </Badge>
                                            )
                                        }
                                        {cp.flow_id && renderFlowChip && renderFlowChip(cp.flow_id)}
                                        {isLatest && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200">
                                                Latest
                                            </Badge>
                                        )}
                                    </div>
                                    {(onPreviewCheckpoint || onOpenCheckpoint) && (
                                        <div className="flex items-center gap-1">
                                            {onPreviewCheckpoint && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Quick preview"
                                                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                                                    onClick={() => onPreviewCheckpoint(cp.checkpoint_id)}
                                                >
                                                    <Search className="w-3 h-3 mr-1"/>
                                                    Preview
                                                </Button>
                                            )}
                                            {onOpenCheckpoint && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    title="Open in new page"
                                                    className="h-6 px-2 text-xs text-slate-600 hover:text-slate-800"
                                                    onClick={() => onOpenCheckpoint(cp.checkpoint_id)}
                                                >
                                                    <ExternalLink className="w-3 h-3 mr-1"/>
                                                    Open
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                    <span>{cp.stats.nodes} nodes &middot; {cp.stats.edges} edges &middot; {currentThreats} threats</span>
                                    {isFirst ? (
                                        <span className="text-emerald-600">Initial commit</span>
                                    ) : (
                                        <span className="text-gray-400">
                                            <span className={nodeDelta > 0 ? 'text-green-600' : nodeDelta < 0 ? 'text-red-500' : ''}>
                                                {formatSigned(nodeDelta)} nodes
                                            </span>
                                            <span className="mx-1">&middot;</span>
                                            <span className={edgeDelta > 0 ? 'text-green-600' : edgeDelta < 0 ? 'text-red-500' : ''}>
                                                {formatSigned(edgeDelta)} edges
                                            </span>
                                            <span className="mx-1">&middot;</span>
                                            <span className={threatDelta > 0 ? 'text-green-600' : threatDelta < 0 ? 'text-red-500' : ''}>
                                                {formatSigned(threatDelta)} threats
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {fetchTasksForFlow && cp.flow_id && (
                                    <>
                                        <button
                                            type="button"
                                            className="flex items-center gap-1 mt-1.5 text-xs text-gray-400 hover:text-foreground transition-colors"
                                            onClick={(e) => { e.stopPropagation(); toggleExpand(cp.checkpoint_id, cp.flow_id); }}
                                        >
                                            <ChevronRight className={`w-3 h-3 transition-transform duration-150 ${expandedCkpts.has(cp.checkpoint_id) ? 'rotate-90' : ''}`}/>
                                            <span>{expandedCkpts.has(cp.checkpoint_id) ? 'Collapse tasks' : 'Expand tasks'}</span>
                                        </button>
                                        {expandedCkpts.has(cp.checkpoint_id) && (
                                            <div className="mt-2 ml-1 pl-3 border-l border-dashed border-gray-200">
                                                <TaskTimeline
                                                    tasks={taskCache[cp.flow_id] ?? []}
                                                    loading={loadingTasks.has(cp.checkpoint_id)}
                                                    onTaskClick={onTaskClick}
                                                    compact
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {orderedCheckpoints.length >= 2 && (
                <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-3">Diff Analysis</div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] lg:items-end">
                        <CstxCommitSelect
                            label="Base"
                            commits={orderedCheckpoints}
                            value={diffBase}
                            onChange={setDiffBase}
                        />
                        <div className="hidden h-9 items-center justify-center lg:flex">
                            <GitCompare className="w-4 h-4 text-gray-400"/>
                        </div>
                        <CstxCommitSelect
                            label="Head"
                            commits={orderedCheckpoints}
                            value={diffHead}
                            onChange={setDiffHead}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={!canDiff || !onOpenDiff}
                            onClick={() => canDiff && onOpenDiff?.(diffBase, diffHead)}
                            className="h-9 w-full justify-center border-slate-300 bg-white px-3 text-xs text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:w-auto"
                        >
                            <ExternalLink className="w-3.5 h-3.5 mr-1"/>
                            Open Diff
                        </Button>
                    </div>
                    {canDiff && (
                        <div className="mt-3 rounded-md border border-border bg-muted/60 p-3">
                            <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 text-xs">
                                <span className="text-slate-500">Diff range</span>
                                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-slate-100">
                                    {selectedBase ? formatCstxCommitSelectLabel(selectedBase) : '-'}
                                </span>
                                <GitCompare className="h-3.5 w-3.5 text-slate-400"/>
                                <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-slate-100">
                                    {selectedHead ? formatCstxCommitSelectLabel(selectedHead) : '-'}
                                </span>
                                <span className="text-slate-400">Summary shown here, open diff for full details</span>
                            </div>
                            {diffSummaryLoading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin"/>
                                    Computing diff summary...
                                </div>
                            ) : diffSummaryError ? (
                                <div className="text-xs text-red-500">{diffSummaryError}</div>
                            ) : diffSummary ? (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                                    <DiffMetricCard
                                        label="Node Count"
                                        totalLabel="Base -> Head"
                                        totalValue={formatCountTrend(selectedBase?.stats.nodes, selectedHead?.stats.nodes)}
                                    >
                                        <DiffObjectChangeSvg
                                            added={diffSummary.added_nodes ?? 0}
                                            removed={diffSummary.removed_nodes ?? 0}
                                            modified={diffSummary.modified_nodes ?? 0}
                                        />
                                    </DiffMetricCard>
                                    <DiffMetricCard
                                        label="Edge Count"
                                        totalLabel="Base -> Head"
                                        totalValue={formatCountTrend(selectedBase?.stats.edges, selectedHead?.stats.edges)}
                                    >
                                        <DiffObjectChangeSvg
                                            added={diffSummary.added_edges ?? 0}
                                            removed={diffSummary.removed_edges ?? 0}
                                            modified={diffSummary.modified_edges ?? 0}
                                        />
                                    </DiffMetricCard>
                                    <DiffMetricCard
                                        label="Threat Count"
                                        totalLabel="Base -> Head"
                                        totalValue={`${threatCount(selectedBase)} -> ${threatCount(selectedHead)} (${formatSigned(selectedThreatDelta)})`}
                                    />
                                    <DiffMetricCard
                                        label="Object Changes"
                                        totalLabel="Total"
                                        totalValue={diffSummary.total_changes ?? 0}
                                    >
                                        <DiffObjectChangeSvg
                                            added={diffSummary.added ?? 0}
                                            removed={diffSummary.removed ?? 0}
                                            modified={diffSummary.modified ?? 0}
                                        />
                                    </DiffMetricCard>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400">No diff summary available</div>
                            )}
                        </div>
                    )}
                    {diffBase === diffHead && diffBase && (
                        <div className="text-xs text-amber-600 mt-2">Please select two different commits to compare</div>
                    )}
                </div>
            )}

            {nodeTypeData.length > 0 && (
                <div className="p-3 border border-gray-200 rounded-lg bg-white">
                    <div className="text-xs font-semibold text-gray-600 mb-2">Node Type Distribution Top 10</div>
                    <div className="space-y-1">
                        {nodeTypeData.map(({name, value}) => (
                            <div key={name} className="flex items-center gap-2 text-xs">
                                <span className="w-24 truncate text-gray-600">{name}</span>
                                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded"
                                        style={{width: `${Math.min(100, (value / (nodeTypeData[0]?.value || 1)) * 100)}%`}}
                                    />
                                </div>
                                <span className="w-10 text-right tabular-nums text-gray-500">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
