import type { CSTXEdge, CSTXNode, CSTXSnapshot } from '../types/transport.gen';

export function mergeSnapshots(...snapshots: CSTXSnapshot[]): CSTXSnapshot {
    const nodes = new Map<string, CSTXNode>();
    const edges = new Map<string, CSTXEdge>();
    const types: Record<string, unknown> = {};

    for (const snapshot of snapshots) {
        Object.assign(types, snapshot.types);
        for (const node of snapshot.nodes) nodes.set(node.id, node);
        for (const edge of snapshot.edges) edges.set(edge.id, edge);
    }

    return {nodes: [...nodes.values()], edges: [...edges.values()], types};
}
