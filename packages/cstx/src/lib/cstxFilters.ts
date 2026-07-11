import type { CstxFilterDefinition } from '../types/filter';

const stringifyPayloadValue = (value: unknown): string => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ');
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value).trim();
    }
    return '';
};

export const getCstxFilterQueryText = (
    filter: Pick<CstxFilterDefinition, 'query_payload'> | null | undefined,
): string | null => {
    const query = typeof filter?.query_payload?.q === 'string'
        ? filter.query_payload.q.trim()
        : '';
    return query || null;
};

export const getCstxFilterDescriptionText = (
    filter: Pick<CstxFilterDefinition, 'description'> | null | undefined,
): string | null => {
    const description = typeof filter?.description === 'string' ? filter.description.trim() : '';
    return description || null;
};

export const getCstxFilterPayloadString = (
    filter: Pick<CstxFilterDefinition, 'query_payload'> | null | undefined,
    key: string,
): string | null => {
    const value = filter?.query_payload?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const getCstxFilterPayloadStringArray = (
    filter: Pick<CstxFilterDefinition, 'query_payload'> | null | undefined,
    key: string,
): string[] => {
    const value = filter?.query_payload?.[key];
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
};

export const getCstxFilterPayloadSummary = (
    filter: Pick<CstxFilterDefinition, 'query_payload' | 'stage'>,
): string | null => {
    const query = getCstxFilterQueryText(filter);
    if (query) return 'CSTX: ' + query;

    const payload = filter.query_payload ?? {};
    const summaryParts = [
        ['severity', '严重度'],
        ['source', '来源'],
        ['vuln_type', '漏洞类型'],
        ['vulnTypes', '漏洞类型'],
        ['checkpoint_id', 'Commit'],
    ]
        .map(([key, label]) => {
            const text = stringifyPayloadValue(payload[key]);
            return text ? label + ': ' + text : '';
        })
        .filter(Boolean);

    if (summaryParts.length > 0) {
        return '参数: ' + summaryParts.join(' · ');
    }
    return filter.stage === 2 ? '二阶全量攻击向量图' : null;
};
