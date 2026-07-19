import type { CstxChangeKind, CstxFieldChange, CstxHistoryEntry } from '../types/graph';
import type {CSTXDelta} from '../types/transport.gen';
import { formatShortTimeValue, toDisplayDate, type TimeDisplayValue } from './timeDisplay';

export interface CstxLifecycle {
    cstx_id: string;
    first_checkpoint_id: string;
    last_checkpoint_id: string;
    active: boolean;
}

export const CSTX_CHANGE_STYLES: Record<CstxChangeKind, {
    label: string;
    color: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
    dotClass: string;
}> = {
    added: {
        label: '新增',
        color: '#10b981',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-200',
        bgClass: 'bg-emerald-50',
        dotClass: 'bg-emerald-500',
    },
    updated: {
        label: '变更',
        color: '#f59e0b',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
        bgClass: 'bg-amber-50',
        dotClass: 'bg-amber-500',
    },
    removed: {
        label: '移除',
        color: '#ef4444',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
        bgClass: 'bg-red-50',
        dotClass: 'bg-red-500',
    },
};

export function changeKindLabel(kind: CstxChangeKind): string {
    return CSTX_CHANGE_STYLES[kind]?.label ?? kind;
}

export function lifecycleStatusText(lifecycle: CstxLifecycle): string {
    if (lifecycle.active) return '当前活跃';
    return '已移除';
}

export function formatCheckpointDelta(stats: CSTXDelta): string {
    const parts: string[] = [];
    if (stats.added_nodes > 0) parts.push(`+${stats.added_nodes} 节点`);
    if (stats.updated_nodes > 0) parts.push(`~${stats.updated_nodes} 节点`);
    if (stats.removed_nodes > 0) parts.push(`-${stats.removed_nodes} 节点`);
    if (stats.reactivated_nodes > 0) parts.push(`↺${stats.reactivated_nodes} 节点`);
    if (stats.added_edges > 0) parts.push(`+${stats.added_edges} 边`);
    if (stats.updated_edges > 0) parts.push(`~${stats.updated_edges} 边`);
    if (stats.removed_edges > 0) parts.push(`-${stats.removed_edges} 边`);
    if (stats.reactivated_edges > 0) parts.push(`↺${stats.reactivated_edges} 边`);
    return parts.length > 0 ? parts.join(', ') : '无变更';
}

const FIELD_LABELS: Record<string, string> = {
    'model.ip': 'IP',
    'model.host': '主机名',
    'model.port': '端口',
    'model.status_code': '状态码',
    'model.title': '标题',
    'model.asn_number': 'ASN',
    'model.country': '国家',
    'model.cdn_name': 'CDN',
    'model.waf_name': 'WAF',
    'model.frameworks': '框架',
    sources: '数据源',
};

export const formatCstxHistoryFieldName = (field: unknown): string => {
    if (typeof field === 'string') {
        const normalized = field.trim();
        if (normalized.length === 0) return '字段变更';
        return FIELD_LABELS[normalized] ?? normalized.replace(/^model\./, '');
    }
    if (typeof field === 'number' && Number.isFinite(field)) {
        return String(field);
    }
    return '字段变更';
};

export const formatCstxHistoryValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
};

export const formatCstxFieldChange = (change: CstxFieldChange): string => {
    const field = formatCstxHistoryFieldName(change.field);
    return `${field}: ${formatCstxHistoryValue(change.old)} -> ${formatCstxHistoryValue(change.new)}`;
};

export const getCstxHistoryChangedFields = (
    entry: Pick<CstxHistoryEntry, 'changed_fields'> | {changed_fields?: unknown} | null | undefined,
): CstxFieldChange[] => {
    const rawChanges = entry?.changed_fields;
    if (!Array.isArray(rawChanges)) return [];

    return rawChanges
        .map((change): CstxFieldChange | null => {
            if (!change || typeof change !== 'object') {
                return null;
            }
            const record = change as Record<string, unknown>;
            return {
                field: typeof record.field === 'string' || typeof record.field === 'number'
                    ? record.field
                    : undefined,
                old: record.old,
                new: record.new,
            };
        })
        .filter((change): change is CstxFieldChange => change !== null);
};

export const formatCstxHistoryTimeLabel = (entry: CstxHistoryEntry): string => {
    const value = entry.created_at as TimeDisplayValue;
    const fallback = typeof entry.created_at === 'string' && entry.created_at.length > 0
        ? entry.created_at.slice(0, 16)
        : formatCstxHistoryValue(entry.created_at);
    return formatShortTimeValue(value, fallback);
};

export const getHistoryEntryTimestamp = (entry: CstxHistoryEntry): number => {
    return toDisplayDate(entry.created_at as TimeDisplayValue)?.getTime() ?? 0;
};

export const sortHistoryOldestFirst = (items: CstxHistoryEntry[]): CstxHistoryEntry[] => (
    [...items].sort((a, b) => getHistoryEntryTimestamp(a) - getHistoryEntryTimestamp(b))
);

export const sortHistoryNewestFirst = (items: CstxHistoryEntry[]): CstxHistoryEntry[] => (
    [...items].sort((a, b) => getHistoryEntryTimestamp(b) - getHistoryEntryTimestamp(a))
);
