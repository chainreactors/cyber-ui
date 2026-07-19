import { asRecord } from './coerce';
import type {CSTXEdge, CSTXNode} from '../types/transport.gen';

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

export const getCstxFlags = (value: unknown): number => {
    const record = asRecord(value);
    return toMask(asRecord(record.extras).cstx_flags) ?? toMask(record.cstx_flags) ?? 0;
};

export const matchesCstxFlagFilter = (node: CSTXNode, state: CstxFlagFilterState): boolean => {
    const flags = getCstxFlags(node);
    if (state.mode === 'all') return true;
    if (state.mode === 'flagged') {
        const mask = normalizeCstxFlagMask(state.mask);
        return mask > 0 ? (flags & mask) !== 0 : flags !== 0;
    }
    const excludeMask = normalizeCstxFlagMask(state.mask);
    return excludeMask > 0 ? (flags & excludeMask) === 0 : true;
};

export const filterNodesByCstxFlags = <T extends CSTXNode>(items: T[], state: CstxFlagFilterState): T[] => {
    if (state.mode === 'all') return items;
    return items.filter(item => matchesCstxFlagFilter(item, state));
};

export const getCstxNodeId = (node: CSTXNode): string => node.id;

export const filterEdgesByVisibleNodes = <T extends CSTXEdge>(edges: T[], visibleNodeIds: Set<string>): T[] => (
    edges.filter((edge) => visibleNodeIds.has(edge.source_id) && visibleNodeIds.has(edge.target_id))
);

export const isFalsePositive = (node: CSTXNode): boolean => (
    (getCstxFlags(node) & CSTX_FLAGS.FALSE_POSITIVE) !== 0
);

export const hasCstxFlag = (node: CSTXNode, flagValue: number): boolean => (
    (getCstxFlags(node) & normalizeCstxFlagMask(flagValue)) !== 0
);

export const getCstxFlagAddLabel = (option: CstxFlagOption): string => `标记为${option.label}`;
export const getCstxFlagRemoveLabel = (option: CstxFlagOption): string => `取消${option.label}标记`;

export const getCstxFlagActionLabel = (node: CSTXNode, option: CstxFlagOption): string => (
    hasCstxFlag(node, option.value) ? getCstxFlagRemoveLabel(option) : getCstxFlagAddLabel(option)
);

export const getCstxFlagActionToast = (option: CstxFlagOption, active: boolean): string => (
    active ? `已标记为${option.label}` : `已取消${option.label}标记`
);

export const shouldHideByCstxExcludeMask = (node: CSTXNode, excludeMask = DEFAULT_CSTX_EXCLUDE_MASK): boolean => (
    (getCstxFlags(node) & normalizeCstxFlagMask(excludeMask)) !== 0
);

export const getCstxNodeLookupId = (node: CSTXNode): string => node.id;

const withUpdatedCstxFlags = <T extends CSTXNode>(node: T, cstxFlags: number): T => ({
    ...node,
    extras: {...node.extras, cstx_flags: cstxFlags},
});

export const applyCstxFlagUpdateToItem = <T extends CSTXNode>(item: T, updated: unknown): T => {
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

    throw new Error('CSTX flag update response is missing cstx_flags and masks');
};

export const countCstxFlagFilter = (items: CSTXNode[], state: CstxFlagFilterState) => {
    const total = items.length;
    const visible = filterNodesByCstxFlags(items, state).length;
    return {
        total,
        visible,
        hidden: Math.max(0, total - visible),
        flagged: items.reduce<number>((count, item) => count + (getCstxFlags(item) !== 0 ? 1 : 0), 0),
    };
};
