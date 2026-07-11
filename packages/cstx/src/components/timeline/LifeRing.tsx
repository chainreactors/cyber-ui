import React, {useEffect, useMemo, useState} from 'react';
import {AlertTriangle, CircleDotDashed, History, RefreshCw} from 'lucide-react';
import {Badge, Button} from '@cyber/ui';
import {DataState} from '../primitives';
import type {CstxHistoryEntry} from '../../types/graph';
import type {CstxLifecycle} from '../../lib/cstxHistory';
import {
    changeKindLabel,
    lifecycleStatusText,
    CSTX_CHANGE_STYLES,
    formatCstxHistoryTimeLabel,
    getHistoryEntryTimestamp,
    sortHistoryOldestFirst,
} from '../../lib/cstxHistory';
import {LifecyclePlayer} from './LifecyclePlayer';

export interface LifeRingProps {
    entries: CstxHistoryEntry[];
    lifecycle?: CstxLifecycle | null;
    loading?: boolean;
    error?: string | null;
    assetLabel?: string | null;
    activeCheckpointId?: string | null;
    size?: number;
    playbackMs?: number;
    compact?: boolean;
    className?: string;
    onRefresh?: () => void;
    onEntrySelect?: (entry: CstxHistoryEntry) => void;
    onOpenCheckpoint?: (checkpointId: string) => void;
    onStepChange?: (entry: CstxHistoryEntry | null, index: number, entries: CstxHistoryEntry[]) => void;
}

interface RingSegment {
    entry: CstxHistoryEntry;
    length: number;
    offset: number;
}

const cx = (...classes: Array<string | false | null | undefined>): string => (
    classes.filter(Boolean).join(' ')
);

const getEntryLabel = (entry: CstxHistoryEntry): string => (
    formatCstxHistoryTimeLabel(entry)
);

const getEntryWeights = (entries: CstxHistoryEntry[]): number[] => {
    const timestamps = entries.map(getHistoryEntryTimestamp);
    return entries.map((_, index) => {
        const current = timestamps[index];
        const next = timestamps[index + 1];
        if (current > 0 && next > current) {
            const minutes = (next - current) / 60_000;
            return Math.max(1, Math.log1p(minutes));
        }
        return 1;
    });
};

const buildRingSegments = (
    entries: CstxHistoryEntry[],
    circumference: number,
    gap: number,
): RingSegment[] => {
    if (entries.length === 0) return [];

    const weights = getEntryWeights(entries);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || entries.length;
    const available = Math.max(1, circumference - gap * entries.length);
    let offset = 0;

    return entries.map((entry, index) => {
        const length = Math.max(1, (weights[index] / totalWeight) * available);
        const segment = {entry, length, offset};
        offset += length + gap;
        return segment;
    });
};

const summarizeCounts = (entries: CstxHistoryEntry[]) => (
    entries.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.change_kind] = (acc[entry.change_kind] ?? 0) + 1;
        return acc;
    }, {})
);

export function LifeRing({
    entries,
    lifecycle,
    loading = false,
    error = null,
    assetLabel,
    activeCheckpointId,
    size = 132,
    playbackMs,
    compact = false,
    className,
    onRefresh,
    onEntrySelect,
    onOpenCheckpoint,
    onStepChange,
}: LifeRingProps) {
    const orderedEntries = useMemo(() => sortHistoryOldestFirst(entries), [entries]);
    const radius = Math.max(32, size / 2 - 13);
    const strokeWidth = Math.max(8, Math.round(size / 13));
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    const segments = useMemo(
        () => buildRingSegments(orderedEntries, circumference, orderedEntries.length > 12 ? 1.4 : 2.6),
        [circumference, orderedEntries],
    );
    const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
    const selectedCheckpoint = activeCheckpointId ?? selectedCheckpointId;
    const selectedEntry = (selectedCheckpoint
        ? orderedEntries.find((entry) => entry.checkpoint_id === selectedCheckpoint)
        : null) ?? orderedEntries[0] ?? null;
    const counts = useMemo(() => summarizeCounts(orderedEntries), [orderedEntries]);
    const handleEntrySelect = (entry: CstxHistoryEntry) => {
        setSelectedCheckpointId(entry.checkpoint_id);
        onEntrySelect?.(entry);
    };
    const handleStepChange = (entry: CstxHistoryEntry | null, index: number, items: CstxHistoryEntry[]) => {
        setSelectedCheckpointId(entry?.checkpoint_id ?? null);
        onStepChange?.(entry, index, items);
    };

    useEffect(() => {
        setSelectedCheckpointId(null);
    }, [orderedEntries.length]);

    if (loading) {
        return (
            <div className={cx('rounded-lg border border-gray-200 bg-white', compact ? 'p-2' : 'p-3', className)}>
                <DataState loading loadingText="Loading life ring..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cx('rounded-lg border border-amber-500/30 bg-amber-500/10 p-3', className)}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2 text-xs text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 break-words">{error}</span>
                    </div>
                    {onRefresh && (
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onRefresh}>
                            <RefreshCw className="h-3 w-3" />
                            Retry
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    if (orderedEntries.length === 0) {
        return (
            <div className={cx('rounded-lg border border-gray-200 bg-white', className)}>
                <DataState empty emptyText="No life ring data" emptyHint="No lifecycle history found for this asset" icon={CircleDotDashed} />
            </div>
        );
    }

    return (
        <div className={cx('rounded-lg border border-gray-200 bg-white', compact ? 'p-2' : 'p-3', className)}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <History className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    <span className="min-w-0 truncate text-xs font-semibold text-gray-600" title={assetLabel ?? undefined}>
                        Lifecycle ({orderedEntries.length})
                    </span>
                </div>
                {lifecycle && (
                    <Badge
                        variant="outline"
                        className={cx(
                            'h-6 px-1.5 text-[10px]',
                            lifecycle.active ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700',
                        )}
                    >
                        {lifecycleStatusText(lifecycle)}
                    </Badge>
                )}
            </div>
            <div className="mb-3 truncate text-xs text-gray-500" title={assetLabel ?? undefined}>
                {assetLabel ?? 'Asset'} &middot; Life ring and checkpoint player
            </div>

            <div className={cx('grid gap-3', compact ? 'grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)]' : 'grid-cols-1 lg:grid-cols-[10rem_minmax(0,1fr)]')}>
                <div className="flex flex-col items-center justify-start gap-2">
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Asset lifecycle change ring">
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke="var(--border)"
                            strokeWidth={strokeWidth}
                        />
                        {segments.map((segment, index) => {
                            const style = CSTX_CHANGE_STYLES[segment.entry.change_kind] ?? CSTX_CHANGE_STYLES.updated;
                            const active = selectedEntry?.checkpoint_id === segment.entry.checkpoint_id;
                            return (
                                <circle
                                    key={`${segment.entry.checkpoint_id}:${index}`}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="none"
                                    stroke={style.color}
                                    strokeWidth={active ? strokeWidth + 3 : strokeWidth}
                                    strokeLinecap="round"
                                    strokeDasharray={`${segment.length} ${Math.max(0, circumference - segment.length)}`}
                                    strokeDashoffset={-segment.offset}
                                    transform={`rotate(-90 ${center} ${center})`}
                                    className="cursor-pointer transition-all"
                                    opacity={active ? 1 : 0.72}
                                    onClick={() => handleEntrySelect(segment.entry)}
                                >
                                    <title>{`${getEntryLabel(segment.entry)} - ${style.label}`}</title>
                                </circle>
                            );
                        })}
                        <text x={center} y={center - 4} textAnchor="middle" className="fill-gray-900 text-[18px] font-semibold">
                            {orderedEntries.length}
                        </text>
                        <text x={center} y={center + 14} textAnchor="middle" className="fill-gray-500 text-[10px]">
                            checkpoint
                        </text>
                    </svg>
                    <div className="grid w-full grid-cols-3 gap-1">
                        {(['added', 'updated', 'removed'] as const).map((kind) => {
                            const style = CSTX_CHANGE_STYLES[kind];
                            return (
                                <div key={kind} className="min-w-0 text-center">
                                    <div className={cx('text-xs font-semibold', style.textClass)}>{counts[kind] ?? 0}</div>
                                    <div className="truncate text-[10px] text-gray-400">{changeKindLabel(kind)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="min-w-0">
                    <LifecyclePlayer
                        entries={orderedEntries}
                        lifecycle={lifecycle}
                        loading={false}
                        error={null}
                        activeCheckpointId={selectedEntry?.checkpoint_id ?? null}
                        playbackMs={playbackMs}
                        compact={compact}
                        embedded
                        showHeader={false}
                        className="p-0"
                        onCheckpointSelect={handleEntrySelect}
                        onOpenCheckpoint={onOpenCheckpoint}
                        onStepChange={handleStepChange}
                    />
                </div>
            </div>
        </div>
    );
}
