import type { CstxNode, CstxEdge } from '@cyber/cstx';

export interface TopNode {
  id: string;
  type: string;
  value: string;
  degree: number;
}

export interface TopDomain {
  id: string;
  domain: string;
  subdomains: number;
}

export interface TopPort {
  port: string;
  count: number;
}

export interface TopVuln {
  id: string;
  name: string;
  severity: string;
  degree: number;
}

export interface IpCoverage {
  total: number;
  with_cdn: number;
  with_waf: number;
  with_cloud: number;
}

export interface VulnStats {
  total: number;
  severity_counts: Record<string, number>;
  affected_assets: number;
  affected_type_counts: Record<string, number>;
  top_vulns: TopVuln[];
}

export interface GraphStats {
  summary: {
    nodes: number;
    edges: number;
    node_types: number;
    relation_types: number;
  };
  node_type_counts: Record<string, number>;
  relation_type_counts: Record<string, number>;
  source_counts: Record<string, number>;
  top_nodes: TopNode[];
  top_domains: TopDomain[];
  top_ports: TopPort[];
  ip_coverage: IpCoverage;
  vuln: VulnStats;
}

const SEVERITY_INT_MAP: Record<number, string> = {
  0: 'unknown', 1: 'info', 2: 'low', 3: 'medium', 4: 'high', 5: 'critical',
};

function getModelField(node: CstxNode, field: string): unknown {
  const model = node.model as Record<string, unknown> | undefined;
  if (model && typeof model === 'object') return model[field] ?? undefined;
  return undefined;
}

function nodeType(node: CstxNode): string {
  return typeof node.type === 'string' ? node.type : 'unknown';
}

function edgeType(edge: CstxEdge): string {
  return typeof edge.relation_type === 'string' ? edge.relation_type : 'unknown';
}

function normalizeSeverity(value: unknown): string {
  if (value == null) return 'unknown';
  if (typeof value === 'number') return SEVERITY_INT_MAP[value] ?? 'unknown';
  if (typeof value === 'string') {
    const low = value.trim().toLowerCase();
    return low || 'unknown';
  }
  return 'unknown';
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topEntries(counts: Record<string, number>, n: number): [string, number][] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

export function computeStats(
  nodes: CstxNode[],
  edges: CstxEdge[],
  topN = 10,
): GraphStats {
  const nodeTypeCounts = countBy(nodes, nodeType);
  const relTypeCounts = countBy(edges, edgeType);

  const sourceCounts: Record<string, number> = {};
  for (const node of nodes) {
    for (const src of node.sources ?? []) {
      const s = String(src);
      sourceCounts[s] = (sourceCounts[s] || 0) + 1;
    }
  }

  const degreeMap: Record<string, number> = {};
  for (const edge of edges) {
    if (edge.source_id) degreeMap[edge.source_id] = (degreeMap[edge.source_id] || 0) + 1;
    if (edge.target_id) degreeMap[edge.target_id] = (degreeMap[edge.target_id] || 0) + 1;
  }

  const nodeIndex = new Map(nodes.map(n => [n.id, n]));

  const topNodes: TopNode[] = topEntries(degreeMap, topN)
    .map(([id, degree]) => {
      const node = nodeIndex.get(id);
      if (!node) return null;
      return { id, type: nodeType(node), value: String(node.value ?? ''), degree };
    })
    .filter((n): n is TopNode => n !== null);

  const domainIds = new Set(nodes.filter(n => nodeType(n) === 'domain').map(n => n.id));
  const subdomainRels = new Set(['has-subdomain', 'has_subdomain']);
  const domainCounts: Record<string, number> = {};
  for (const edge of edges) {
    if (subdomainRels.has(edgeType(edge)) && domainIds.has(edge.source_id)) {
      domainCounts[edge.source_id] = (domainCounts[edge.source_id] || 0) + 1;
    }
  }
  const topDomains: TopDomain[] = topEntries(domainCounts, topN)
    .map(([id, count]) => {
      const node = nodeIndex.get(id);
      return node ? { id, domain: String(node.value ?? ''), subdomains: count } : null;
    })
    .filter((d): d is TopDomain => d !== null);

  const portCounts: Record<string, number> = {};
  for (const node of nodes) {
    if (nodeType(node) !== 'port') continue;
    let portVal = getModelField(node, 'port');
    if (!portVal && node.value && String(node.value).includes(':')) {
      portVal = String(node.value).split(':').pop();
    }
    if (portVal != null) {
      const key = String(portVal);
      portCounts[key] = (portCounts[key] || 0) + 1;
    }
  }
  const topPorts: TopPort[] = topEntries(portCounts, topN)
    .map(([port, count]) => ({ port, count }));

  const ipNodes = nodes.filter(n => nodeType(n) === 'ip');
  const ipCoverage: IpCoverage = {
    total: ipNodes.length,
    with_cdn: ipNodes.filter(n => getModelField(n, 'cdn_name')).length,
    with_waf: ipNodes.filter(n => getModelField(n, 'waf_name')).length,
    with_cloud: ipNodes.filter(n => getModelField(n, 'cloud_name')).length,
  };

  const vulnNodes = nodes.filter(n => nodeType(n) === 'vuln');
  const vulnIds = new Set(vulnNodes.map(n => n.id));
  const severityCounts = countBy(vulnNodes, n => normalizeSeverity(getModelField(n, 'severity')));

  const affectedIds = new Set<string>();
  for (const edge of edges) {
    if (vulnIds.has(edge.source_id) && edge.target_id) affectedIds.add(edge.target_id);
    else if (vulnIds.has(edge.target_id) && edge.source_id) affectedIds.add(edge.source_id);
  }
  const affectedAssets = [...affectedIds].map(id => nodeIndex.get(id)).filter(Boolean) as CstxNode[];
  const affectedTypeCounts = countBy(affectedAssets, nodeType);

  const topVulns: TopVuln[] = topEntries(degreeMap, topN * 2)
    .filter(([id]) => vulnIds.has(id))
    .slice(0, topN)
    .map(([id, degree]) => {
      const node = nodeIndex.get(id);
      if (!node) return null;
      return {
        id,
        name: String(node.value ?? ''),
        severity: normalizeSeverity(getModelField(node, 'severity')),
        degree,
      };
    })
    .filter((v): v is TopVuln => v !== null);

  return {
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      node_types: Object.keys(nodeTypeCounts).length,
      relation_types: Object.keys(relTypeCounts).length,
    },
    node_type_counts: nodeTypeCounts,
    relation_type_counts: relTypeCounts,
    source_counts: sourceCounts,
    top_nodes: topNodes,
    top_domains: topDomains,
    top_ports: topPorts,
    ip_coverage: ipCoverage,
    vuln: {
      total: vulnNodes.length,
      severity_counts: severityCounts,
      affected_assets: affectedIds.size,
      affected_type_counts: affectedTypeCounts,
      top_vulns: topVulns,
    },
  };
}
