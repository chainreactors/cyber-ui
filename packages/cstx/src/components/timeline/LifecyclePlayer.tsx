import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Pause,
    Play,
    RotateCcw,
    SkipBack,
    SkipForward,
    Timer,
} from 'lucide-react';
import {Badge, Button} from '@cyber/ui';
import {DataState} from '../primitives';
import type {CstxHistoryEntry} from '../../types/graph';
import type {CstxLifecycle} from '../../lib/cstxHistory';
import {
    CSTX_CHANGE_STYLES,
    formatCstxFieldChange,
    formatCstxHistoryFieldName,
    formatCstxHistoryTimeLabel,
    formatCstxHistoryValue,
    getCstxHistoryChangedFields,
    sortHistoryOldestFirst,
} from '../../lib/cstxHistory';

export interface LifecyclePlayerProps {
    entries: CstxHistoryEntry[];
    lifecycle?: CstxLifecycle | null;
    loading?: boolean;
    error?: string | null;
    assetLabel?: string | null;
    activeCheckpointId?: string | null;
    playbackMs?: number;
    compact?: boolean;
    embedded?: boolean;
    showHeader?: boolean;
    className?: string;
    onRefresh?: () => void;
    onOpenCheckpoint?: (checkpointId: string) => void;
    onCheckpointSelect?: (entry: CstxHistoryEntry) => void;
    onStepChange?: (entry: CstxHistoryEntry | null, index: number, entries: CstxHistoryEntry[]) => void;
}

const cx = (...classes: Array<string | false | null | undefined>): string => (
    classes.filter(Boolean).join(' ')
);

const getStepLabel = (entry: CstxHistoryEntry): string => (
    formatCstxHistoryTimeLabel(entry)
);

const FieldChangePreview = ({entry}: {entry: CstxHistoryEntry}) => {
    const changedFields = getCstxHistoryChangedFields(entry);

    if (changedFields.length === 0) {
        return (
            <div className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700">
                First discovery or status change, no field-level diff
            </div>
        );
    }

    return (
        <div className="grid gap-1">
            {changedFields.slice(0, 6).map((change, index) => (
                <div key={`${entry.checkpoint_id}:${change.field}:${index}`} className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs">
                    <div className="font-medium text-gray-600">{formatCstxHistoryFieldName(change.field)}</div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate text-red-400 line-through" title={formatCstxHistoryValue(change.old)}>
                            {formatCstxHistoryValue(change.old)}
                        </span>
                        <span className="text-gray-300">-&gt;</span>
                        <span className="min-w-0 truncate text-emerald-700" title={formatCstxHistoryValue(change.new)}>
                            {formatCstxHistoryValue(change.new)}
                        </span>
                    </div>
                </div>
            ))}
            {changedFields.length > 6 && (
                <div className="text-xs text-gray-400">{changedFields.length - 6} more field changes</div>
            )}
        </div>
    );
};

export function LifecyclePlayer({
    entries,
    lifecycle,
    loading = false,
    error = null,
    assetLabel,
    activeCheckpointId,
    playbackMs = 1400,
    compact = false,
    embedded = false,
    showHeader = true,
    className,
    onRefresh,
    onOpenCheckpoint,
    onCheckpointSelect,
    onStepChange,
}: LifecyclePlayerProps) {
    const orderedEntries = useMemo(() => sortHistoryOldestFirst(entries), [entries]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const onStepChangeRef = useRef(onStepChange);
    const lastStepNotificationRef = useRef('');
    const currentIndexRef = useRef(currentIndex);

    useEffect(() => {
        onStepChangeRef.current = onStepChange;
    }, [onStepChange]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        setPlaying(false);
        setCurrentIndex(0);
        lastStepNotificationRef.current = '';
    }, [orderedEntries.length]);

    useEffect(() => {
        if (!activeCheckpointId) return;
        const nextIndex = orderedEntries.findIndex((entry) => entry.checkpoint_id === activeCheckpointId);
        if (nextIndex >= 0 && nextIndex !== currentIndexRef.current) {
            setPlaying(false);
            setCurrentIndex(nextIndex);
        }
    }, [activeCheckpointId, orderedEntries]);

    const currentEntry = orderedEntries[currentIndex] ?? null;

    useEffect(() => {
        const notificationKey = `${currentEntry?.checkpoint_id ?? ''}:${currentIndex}:${orderedEntries.length}`;
        if (notificationKey === lastStepNotificationRef.current) return;
        lastStepNotificationRef.current = notificationKey;
        onStepChangeRef.current?.(currentEntry, currentEntry ? currentIndex : -1, orderedEntries);
    }, [currentEntry, currentIndex, orderedEntries]);

    useEffect(() => {
        if (playing && currentIndex >= orderedEntries.length - 1) {
            setPlaying(false);
        }
    }, [currentIndex, orderedEntries.length, playing]);

    useEffect(() => {
        if (!playing || orderedEntries.length <= 1 || currentIndex >= orderedEntries.length - 1) return;

        const timer = window.setInterval(() => {
            setCurrentIndex((value) => {
                if (value >= orderedEntries.length - 1) {
                    window.clearInterval(timer);
                    setPlaying(false);
                    return value;
                }
                return value + 1;
            });
        }, playbackMs);

        return () => window.clearInterval(timer);
    }, [currentIndex, orderedEntries.length, playbackMs, playing]);

    const moveTo = (index: number): CstxHistoryEntry | null => {
        const nextIndex = Math.max(0, Math.min(index, orderedEntries.length - 1));
        setCurrentIndex(nextIndex);
        return orderedEntries[nextIndex] ?? null;
    };

    if (loading) {
        return (
            <div className={cx('rounded-lg border border-gray-200 bg-white', compact ? 'p-2' : 'p-3', className)}>
                <DataState loading loadingText="Loading lifecycle timeline..." />
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
                <DataState empty emptyText="No lifecycle timeline" emptyHint="No checkpoint history found for this asset" icon={Timer} />
            </div>
        );
    }

    const changeStyle = currentEntry
        ? CSTX_CHANGE_STYLES[currentEntry.change_kind] ?? CSTX_CHANGE_STYLES.updated
        : CSTX_CHANGE_STYLES.updated;
    const canStepBack = currentIndex > 0;
    const canStepForward = currentIndex < orderedEntries.length - 1;
    const progress = orderedEntries.length <= 1 ? 100 : Math.round((currentIndex / (orderedEntries.length - 1)) * 100);
    const currentChangedFields = currentEntry ? getCstxHistoryChangedFields(currentEntry) : [];
    const checkpointTitle = currentEntry
        ? `${getStepLabel(currentEntry)} - ${formatCstxFieldChange(currentChangedFields[0] ?? {field: 'checkpoint', old: '', new: currentEntry.checkpoint_id})}`
        : '';

    return (
        <div className={cx(embedded ? 'min-w-0' : 'rounded-lg border border-gray-200 bg-white shadow-sm', compact ? 'p-2' : 'p-3', className)}>
            {showHeader && (
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-500">
                        <Timer className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900" title={assetLabel ?? undefined}>
                            Lifecycle Timeline Player
                        </div>
                        <div className="truncate text-xs text-gray-500">
                            {assetLabel ?? 'Asset'} &middot; {orderedEntries.length} checkpoints
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {lifecycle && (
                        <Badge
                            variant="outline"
                            className={cx(
                                'h-6 px-1.5 text-[10px]',
                                lifecycle.active ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700',
                            )}
                        >
                            {lifecycle.active ? 'Active' : 'Removed'}
                        </Badge>
                    )}
                    {currentEntry && onOpenCheckpoint && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-blue-600"
                            onClick={() => onOpenCheckpoint(currentEntry.checkpoint_id)}
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Snapshot
                        </Button>
                    )}
                </div>
            </div>
            )}

            <div className="mt-3 space-y-2">
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canStepBack} onClick={() => moveTo(0)} title="Jump to first record">
                        <SkipBack className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canStepBack} onClick={() => moveTo(currentIndex - 1)} title="Previous record">
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={orderedEntries.length <= 1 || (!playing && !canStepForward)}
                        onClick={() => {
                            if (playing) {
                                setPlaying(false);
                                return;
                            }
                            if (canStepForward) {
                                setPlaying(true);
                            }
                        }}
                        title={playing ? 'Pause' : canStepForward ? 'Play' : 'At latest record'}
                    >
                        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canStepForward} onClick={() => moveTo(currentIndex + 1)} title="Next record">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canStepForward} onClick={() => moveTo(orderedEntries.length - 1)} title="Jump to latest record">
                        <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="ml-1 h-7 w-7" onClick={() => { setPlaying(false); moveTo(0); }} title="Reset playback">
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <div className="ml-2 min-w-[3rem] text-right text-xs text-gray-500">{progress}%</div>
                </div>

                <input
                    type="range"
                    min={0}
                    max={Math.max(0, orderedEntries.length - 1)}
                    value={currentIndex}
                    onChange={(event) => {
                        setPlaying(false);
                        moveTo(Number(event.target.value));
                    }}
                    className="h-2 w-full cursor-pointer accent-gray-900"
                    aria-label="Lifecycle playback progress"
                />

                <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
                    {orderedEntries.map((entry, index) => {
                        const style = CSTX_CHANGE_STYLES[entry.change_kind] ?? CSTX_CHANGE_STYLES.updated;
                        return (
                            <button
                                key={`${entry.checkpoint_id}:${index}`}
                                type="button"
                                className={cx('h-full min-w-[4px] flex-1 transition-opacity', index <= currentIndex ? 'opacity-100' : 'opacity-35')}
                                style={{backgroundColor: style.color}}
                                title={`${getStepLabel(entry)} - ${style.label}`}
                                onClick={() => {
                                    setPlaying(false);
                                    const nextEntry = moveTo(index);
                                    if (nextEntry) {
                                        onCheckpointSelect?.(nextEntry);
                                    }
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {currentEntry && (
                <div className={cx('mt-3 rounded-md border p-2', changeStyle.borderClass, changeStyle.bgClass)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', changeStyle.dotClass)} />
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm font-semibold text-gray-900" title={checkpointTitle}>
                                        {getStepLabel(currentEntry)}
                                    </span>
                                    <Badge variant="outline" className={cx('h-5 px-1.5 text-[10px]', changeStyle.textClass, changeStyle.borderClass)}>
                                        {changeStyle.label}
                                    </Badge>
                                </div>
                                <div className="mt-0.5 truncate font-mono text-[11px] text-gray-500" title={currentEntry.checkpoint_id}>
                                    {currentEntry.checkpoint_id}
                                </div>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <span className="text-xs text-gray-500">
                                {currentIndex + 1} / {orderedEntries.length}
                            </span>
                            {!showHeader && onOpenCheckpoint && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                                    onClick={() => onOpenCheckpoint(currentEntry.checkpoint_id)}
                                >
                                    <Eye className="mr-1 h-3 w-3" />
                                    Snapshot
                                </Button>
                            )}
                        </div>
                    </div>

                    {(currentEntry.flow_id || currentEntry.task_id) && (
                        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1">
                            {currentEntry.flow_id && (
                                <Badge variant="outline" className="h-5 max-w-full truncate px-1.5 text-[10px] text-purple-700 border-purple-200" title={currentEntry.flow_id}>
                                    Flow: {currentEntry.flow_id.length > 14 ? `${currentEntry.flow_id.slice(0, 8)}...${currentEntry.flow_id.slice(-4)}` : currentEntry.flow_id}
                                </Badge>
                            )}
                            {currentEntry.task_id && (
                                <Badge variant="outline" className="h-5 max-w-full truncate px-1.5 text-[10px] text-gray-700 border-gray-200" title={currentEntry.task_id}>
                                    Task: {currentEntry.task_id.length > 14 ? `${currentEntry.task_id.slice(0, 8)}...${currentEntry.task_id.slice(-4)}` : currentEntry.task_id}
                                </Badge>
                            )}
                        </div>
                    )}

                    <div className={cx('mt-2', compact ? 'max-h-28 overflow-y-auto pr-1' : '')}>
                        <FieldChangePreview entry={currentEntry} />
                    </div>
                </div>
            )}
        </div>
    );
}
