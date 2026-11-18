import type { CSTXEdge, CSTXNode, CSTXSnapshot } from '../types/transport.gen';
import { CSTXGraph } from './CSTXGraph';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isCSTXNode(value: unknown): value is CSTXNode {
    if (!isRecord(value)) return false;
    return typeof value.id === 'string'
        && typeof value.type === 'string'
        && typeof value.value === 'string'
        && isRecord(value.model)
        && isStringArray(value.sources)
        && isRecord(value.extras);
}

function isCSTXEdge(value: unknown): value is CSTXEdge {
    if (!isRecord(value)) return false;
    return typeof value.id === 'string'
        && typeof value.source_id === 'string'
        && typeof value.target_id === 'string'
        && typeof value.relation_type === 'string'
        && isStringArray(value.sources)
        && isRecord(value.attrs);
}

/** Parse and validate the strict, direct CSTX snapshot transport contract. */
export function parseCSTXSnapshot(value: unknown): CSTXSnapshot {
    if (!isRecord(value)) throw new Error('CSTX snapshot must be an object');
    if (value.format !== 'cstx.snapshot') {
        throw new Error('Unsupported CSTX snapshot format');
    }
    const fields = new Set(['format', 'nodes', 'edges', 'types']);
    if (Object.keys(value).some((field) => !fields.has(field))) {
        throw new Error('CSTX snapshot contains unsupported fields');
    }
    if (!Array.isArray(value.nodes) || !value.nodes.every(isCSTXNode)) {
        throw new Error('CSTX snapshot contains invalid nodes');
    }
    if (!Array.isArray(value.edges) || !value.edges.every(isCSTXEdge)) {
        throw new Error('CSTX snapshot contains invalid edges');
    }
    if (!isRecord(value.types)) throw new Error('CSTX snapshot types must be an object');

    return CSTXGraph.fromSnapshot(value as unknown as CSTXSnapshot).toSnapshot();
}

export function mergeSnapshots(...snapshots: CSTXSnapshot[]): CSTXSnapshot {
    const nodes = new Map<string, CSTXNode>();
    const edges = new Map<string, CSTXEdge>();
    const types: Record<string, unknown> = {};

    for (const snapshot of snapshots) {
        Object.assign(types, snapshot.types);
        for (const node of snapshot.nodes) nodes.set(node.id, node);
        for (const edge of snapshot.edges) edges.set(edge.id, edge);
    }

    return {
        format: 'cstx.snapshot',
        nodes: [...nodes.values()],
        edges: [...edges.values()],
        types,
    };
}
