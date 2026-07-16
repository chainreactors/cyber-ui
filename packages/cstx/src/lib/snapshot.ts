/**
 * Pure snapshot/envelope helpers for CSTX graph payloads.
 *
 * Every function is stateless — no service instance, no side-effects.
 */
import type { CstxNode, CstxEdge, CstxGraphPayload } from '../types';
import { asRecord, asString } from './coerce';

// ── Return type for parseCstxApiResult ──────────────────────────

export interface CstxApiResultEnvelope {
    kind?: string;
    graph?: CstxGraphPayload;
    view: Record<string, unknown>;
    stats: Record<string, unknown>;
    page: Record<string, unknown>;
    meta: Record<string, unknown>;
    raw: unknown;
}

// ── Snapshot helpers ─────────────────────────────────────────────

export function emptySnapshot(): CstxGraphPayload {
    return { nodes: [], edges: [], types: {} } as CstxGraphPayload;
}

export function unwrapSnapshot(input: unknown): CstxGraphPayload {
    if (!input) return emptySnapshot();

    const record = asRecord(input);
    if (Array.isArray(record.nodes)) {
        if (!Array.isArray(record.edges)) {
            throw new Error('Invalid CSTXSnapshot: expected nodes and edges arrays');
        }
        return {
            nodes: record.nodes as CstxNode[],
            edges: record.edges as CstxEdge[],
            types: asRecord(record.types),
        } as CstxGraphPayload;
    }

    if ('graph' in record) {
        return unwrapSnapshot(record.graph);
    }

    return emptySnapshot();
}

export function mergeSnapshots(...inputs: unknown[]): CstxGraphPayload {
    const nodes = new Map<string, CstxNode>();
    const edges = new Map<string, CstxEdge>();
    const types: Record<string, unknown> = {};

    inputs.forEach((input) => {
        const snapshot = unwrapSnapshot(input);
        Object.assign(types, asRecord((snapshot as unknown as Record<string, unknown>).types));
        snapshot.nodes.forEach((node) => {
            const id = asString(node.id);
            if (id) nodes.set(id, node);
        });
        snapshot.edges.forEach((edge) => {
            const id = asString(edge.id)
                ?? `${edge.source_id}:${edge.relation_type}:${edge.target_id}`;
            edges.set(id, edge);
        });
    });

    return { nodes: Array.from(nodes.values()), edges: Array.from(edges.values()), types } as CstxGraphPayload;
}

export function extractGraphPayloadFromEnvelope(envelope: unknown): CstxGraphPayload {
    let payload: CstxGraphPayload;
    try {
        payload = unwrapSnapshot(envelope);
    } catch (error) {
        console.warn('[extractGraphPayloadFromEnvelope] Invalid CSTX graph envelope', { envelope, error });
        throw new Error('Invalid graph envelope: expected CSTXSnapshot with nodes and edges');
    }
    if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
        console.warn('[extractGraphPayloadFromEnvelope] Invalid CSTX graph envelope', {
            envelopeType: typeof envelope,
            envelopeKeys: envelope && typeof envelope === 'object' ? Object.keys(envelope) : null,
            hasGraph: !!(envelope as any)?.graph,
            graphType: typeof payload,
            graphKeys: payload && typeof payload === 'object' ? Object.keys(payload) : null,
            envelope,
        });
        throw new Error('Invalid graph envelope: expected CSTXSnapshot with nodes and edges');
    }
    return payload;
}

export function processBackendResponse(data: unknown): unknown {
    const d = data as any;
    if (d && d.data && typeof d.data === 'object') {
        const backendResponse = d.data;
        if (Object.prototype.hasOwnProperty.call(backendResponse, 'data') && Object.prototype.hasOwnProperty.call(backendResponse, 'msg')) {
            if (backendResponse.msg === 'ok') {
                return backendResponse.data;
            } else {
                console.warn('Backend返回错误消息:', backendResponse.msg);
                return null;
            }
        }
        return backendResponse;
    }
    return data;
}

export function parseCstxApiResult(input: unknown): CstxApiResultEnvelope {
    const record = asRecord(input);
    const view = { ...asRecord((record as any).view) };
    const page = { ...asRecord((record as any).page) };
    const meta = { ...asRecord((record as any).meta) };
    const stats = { ...asRecord((record as any).stats) };
    const graph = Object.prototype.hasOwnProperty.call(record, 'graph')
        ? extractGraphPayloadFromEnvelope(record)
        : undefined;

    return {
        kind: typeof (record as any).kind === 'string' ? (record as any).kind : undefined,
        graph,
        view,
        stats,
        page,
        meta,
        raw: input,
    };
}
