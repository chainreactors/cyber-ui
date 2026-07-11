import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    GitBranch, GitMerge, GitCommit as GitCommitIcon, Clock, Layers, Search, Eye, ExternalLink,
    ChevronRight, Loader2,
} from 'lucide-react';
import {Badge, Button} from '@cyber/ui';
import {DataState} from '../primitives';
import {formatShortTimeValue} from '../../lib/timeDisplay';
import {DiffObjectChangeBadge, DiffObjectChangeSvg} from '../commit/DiffWidgets';

export interface GitCommit {
    hash: string;
    short: string;
    message: string;
    label?: string;
    created_at: number;
    parents: string[];
    parent?: string;
    flow_id?: string;
    task_id?: string;
    source_type?: string;
    stats: Record<string, unknown>;
}

export interface GitRef {
    name: string;
    head: string;
}

export interface GitGraphData {
    branches: Record<string, GitCommit[]>;
    refs: GitRef[];
}

export interface CommitGraphProps {
    data: GitGraphData;
    loading: boolean;
    flowPipelineMap?: Record<string, string>;
    visibleBranchNames?: string[];
    hideScheduleBranches?: boolean;
    readOnly?: boolean;
    emptyText?: string;
    emptyHint?: string;
    onMergeFlowBranch?: (flowId: string, flowName?: string) => void;
    onFlowClick?: (flowId: string) => void;
    onTaskClick?: (taskId: string) => void;
    onRefresh?: (since?: number) => void;
    onPreviewCommit?: (commitHash: string) => void;
    onDiffCommit?: (base: string, head: string) => void;
    onFetchChildCommits?: (flowId: string) => Promise<GitCommit[]>;
    renderCommitChip?: (commit: GitCommit) => React.ReactNode;
    renderFlowChip?: (flowId: string) => React.ReactNode;
}

type BranchEntry = {
    name: string;
    label: string;
    color: string;
    laneIndex: number;
    commits: GitCommit[];
    ref: GitRef | null;
    head: string | null;
    isMain: boolean;
    isFlow: boolean;
    isSchedule: boolean;
    flowId: string | null;
};

type HistoryCommit = GitCommit & {
    branches: string[];
    primaryBranch: string;
};

const BRANCH_COLORS: Record<string, string> = {
    main: '#2563eb',
};
const PALETTE = ['#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#06b6d4', '#f97316', '#6366f1'];
const LANE_WIDTH = 28;
const DOT_R = 5;
const MERGE_R = 8;

function branchColor(name: string, index: number): string {
    return BRANCH_COLORS[name] ?? PALETTE[index % PALETTE.length];
}

function branchLabel(name: string): string {
    if (name === 'main') return 'main';
    if (name.startsWith('flow/')) return `flow/${name.slice(5, 13)}`;
    if (name.startsWith('schedule/')) return `sched/${name.slice(9, 17)}`;
    return name;
}

function flowIdFromBranch(name: string): string | null {
    return name.startsWith('flow/') ? name.slice(5) : null;
}

function isMergeCommit(commit: GitCommit): boolean {
    return commit.parents.length > 1 || commit.message.toLowerCase().startsWith('merge ');
}

function getBranchHead(name: string, refsByName: Map<string, GitRef>, commits: GitCommit[]): string | null {
    return refsByName.get(name)?.head ?? commits[0]?.hash ?? null;
}

function isMergedFlowBranch(name: string, head: string | null, mainHashes: Set<string>): boolean {
    return name.startsWith('flow/') && !!head && mainHashes.has(head);
}

interface HistoryRowProps {
    commit: HistoryCommit;
    branches: BranchEntry[];
    branchMap: Map<string, BranchEntry>;
    commitBranchMap: Map<string, Set<string>>;
    flowPipelineMap: Record<string, string>;
    selected: boolean;
    isLast: boolean;
    onSelect: (commit: HistoryCommit) => void;
    onFlowClick?: (flowId: string) => void;
    onPreview?: (commitHash: string) => void;
    renderCommitChip?: (commit: GitCommit) => React.ReactNode;
    renderFlowChip?: (flowId: string) => React.ReactNode;
    expanded?: boolean;
    expandLoading?: boolean;
    childCommits?: GitCommit[];
    onToggleExpand?: (commitHash: string, flowId: string) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = ({
    commit,
    branches,
    branchMap,
    commitBranchMap,
    flowPipelineMap,
    selected,
    isLast,
    onSelect,
    onFlowClick,
    onPreview,
    renderCommitChip,
    renderFlowChip,
    expanded,
    expandLoading,
    childCommits,
    onToggleExpand,
}) => {
    const merge = isMergeCommit(commit);
    const primaryBranch = branchMap.get(commit.primaryBranch) ?? branches[0];
    const laneWidth = Math.max(branches.length, 1) * LANE_WIDTH;
    const activeBranchNames = new Set(commit.branches);
    const primaryCx = (primaryBranch?.laneIndex ?? 0) * LANE_WIDTH + LANE_WIDTH / 2;
    const parentLanes = commit.parents
        .flatMap(parent => Array.from(commitBranchMap.get(parent) ?? []))
        .map(name => branchMap.get(name))
        .filter((branch): branch is BranchEntry => Boolean(branch));
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(commit)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(commit);
                }
            }}
            className={`group flex w-full cursor-pointer items-start gap-0 border-l-2 text-left transition-colors ${
                selected
                    ? 'border-blue-500 bg-primary/10'
                    : 'border-transparent hover:bg-interactive-hover'
            }`}
        >
            <svg
                width={laneWidth}
                height={48}
                className="shrink-0"
                style={{minWidth: laneWidth}}
            >
                {branches.map((branch) => {
                    const cx = branch.laneIndex * LANE_WIDTH + LANE_WIDTH / 2;
                    const active = activeBranchNames.has(branch.name);
                    return (
                        <g key={branch.name}>
                            <line
                                x1={cx}
                                y1={0}
                                x2={cx}
                                y2={isLast ? 24 : 48}
                                stroke={branch.color}
                                strokeWidth={active ? 2.5 : 1.25}
                                strokeOpacity={active ? 0.45 : 0.12}
                            />
                        </g>
                    );
                })}
                {merge && parentLanes.map((branch) => {
                    const cx = branch.laneIndex * LANE_WIDTH + LANE_WIDTH / 2;
                    if (cx === primaryCx) return null;
                    return (
                        <line
                            key={`${commit.hash}-${branch.name}`}
                            x1={Math.min(primaryCx, cx)}
                            y1={24}
                            x2={Math.max(primaryCx, cx)}
                            y2={24}
                            stroke={branch.color}
                            strokeWidth={2}
                            strokeOpacity={0.35}
                        />
                    );
                })}
                {commit.branches.map((branchName) => {
                    const branch = branchMap.get(branchName);
                    if (!branch) return null;
                    const cx = branch.laneIndex * LANE_WIDTH + LANE_WIDTH / 2;
                    return merge && branchName === commit.primaryBranch ? (
                        <g key={branchName}>
                            <circle cx={cx} cy={24} r={MERGE_R} fill="var(--card)" stroke={branch.color} strokeWidth={2}/>
                            <GitMerge x={cx - 5} y={19} width={10} height={10} color={branch.color} strokeWidth={2.4}/>
                        </g>
                    ) : (
                        <circle key={branchName} cx={cx} cy={24} r={DOT_R} fill={branch.color} stroke="var(--card)" strokeWidth={2}/>
                    );
                })}
            </svg>

            <div className="min-w-0 flex-1 py-2 pr-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        {formatShortTimeValue(commit.created_at)}
                    </span>
                    {renderCommitChip
                        ? renderCommitChip(commit)
                        : (
                            <Badge variant="outline" className="min-h-4 px-1 py-0 text-[10px] font-mono" title={commit.hash}>
                                {commit.short}
                            </Badge>
                        )
                    }
                    {commit.flow_id && renderFlowChip && renderFlowChip(commit.flow_id)}
                    {commit.branches.slice(0, 4).map((branchName) => {
                        const branch = branchMap.get(branchName);
                        return (
                            <Badge
                                key={branchName}
                                variant="outline"
                                className="px-1 py-0 text-[10px]"
                                style={{
                                    borderColor: branch?.color ?? '#e2e8f0',
                                    color: branch?.color ?? '#64748b',
                                    backgroundColor: `${branch?.color ?? '#e2e8f0'}12`,
                                }}
                            >
                                {branch?.label ?? branchName}
                            </Badge>
                        );
                    })}
                    {merge && (
                        <Badge variant="outline" className="border-purple-200 px-1 py-0 text-[10px] text-purple-600">
                            merge
                        </Badge>
                    )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                    {merge && commit.flow_id && onToggleExpand && (
                        <button
                            type="button"
                            className="shrink-0 text-slate-400 hover:text-slate-600"
                            onClick={(e) => { e.stopPropagation(); onToggleExpand(commit.hash, commit.flow_id!); }}
                        >
                            {expandLoading
                                ? <Loader2 className="h-3 w-3 animate-spin"/>
                                : <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}/>}
                        </button>
                    )}
                    <span className="min-w-0 truncate text-xs text-slate-500">
                        {commit.label || commit.message || '-'}
                    </span>
                    <DiffObjectChangeBadge stats={commit.stats}/>
                    {onPreview && (
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto h-5 shrink-0 px-1.5 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); onPreview(commit.hash); }}
                        >
                            <Search className="mr-0.5 h-3 w-3"/>
                            Preview
                        </Button>
                    )}
                </div>

                {expanded && childCommits && childCommits.length > 0 && (
                    <div className="mt-1.5 ml-1 border-l border-dashed border-slate-200 pl-3 space-y-1">
                        {childCommits.map(tc => (
                            <div
                                key={tc.hash}
                                className="group/child flex items-center gap-2 rounded px-1.5 py-1 text-[11px] hover:bg-slate-50"
                            >
                                <GitCommitIcon className="h-3 w-3 shrink-0 text-slate-300"/>
                                <span className="font-mono text-[10px] text-slate-400">{tc.short}</span>
                                <span className="min-w-0 truncate text-slate-500">{tc.label || tc.task_id?.slice(0, 8) || '-'}</span>
                                <DiffObjectChangeBadge stats={tc.stats}/>
                                {onPreview && (
                                    <button
                                        type="button"
                                        className="ml-auto shrink-0 text-[10px] text-slate-400 opacity-0 group-hover/child:opacity-100"
                                        onClick={(e) => { e.stopPropagation(); onPreview(tc.hash); }}
                                    >
                                        <Search className="h-3 w-3"/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export function CommitGraph({
    data,
    loading,
    flowPipelineMap = {},
    visibleBranchNames,
    hideScheduleBranches = false,
    readOnly = false,
    emptyText = 'No project history',
    emptyHint = 'Commits will be created after scan tasks execute',
    onMergeFlowBranch,
    onFlowClick,
    onTaskClick,
    onRefresh,
    onPreviewCommit,
    onDiffCommit,
    onFetchChildCommits,
    renderCommitChip,
    renderFlowChip,
}: CommitGraphProps) {
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState<string>('all');
    const [searchText, setSearchText] = useState('');

    const handleTimeRangeChange = useCallback((range: string) => {
        setTimeRange(range);
        if (!onRefresh) return;
        const now = Math.floor(Date.now() / 1000);
        const sinceMap: Record<string, number | undefined> = {
            '24h': now - 86400,
            '7d': now - 604800,
            '30d': now - 2592000,
            'all': undefined,
        };
        onRefresh(sinceMap[range]);
    }, [onRefresh]);
    const [pinnedMergedBranches, setPinnedMergedBranches] = useState<Set<string>>(new Set());
    const [expandedMerges, setExpandedMerges] = useState<Set<string>>(new Set());
    const [taskCommitCache, setTaskCommitCache] = useState<Record<string, GitCommit[]>>({});
    const [loadingTaskCommits, setLoadingTaskCommits] = useState<Set<string>>(new Set());

    const toggleMergeExpand = useCallback((commitHash: string, flowId: string) => {
        setExpandedMerges(prev => {
            const next = new Set(prev);
            if (next.has(commitHash)) {
                next.delete(commitHash);
            } else {
                next.add(commitHash);
                if (!taskCommitCache[flowId] && onFetchChildCommits) {
                    setLoadingTaskCommits(p => new Set(p).add(commitHash));
                    onFetchChildCommits(flowId)
                        .then(commits => {
                            const sorted = [...commits].sort((a, b) => b.created_at - a.created_at);
                            setTaskCommitCache(c => ({...c, [flowId]: sorted}));
                        })
                        .catch(() => setTaskCommitCache(c => ({...c, [flowId]: []})))
                        .finally(() => setLoadingTaskCommits(p => { const n = new Set(p); n.delete(commitHash); return n; }));
                }
            }
            return next;
        });
    }, [taskCommitCache, onFetchChildCommits]);

    const visibleBranchSet = useMemo(
        () => (visibleBranchNames ? new Set(visibleBranchNames) : null),
        [visibleBranchNames],
    );

    const isBranchAllowed = useCallback((name: string): boolean => (
        (!visibleBranchSet || visibleBranchSet.has(name))
        && !(hideScheduleBranches && name.startsWith('schedule/'))
    ), [hideScheduleBranches, visibleBranchSet]);

    const refsByName = useMemo(
        () => new Map(data.refs.map(ref => [ref.name, ref])),
        [data.refs],
    );
    const mainHashes = useMemo(
        () => new Set((data.branches.main ?? []).map(commit => commit.hash)),
        [data.branches],
    );

    const hiddenMergedFlowRefs = useMemo(
        () => data.refs.filter(ref => isBranchAllowed(ref.name) && isMergedFlowBranch(ref.name, ref.head, mainHashes)),
        [data.refs, isBranchAllowed, mainHashes],
    );

    const branches = useMemo<BranchEntry[]>(() => {
        const names = new Set<string>();
        if (isBranchAllowed('main') && (data.branches.main?.length || refsByName.has('main'))) {
            names.add('main');
        }
        for (const ref of data.refs) {
            if (!isBranchAllowed(ref.name)) {
                continue;
            }
            if (isMergedFlowBranch(ref.name, ref.head, mainHashes) && !pinnedMergedBranches.has(ref.name)) {
                continue;
            }
            if (data.branches[ref.name]?.length || ref.name === 'main') {
                names.add(ref.name);
            }
        }

        const ordered = Array.from(names).sort((a, b) => {
            if (a === 'main') return -1;
            if (b === 'main') return 1;
            if (a.startsWith('flow/') && !b.startsWith('flow/')) return -1;
            if (!a.startsWith('flow/') && b.startsWith('flow/')) return 1;
            return a.localeCompare(b);
        });

        return ordered.map((name, index) => {
            const commits = data.branches[name] ?? [];
            const head = getBranchHead(name, refsByName, commits);
            return {
                name,
                label: branchLabel(name),
                color: branchColor(name, index),
                laneIndex: index,
                commits,
                ref: refsByName.get(name) ?? null,
                head,
                isMain: name === 'main',
                isFlow: name.startsWith('flow/'),
                isSchedule: name.startsWith('schedule/'),
                flowId: flowIdFromBranch(name),
            };
        });
    }, [data.branches, data.refs, refsByName, isBranchAllowed, mainHashes, pinnedMergedBranches]);

    const branchMap = useMemo(
        () => new Map(branches.map(branch => [branch.name, branch])),
        [branches],
    );

    useEffect(() => {
        if (selectedBranch !== 'all' && !branchMap.has(selectedBranch)) {
            setSelectedBranch('all');
        }
    }, [branchMap, selectedBranch]);

    const commitBranchMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const branch of branches) {
            for (const commit of branch.commits) {
                const set = map.get(commit.hash) ?? new Set<string>();
                set.add(branch.name);
                map.set(commit.hash, set);
            }
        }
        return map;
    }, [branches]);

    const historyCommits = useMemo<HistoryCommit[]>(() => {
        const commitMap = new Map<string, HistoryCommit>();
        const sourceBranches = selectedBranch === 'all'
            ? branches
            : branches.filter(branch => branch.name === selectedBranch);

        for (const branch of sourceBranches) {
            for (const commit of branch.commits) {
                const existing = commitMap.get(commit.hash);
                if (existing) {
                    if (!existing.branches.includes(branch.name)) {
                        existing.branches.push(branch.name);
                    }
                    if (branch.name === 'main') {
                        existing.primaryBranch = 'main';
                    }
                    continue;
                }
                commitMap.set(commit.hash, {
                    ...commit,
                    branches: [branch.name],
                    primaryBranch: branch.name,
                });
            }
        }

        let result = Array.from(commitMap.values())
            .map(commit => ({
                ...commit,
                branches: Array.from(commitBranchMap.get(commit.hash) ?? new Set(commit.branches))
                    .filter(name => branchMap.has(name)),
                primaryBranch: branchMap.has(commit.primaryBranch)
                    ? commit.primaryBranch
                    : commit.branches[0] ?? 'main',
            }))
            .sort((a, b) => b.created_at - a.created_at);

        if (searchText) {
            const q = searchText.toLowerCase();
            result = result.filter(c =>
                (c.label ?? '').toLowerCase().includes(q)
                || (c.message ?? '').toLowerCase().includes(q)
                || c.short.includes(q)
                || (c.flow_id ?? '').includes(q)
                || (c.task_id ?? '').includes(q)
                || (flowPipelineMap[c.flow_id ?? ''] ?? '').toLowerCase().includes(q)
            );
        }

        return result;
    }, [branches, selectedBranch, commitBranchMap, branchMap, searchText, flowPipelineMap]);

    const selectedCommit = useMemo(
        () => historyCommits.find(commit => commit.hash === selectedCommitHash) ?? historyCommits[0] ?? null,
        [historyCommits, selectedCommitHash],
    );

    const activeFlowBranches = branches.filter(branch => branch.isFlow);
    const scheduleBranches = branches.filter(branch => branch.isSchedule);
    const mainBranch = branchMap.get('main');

    if (loading) return <DataState loading loadingText="Loading project history..."/>;

    if (branches.length === 0 && historyCommits.length === 0) {
        return <DataState empty emptyText={emptyText} emptyHint={emptyHint} icon={GitBranch}/>;
    }

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    {label: 'Main Commits', value: mainBranch?.commits.length ?? 0, icon: GitBranch, color: 'text-blue-600'},
                    {label: 'Mergeable Flows', value: activeFlowBranches.length, icon: GitMerge, color: 'text-purple-600'},
                    {label: 'Schedule Branches', value: scheduleBranches.length, icon: Clock, color: 'text-amber-600'},
                    {label: 'Merged Hidden', value: hiddenMergedFlowRefs.length, icon: Layers, color: 'text-slate-500'},
                ].map(({label, value, icon: Icon, color}) => (
                    <div key={label} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="mb-1 flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${color}`}/>
                            <span className="text-xs text-gray-500">{label}</span>
                        </div>
                        <div className="text-xl font-bold text-gray-900">{value}</div>
                    </div>
                ))}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <GitCommitIcon className="h-4 w-4 text-slate-500"/>
                        <span className="text-sm font-semibold text-gray-700">Project History</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {historyCommits.length} commits
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Search commit / flow / task..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="h-7 w-40 rounded-md border border-gray-200 bg-white px-2 text-xs text-slate-600 placeholder:text-slate-300 focus:border-blue-300 focus:outline-none"
                        />
                        <select
                            value={timeRange}
                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                            className="h-7 rounded-md border border-gray-200 bg-white px-2 text-xs text-slate-500"
                        >
                            <option value="all">All time</option>
                            <option value="24h">Last 24 hours</option>
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                        </select>
                    </div>
                    {hiddenMergedFlowRefs.length > 0 && (
                        <select
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-slate-500"
                            value=""
                            onChange={(e) => {
                                const name = e.target.value;
                                if (!name) return;
                                setPinnedMergedBranches(prev => {
                                    const next = new Set(prev);
                                    next.add(name);
                                    return next;
                                });
                                e.target.value = '';
                            }}
                        >
                            <option value="">+ Merged branches ({hiddenMergedFlowRefs.length - pinnedMergedBranches.size})</option>
                            {hiddenMergedFlowRefs
                                .filter(ref => !pinnedMergedBranches.has(ref.name))
                                .map(ref => (
                                    <option key={ref.name} value={ref.name}>
                                        {branchLabel(ref.name)} ({ref.head.slice(0, 8)})
                                    </option>
                                ))
                            }
                        </select>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setSelectedBranch('all')}
                        className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                            selectedBranch === 'all'
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        All history
                    </button>
                    {branches.map(branch => (
                        <div
                            key={branch.name}
                            className="flex items-center overflow-hidden rounded-md border text-xs"
                            style={{
                                borderColor: selectedBranch === branch.name ? branch.color : 'var(--border)',
                                backgroundColor: selectedBranch === branch.name ? `${branch.color}12` : 'var(--card)',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedBranch(branch.name)}
                                className="flex items-center gap-1.5 px-2 py-1 transition-colors hover:bg-slate-50"
                                style={{color: branch.color}}
                            >
                                <GitBranch className="h-3 w-3"/>
                                <span className="font-medium">{branch.label}</span>
                                <span className="font-mono text-[10px] opacity-70">{branch.head?.slice(0, 8) ?? '-'}</span>
                            </button>
                            {!readOnly && branch.isFlow && branch.flowId && onMergeFlowBranch && (
                                <button
                                    type="button"
                                    onClick={() => onMergeFlowBranch(branch.flowId!, flowPipelineMap[branch.flowId!] ?? branch.label)}
                                    className="border-l border-gray-200 px-2 py-1 text-purple-600 hover:bg-purple-50"
                                    title="Preview and merge this flow branch"
                                >
                                    Merge
                                </button>
                            )}
                            {pinnedMergedBranches.has(branch.name) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPinnedMergedBranches(prev => {
                                            const next = new Set(prev);
                                            next.delete(branch.name);
                                            return next;
                                        });
                                        if (selectedBranch === branch.name) setSelectedBranch('all');
                                    }}
                                    className="border-l border-gray-200 px-1.5 py-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                    title="Unpin"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="max-h-full overflow-y-auto">
                        {historyCommits.slice(0, 300).map((commit, idx) => (
                            <HistoryRow
                                key={commit.hash}
                                commit={commit}
                                branches={branches}
                                branchMap={branchMap}
                                commitBranchMap={commitBranchMap}
                                flowPipelineMap={flowPipelineMap}
                                selected={selectedCommit?.hash === commit.hash}
                                isLast={idx === Math.min(historyCommits.length, 300) - 1}
                                onSelect={(next) => setSelectedCommitHash(next.hash)}
                                onFlowClick={readOnly ? undefined : onFlowClick}
                                onPreview={onPreviewCommit}
                                renderCommitChip={renderCommitChip}
                                renderFlowChip={renderFlowChip}
                                expanded={expandedMerges.has(commit.hash)}
                                expandLoading={loadingTaskCommits.has(commit.hash)}
                                childCommits={commit.flow_id ? taskCommitCache[commit.flow_id] : undefined}
                                onToggleExpand={onFetchChildCommits ? toggleMergeExpand : undefined}
                            />
                        ))}
                        {historyCommits.length > 300 && (
                            <div className="border-t border-gray-100 py-2 text-center text-xs text-slate-400">
                                Showing latest 300 commits only
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-h-0 overflow-auto rounded-lg border border-gray-200 bg-white p-3">
                    {selectedCommit ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-slate-500"/>
                                    <span className="text-sm font-semibold text-gray-700">Commit Details</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {!readOnly && onPreviewCommit && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => onPreviewCommit(selectedCommit.hash)}
                                        >
                                            <Search className="w-3 h-3 mr-1"/>
                                            Preview
                                        </Button>
                                    )}
                                    {!readOnly && selectedCommit.parent && onDiffCommit && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => onDiffCommit(selectedCommit.parent!, selectedCommit.hash)}
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1"/>
                                            Diff
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div>
                                    <div className="mb-1 text-slate-400">Commit</div>
                                    <Badge variant="outline" className="font-mono text-[11px]" title={selectedCommit.hash}>
                                        {selectedCommit.short}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="mb-1 text-slate-400">Time</div>
                                    <div className="text-slate-700">{formatShortTimeValue(selectedCommit.created_at)}</div>
                                </div>
                                <div>
                                    <div className="mb-1 text-slate-400">Message</div>
                                    <div className="rounded-md bg-slate-50 p-2 text-slate-700">
                                        {selectedCommit.label || selectedCommit.message || '-'}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 text-slate-400">Branches</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedCommit.branches.map(branchName => {
                                            const branch = branchMap.get(branchName);
                                            return (
                                                <Badge
                                                    key={branchName}
                                                    variant="outline"
                                                    className="px-1.5 py-0 text-[10px]"
                                                    style={{
                                                        borderColor: branch?.color ?? '#e2e8f0',
                                                        color: branch?.color ?? '#64748b',
                                                    }}
                                                >
                                                    {branch?.label ?? branchName}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                                {(() => {
                                    const s = selectedCommit.stats;
                                    const added = Number(s.added_nodes ?? 0) + Number(s.added_edges ?? 0);
                                    const removed = Number(s.removed_nodes ?? 0) + Number(s.removed_edges ?? 0);
                                    const modified = Number(s.updated_nodes ?? 0) + Number(s.updated_edges ?? 0);
                                    if (added + removed + modified === 0) return null;
                                    return (
                                        <div>
                                            <div className="mb-1 text-slate-400">Change Stats</div>
                                            <DiffObjectChangeSvg added={added} removed={removed} modified={modified}/>
                                            <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                                                <div className="flex justify-between"><span>Nodes +</span><span className="text-emerald-600">{Number(s.added_nodes ?? 0)}</span></div>
                                                <div className="flex justify-between"><span>Edges +</span><span className="text-emerald-600">{Number(s.added_edges ?? 0)}</span></div>
                                                <div className="flex justify-between"><span>Nodes ~</span><span className="text-amber-500">{Number(s.updated_nodes ?? 0)}</span></div>
                                                <div className="flex justify-between"><span>Edges ~</span><span className="text-amber-500">{Number(s.updated_edges ?? 0)}</span></div>
                                                <div className="flex justify-between"><span>Nodes -</span><span className="text-red-500">{Number(s.removed_nodes ?? 0)}</span></div>
                                                <div className="flex justify-between"><span>Edges -</span><span className="text-red-500">{Number(s.removed_edges ?? 0)}</span></div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {selectedCommit.flow_id && (
                                    <div>
                                        <div className="mb-1 text-slate-400">Flow</div>
                                        {renderFlowChip
                                            ? renderFlowChip(selectedCommit.flow_id)
                                            : (
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-[11px] cursor-pointer"
                                                    title={selectedCommit.flow_id}
                                                    onClick={!readOnly && onFlowClick ? () => onFlowClick(selectedCommit.flow_id!) : undefined}
                                                >
                                                    {selectedCommit.flow_id.slice(0, 12)}
                                                </Badge>
                                            )
                                        }
                                    </div>
                                )}
                                {selectedCommit.task_id && (
                                    <div>
                                        <div className="mb-1 text-slate-400">Task</div>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[11px] cursor-pointer"
                                            title={selectedCommit.task_id}
                                            onClick={!readOnly && onTaskClick ? () => onTaskClick(selectedCommit.task_id!) : undefined}
                                        >
                                            {selectedCommit.task_id.slice(0, 12)}
                                        </Badge>
                                    </div>
                                )}
                                {selectedCommit.source_type && (
                                    <div>
                                        <div className="mb-1 text-slate-400">Source</div>
                                        <Badge variant="outline" className="text-[11px]">{selectedCommit.source_type}</Badge>
                                    </div>
                                )}
                                {selectedCommit.parents.length > 0 && (
                                    <div>
                                        <div className="mb-1 text-slate-400">Parents</div>
                                        <div className="space-y-1">
                                            {selectedCommit.parents.map(parent => (
                                                <div key={parent} className="font-mono text-[11px] text-slate-500">
                                                    {parent.slice(0, 12)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                            <Search className="mr-2 h-4 w-4"/>
                            Select a commit to view details
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
