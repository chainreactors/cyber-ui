import { asRecord } from './coerce';
import { getStableNodeLookupId } from './nodeLookup';

export const CSTX_FLAGS = {
    HONEYPOT: 1 << 0,
    NOISE: 1 << 1,
    FALSE_POSITIVE: 1 << 2,
    MANUAL_IGNORED: 1 << 3,
    THREAT_PRESENT: 1 << 4,
    HISTORIC_VULNERABLE: 1 << 5,
} as const;

export const CSTX_FLAGS_ALL = Object.values(CSTX_FLAGS).reduce((mask, value) => mask | value, 0);
export const DEFAULT_CSTX_EXCLUDE_MASK = CSTX_FLAGS.HONEYPOT
    | CSTX_FLAGS.NOISE
    | CSTX_FLAGS.FALSE_POSITIVE
    | CSTX_FLAGS.MANUAL_IGNORED;

export type CstxFlagFilterMode = 'clean' | 'all' | 'flagged';

export type CstxFlagFilterState = {
    mode: CstxFlagFilterMode;
    mask: number;
};

export const DEFAULT_CSTX_FLAG_FILTER: CstxFlagFilterState = {
    mode: 'clean',
    mask: DEFAULT_CSTX_EXCLUDE_MASK,
};

export const CSTX_FLAG_OPTIONS = [
    {key: 'HONEYPOT', token: 'honeypot', label: '蜜罐', value: CSTX_FLAGS.HONEYPOT},
    {key: 'NOISE', token: 'noise', label: '噪声', value: CSTX_FLAGS.NOISE},
    {key: 'FALSE_POSITIVE', token: 'false_positive', label: '误报', value: CSTX_FLAGS.FALSE_POSITIVE},
    {key: 'MANUAL_IGNORED', token: 'manual_ignored', label: '人工忽略', value: CSTX_FLAGS.MANUAL_IGNORED},
    {key: 'THREAT_PRESENT', token: 'threat_present', label: '存在威胁', value: CSTX_FLAGS.THREAT_PRESENT},
    {key: 'HISTORIC_VULNERABLE', token: 'historic_vulnerable', label: '历史漏洞', value: CSTX_FLAGS.HISTORIC_VULNERABLE},
] as const;

export type CstxFlagOption = (typeof CSTX_FLAG_OPTIONS)[number];

const toMask = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.trunc(value));
    }
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
    }
    return null;
};

export const normalizeCstxFlagFilterMode = (value: unknown): CstxFlagFilterMode => (
    value === 'all' || value === 'flagged' || value === 'clean' ? value : DEFAULT_CSTX_FLAG_FILTER.mode
);

export const normalizeCstxFlagMask = (value: unknown): number => toMask(value) ?? DEFAULT_CSTX_FLAG_FILTER.mask;

export const getCstxFlagFilterMasks = (state: CstxFlagFilterState): {excludeMask: number; includeMask: number} => {
    const normalized = {
        mode: normalizeCstxFlagFilterMode(state.mode),
        mask: normalizeCstxFlagMask(state.mask),
    };
    if (normalized.mode === 'all') return {excludeMask: 0, includeMask: 0};
    if (normalized.mode === 'flagged') return {excludeMask: 0, includeMask: normalized.mask};
    return {excludeMask: normalized.mask, includeMask: 0};
};

export const getCstxFlags = (item: unknown): number => {
    const rec = asRecord(item);
    return toMask(rec.cstx_flags) ?? 0;
};

export const matchesCstxFlagFilter = (item: unknown, state: CstxFlagFilterState): boolean => {
    const flags = getCstxFlags(item);
    if (state.mode === 'all') return true;
    if (state.mode === 'flagged') {
        const mask = normalizeCstxFlagMask(state.mask);
        return mask > 0 ? (flags & mask) !== 0 : flags !== 0;
    }
    const excludeMask = normalizeCstxFlagMask(state.mask);
    return excludeMask > 0 ? (flags & excludeMask) === 0 : true;
};

export const filterNodesByCstxFlags = <T>(items: T[], state: CstxFlagFilterState): T[] => {
    if (state.mode === 'all') return items;
    return items.filter(item => matchesCstxFlagFilter(item, state));
};

export const getCstxNodeId = (item: unknown): string | null => {
    const rec = asRecord(item);
    const rawId = rec.cstx_id ?? rec.id;
    if (rawId === null || rawId === undefined) return null;
    const value = String(rawId).trim();
    return value || null;
};

export const filterEdgesByVisibleNodes = <T>(edges: T[], visibleNodeIds: Set<string>): T[] => (
    edges.filter(edge => {
        const rec = asRecord(edge);
        const rawSource = rec.source ?? rec.source_id;
        const rawTarget = rec.target ?? rec.target_id;
        if (rawSource === null || rawSource === undefined || rawTarget === null || rawTarget === undefined) {
            return false;
        }
        return visibleNodeIds.has(String(rawSource)) && visibleNodeIds.has(String(rawTarget));
    })
);

export const isFalsePositive = (item: unknown): boolean => (
    (getCstxFlags(item) & CSTX_FLAGS.FALSE_POSITIVE) !== 0
);

export const hasCstxFlag = (item: unknown, flagValue: number): boolean => (
    (getCstxFlags(item) & normalizeCstxFlagMask(flagValue)) !== 0
);

export const getCstxFlagAddLabel = (option: CstxFlagOption): string => `标记为${option.label}`;
export const getCstxFlagRemoveLabel = (option: CstxFlagOption): string => `取消${option.label}标记`;

export const getCstxFlagActionLabel = (item: unknown, option: CstxFlagOption): string => (
    hasCstxFlag(item, option.value) ? getCstxFlagRemoveLabel(option) : getCstxFlagAddLabel(option)
);

export const getCstxFlagActionToast = (option: CstxFlagOption, active: boolean): string => (
    active ? `已标记为${option.label}` : `已取消${option.label}标记`
);

export const shouldHideByCstxExcludeMask = (item: unknown, excludeMask = DEFAULT_CSTX_EXCLUDE_MASK): boolean => (
    (getCstxFlags(item) & normalizeCstxFlagMask(excludeMask)) !== 0
);

export const getCstxNodeLookupId = (item: unknown): string | null => {
    const rec = asRecord(item);
    const stableId = getStableNodeLookupId(rec);
    if (stableId) return stableId;

    const raw = rec._raw ? asRecord(rec._raw) : null;
    return getStableNodeLookupId(raw) || null;
};

const withUpdatedCstxFlags = <T>(item: T, cstxFlags: number): T => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item;
    const rec = item as Record<string, unknown>;
    const next = {
        ...rec,
        cstx_flags: cstxFlags,
    } as Record<string, unknown>;
    const attrs = asRecord(rec.attributes);
    if (Object.keys(attrs).length > 0) {
        next.attributes = Object.fromEntries(
            Object.entries(attrs).filter(([key]) => key !== 'cstx_flags'),
        );
    }
    return {
        ...next,
    } as T;
};

export const applyCstxFlagUpdateToItem = <T>(item: T, updated: unknown): T => {
    const rec = asRecord(updated);
    const explicitFlags = toMask(rec.cstx_flags);
    if (explicitFlags !== null) {
        return withUpdatedCstxFlags(item, explicitFlags);
    }

    const addMask = toMask(rec.add_mask ?? rec.addMask) ?? 0;
    const removeMask = toMask(rec.remove_mask ?? rec.removeMask) ?? 0;
    if (addMask > 0 || removeMask > 0) {
        const nextFlags = (getCstxFlags(item) | addMask) & ~removeMask;
        return withUpdatedCstxFlags(item, Math.max(0, nextFlags));
    }

    const nextFlags = getCstxFlags(updated);
    return withUpdatedCstxFlags(item, nextFlags);
};

export const countCstxFlagFilter = (items: unknown[], state: CstxFlagFilterState) => {
    const total = items.length;
    const visible = filterNodesByCstxFlags(items, state).length;
    return {
        total,
        visible,
        hidden: Math.max(0, total - visible),
        flagged: items.reduce<number>((count, item) => count + (getCstxFlags(item) !== 0 ? 1 : 0), 0),
    };
};
