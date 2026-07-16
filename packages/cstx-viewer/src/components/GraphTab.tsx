import { useMemo } from 'react';
import { generateTypeColorMap } from '@cyber/cstx';
import type { CstxNode, CstxEdge } from '@cyber/cstx';
import { GraphContainer } from '@cyber/graph';

function toGraphNodes(nodes: CstxNode[]): Record<string, unknown>[] {
  return nodes
    .map((node): Record<string, unknown> | null => {
      const id = node.id ?? node.cstx_id;
      if (!id) return null;
      const name = String(node.value ?? id);
      return { ...node, id, name, type: node.type };
    })
    .filter((n): n is Record<string, unknown> => n !== null);
}

function toGraphEdges(
  edges: CstxEdge[],
  nodeIds: Set<string>,
): Record<string, unknown>[] {
  return edges
    .map((edge, index): Record<string, unknown> | null => {
      const source = edge.source_id;
      const target = edge.target_id;
      if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) return null;
      const id = edge.id ?? `${source}:${edge.relation_type}:${target}:${index}`;
      return { ...edge, id, source, target, type: edge.relation_type };
    })
    .filter((e): e is Record<string, unknown> => e !== null);
}

interface GraphTabProps {
  nodes: CstxNode[];
  edges: CstxEdge[];
}

export function GraphTab({ nodes, edges }: GraphTabProps) {
  const graphNodes = useMemo(() => toGraphNodes(nodes), [nodes]);
  const graphNodeIds = useMemo(() => new Set(graphNodes.map(n => String(n.id))), [graphNodes]);
  const graphEdges = useMemo(() => toGraphEdges(edges, graphNodeIds), [edges, graphNodeIds]);

  const typeColorMap = useMemo(() => generateTypeColorMap(
    [...new Set(graphNodes.map(n => String(n.type ?? 'unknown')))],
    'node',
  ), [graphNodes]);

  const relColorMap = useMemo(() => generateTypeColorMap(
    [...new Set(graphEdges.map(e => String(e.type ?? 'related')))],
    'edge',
  ), [graphEdges]);

  if (graphNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No nodes to display in graph view
      </div>
    );
  }

  return (
    <div className="h-full p-3">
      <GraphContainer
        nodes={graphNodes as any[]}
        edges={graphEdges as any[]}
        height="100%"
        className="h-full min-h-[320px] rounded-md border border-slate-200 dark:border-slate-700"
        typeColorMap={typeColorMap}
        relationshipColorMap={relColorMap}
      />
    </div>
  );
}
