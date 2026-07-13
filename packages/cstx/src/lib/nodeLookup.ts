import { asString } from './coerce';

const INTERNAL_GRAPH_ELEMENT_ID = /^\d+:[0-9a-fA-F-]+:\d+$/;
const PLAIN_NUMERIC_ID = /^\d+$/;

export const isInternalGraphElementId = (value: unknown): boolean =>
    INTERNAL_GRAPH_ELEMENT_ID.test(asString(value) ?? '');

const isStableId = (value: unknown): boolean => {
    const text = asString(value) ?? '';
    return !!text && !INTERNAL_GRAPH_ELEMENT_ID.test(text) && !PLAIN_NUMERIC_ID.test(text);
};

export const getStableNodeLookupId = (node: Record<string, unknown> | null | undefined): string => {
    if (!node) return '';
    for (const candidate of [node.cstx_id, node.id]) {
        if (isStableId(candidate)) return asString(candidate) ?? '';
    }
    return '';
};
