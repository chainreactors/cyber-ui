import {describe, expect, it} from 'vitest';

import type {CSTXSnapshot} from '../types/transport.gen';
import {CSTXGraph, mergeSnapshots} from '../index';

const snapshot: CSTXSnapshot = {
  nodes: [
    {id: 'domain:example.com', type: 'domain-name', value: 'example.com', model: {host: 'example.com'}, sources: ['target'], extras: {}},
    {id: 'domain:api.example.com', type: 'subdomain', value: 'api.example.com', model: {host: 'api.example.com'}, sources: ['dnsx'], extras: {}},
  ],
  edges: [
    {id: 'relationship:contains', source_id: 'domain:example.com', target_id: 'domain:api.example.com', relation_type: 'contains', sources: ['dnsx'], attrs: {}},
  ],
  types: {'domain-name': {title: 'Domain'}},
};

describe('CSTXGraph', () => {
  it('hydrates and serializes the canonical snapshot without changing its shape', () => {
    const graph = CSTXGraph.fromSnapshot(snapshot);

    expect(graph.size).toBe(2);
    expect(graph.edgeCount).toBe(1);
    expect(graph.toSnapshot()).toEqual(snapshot);
  });

  it('provides graph traversal without exposing mutable internal attributes', () => {
    const graph = CSTXGraph.fromSnapshot(snapshot);
    const neighbor = graph.neighbors('domain:example.com')[0];
    neighbor.model.host = 'mutated.example.com';

    expect(graph.node('domain:api.example.com')?.model.host).toBe('api.example.com');
    expect(graph.outEdges('domain:example.com')).toEqual(snapshot.edges);
  });

  it('rejects edges whose endpoints are absent', () => {
    expect(() => CSTXGraph.fromSnapshot({...snapshot, nodes: snapshot.nodes.slice(0, 1)})).toThrow();
  });

  it('merges snapshots by canonical node and edge identity', () => {
    const merged = mergeSnapshots(snapshot, {
      nodes: [{...snapshot.nodes[0], sources: ['override']}],
      edges: [],
      types: {subdomain: {title: 'Subdomain'}},
    });

    expect(merged.nodes).toHaveLength(2);
    expect(merged.nodes[0].sources).toEqual(['override']);
    expect(merged.types).toEqual({...snapshot.types, subdomain: {title: 'Subdomain'}});
  });
});
