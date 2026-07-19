import { MultiDirectedGraph } from 'graphology';

import type { CSTXEdge, CSTXNode, CSTXSnapshot } from '../types/transport.gen';

type GraphAttributes = { types: Record<string, unknown> };

export class CSTXGraph {
  private readonly graph: MultiDirectedGraph<CSTXNode, CSTXEdge, GraphAttributes>;

  private constructor(graph: MultiDirectedGraph<CSTXNode, CSTXEdge, GraphAttributes>) {
    this.graph = graph;
  }

  static empty(): CSTXGraph {
    return CSTXGraph.fromSnapshot({ nodes: [], edges: [], types: {} });
  }

  static fromSnapshot(snapshot: CSTXSnapshot): CSTXGraph {
    const graph = new MultiDirectedGraph<CSTXNode, CSTXEdge, GraphAttributes>({
      allowSelfLoops: true,
      multi: true,
      type: 'directed',
    });
    graph.replaceAttributes({ types: { ...snapshot.types } });
    for (const node of snapshot.nodes) {
      graph.addNode(node.id, { ...node, model: { ...node.model }, extras: { ...node.extras }, sources: [...node.sources] });
    }
    for (const edge of snapshot.edges) {
      graph.addDirectedEdgeWithKey(edge.id, edge.source_id, edge.target_id, {
        ...edge,
        attrs: { ...edge.attrs },
        sources: [...edge.sources],
      });
    }
    return new CSTXGraph(graph);
  }

  toSnapshot(): CSTXSnapshot {
    return {
      nodes: this.nodes(),
      edges: this.edges(),
      types: { ...this.graph.getAttribute('types') },
    };
  }

  get size(): number {
    return this.graph.order;
  }

  get edgeCount(): number {
    return this.graph.size;
  }

  hasNode(id: string): boolean {
    return this.graph.hasNode(id);
  }

  hasEdge(id: string): boolean {
    return this.graph.hasEdge(id);
  }

  node(id: string): CSTXNode | undefined {
    return this.graph.hasNode(id) ? this.cloneNode(this.graph.getNodeAttributes(id)) : undefined;
  }

  edge(id: string): CSTXEdge | undefined {
    return this.graph.hasEdge(id) ? this.cloneEdge(this.graph.getEdgeAttributes(id)) : undefined;
  }

  nodes(): CSTXNode[] {
    return this.graph.mapNodes((_id, node) => ({
      ...node,
      model: { ...node.model },
      extras: { ...node.extras },
      sources: [...node.sources],
    }));
  }

  edges(): CSTXEdge[] {
    return this.graph.mapEdges((_id, edge) => ({
      ...edge,
      attrs: { ...edge.attrs },
      sources: [...edge.sources],
    }));
  }

  neighbors(id: string): CSTXNode[] {
    return this.graph.neighbors(id).map((neighborId) => this.cloneNode(this.graph.getNodeAttributes(neighborId)));
  }

  inEdges(id: string): CSTXEdge[] {
    return this.graph.inEdges(id).map((edgeId) => this.cloneEdge(this.graph.getEdgeAttributes(edgeId)));
  }

  outEdges(id: string): CSTXEdge[] {
    return this.graph.outEdges(id).map((edgeId) => this.cloneEdge(this.graph.getEdgeAttributes(edgeId)));
  }

  subgraph(nodeIds: Iterable<string>): CSTXGraph {
    const selected = new Set(nodeIds);
    const nodes = this.nodes().filter((node) => selected.has(node.id));
    const edges = this.edges().filter((edge) => selected.has(edge.source_id) && selected.has(edge.target_id));
    return CSTXGraph.fromSnapshot({ nodes, edges, types: { ...this.graph.getAttribute('types') } });
  }

  private cloneNode(node: CSTXNode): CSTXNode {
    return {...node, model: {...node.model}, extras: {...node.extras}, sources: [...node.sources]};
  }

  private cloneEdge(edge: CSTXEdge): CSTXEdge {
    return {...edge, attrs: {...edge.attrs}, sources: [...edge.sources]};
  }
}

export const getCSTXNodeLabel = (node: CSTXNode): string => {
  const model = node.model;
  for (const key of ['name', 'domain', 'ip', 'url', 'host']) {
    const value = model[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return node.value;
};

export const getCSTXNodeField = (node: CSTXNode, key: string): unknown => {
  if (key in node.extras) return node.extras[key];
  if (key in node.model) return node.model[key];
  if (key === 'id' || key === 'type' || key === 'value' || key === 'sources') return node[key];
  return undefined;
};

export const getCSTXEdgeField = (edge: CSTXEdge, key: string): unknown => {
  if (key in edge.attrs) return edge.attrs[key];
  if (
    key === 'id'
    || key === 'source_id'
    || key === 'target_id'
    || key === 'relation_type'
    || key === 'sources'
  ) return edge[key];
  return undefined;
};
