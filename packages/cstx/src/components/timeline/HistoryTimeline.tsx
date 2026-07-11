import React from 'react';
import {AlertTriangle, ExternalLink, History} from 'lucide-react';
import {Badge, Button} from '@cyber/ui';
import {DataState} from '../primitives';
import type {CstxFieldChange, CstxHistoryEntry} from '../../types/graph';
import type {CstxLifecycle} from '../../lib/cstxHistory';
import {
    changeKindLabel,
    lifecycleStatusText,
    formatCstxHistoryFieldName,
    formatCstxHistoryTimeLabel,
    getCstxHistoryChangedFields,
    sortHistoryNewestFirst,
} from '../../lib/cstxHistory';

export interface HistoryTimelineProps {
    entries: CstxHistoryEntry[];
    loading?: boolean;
    error?: string | null;
    entityType?: 'node' | 'edge';
    lifecycle?: CstxLifecycle | null;
    onOpenCheckpoint?: (checkpointId: string) => void;
    onNavigate?: (type: string, data: unknown) => void;
    renderFlowReference?: (flowId: string) => React.ReactNode;
    className?: string;
}

const CHANGE_KIND_COLORS: Record<string, {dot: string; badge: string}> = {
    added: {dot: 'bg-emerald-400 border-emerald-400', badge: 'text-emerald-600 border-emerald-200'},
    updated: {dot: 'bg-amber-400 border-amber-400', badge: 'text-amber-600 border-amber-200'},
    removed: {dot: 'bg-red-400 border-red-400', badge: 'text-red-500 border-red-200'},
};

const formatValue = (v: unknown): string => {
    if (v === null || v === undefined) return '—';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
};

const FieldChangeLine: React.FC<{change: CstxFieldChange}> = ({change}) => (
    <div className="flex items-center gap-1.5 text-xs leading-5">
        <span className="text-gray-500 shrink-0">{formatCstxHistoryFieldName(change.field)}:</span>
        {change.old !== null && change.old !== undefined && (
            <span className="text-red-400 line-through">{formatValue(change.old)}</span>
        )}
        <span className="text-gray-300">&rarr;</span>
        <span className="text-emerald-600">{formatValue(change.new)}</span>
    </div>
);

export function HistoryTimeline({
    entries,
    loading = false,
    error = null,
    entityType = 'node',
    lifecycle,
    onOpenCheckpoint,
    onNavigate,
    renderFlowReference,
    className,
}: HistoryTimelineProps) {
    const entityLabel = entityType === 'edge' ? 'Relationship' : 'Asset';
    const emptyHint = entityType === 'edge'
        ? 'This relationship has no checkpoint history'
        : 'This asset has no checkpoint history';
    const firstDiscoveredLabel = entityType === 'edge' ? 'First established' : 'First discovered';

    if (loading) return <DataState loading loadingText={`Loading ${entityLabel.toLowerCase()} history...`} />;

    if (error) {
        return (
            <div className={className}>
                <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-500/10">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return <DataState empty emptyText="No history records" emptyHint={emptyHint} icon={History} />;
    }

    const sorted = sortHistoryNewestFirst(entries);

    return (
        <div className={className}>
            <div className="p-3 border border-gray-200 rounded-lg bg-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <History className="w-3.5 h-3.5 text-gray-400"/>
                        <span className="text-xs font-semibold text-gray-600">
                            {entityLabel} History ({entries.length})
                        </span>
                    </div>
                    {lifecycle && (
                        <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                                lifecycle.active
                                    ? 'text-emerald-600 border-emerald-200'
                                    : 'text-red-500 border-red-200'
                            }`}
                        >
                            {lifecycleStatusText(lifecycle)}
                        </Badge>
                    )}
                </div>

                <div className="relative">
                    {sorted.map((entry, idx) => {
                        const isLatest = idx === 0;
                        const isFirst = idx === sorted.length - 1;
                        const colors = CHANGE_KIND_COLORS[entry.change_kind] ?? CHANGE_KIND_COLORS.updated;

                        return (
                            <div
                                key={`${entry.checkpoint_id}-${idx}`}
                                className="relative pl-7 py-2.5 border-l-2 border-gray-200"
                            >
                                <div className={`absolute left-[-5px] top-[14px] w-2.5 h-2.5 rounded-full border-2 ${
                                    isLatest ? colors.dot : 'bg-white border-gray-300'
                                }`}/>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-900">
                                            {formatCstxHistoryTimeLabel(entry)}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] px-1.5 py-0 ${colors.badge}`}
                                        >
                                            {changeKindLabel(entry.change_kind)}
                                        </Badge>
                                        {isLatest && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-200">
                                                Latest
                                            </Badge>
                                        )}
                                    </div>
                                    {onOpenCheckpoint && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                                            onClick={() => onOpenCheckpoint(entry.checkpoint_id)}
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1"/>
                                            Snapshot
                                        </Button>
                                    )}
                                </div>

                                {getCstxHistoryChangedFields(entry).length > 0 && (
                                    <div className="mt-1 pl-0.5 space-y-0.5">
                                        {getCstxHistoryChangedFields(entry).map((change, i) => (
                                            <FieldChangeLine key={`${change.field}-${i}`} change={change} />
                                        ))}
                                    </div>
                                )}

                                {isFirst && getCstxHistoryChangedFields(entry).length === 0 && (
                                    <div className="mt-1 text-xs text-emerald-600">{firstDiscoveredLabel}</div>
                                )}

                                {renderFlowReference && entry.flow_id && (
                                    <div className="mt-1.5">
                                        {renderFlowReference(entry.flow_id)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
