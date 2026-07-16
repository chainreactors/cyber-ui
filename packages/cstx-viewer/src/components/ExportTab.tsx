import { useCallback, useMemo } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { downloadText, downloadJson, encodeCsvValue } from '@cyber/cstx';
import type { CstxGraphPayload } from '@cyber/cstx';
import { useT } from '../lib/i18n';
import type { GraphStats } from '../lib/stats';

function objectToCsvRows(records: Record<string, unknown>[]): string {
  if (!records.length) return '';
  const keys = [...new Set(records.flatMap(r => Object.keys(r)))];
  const header = keys.map(encodeCsvValue).join(',');
  const rows = records.map(r => keys.map(k => encodeCsvValue(r[k])).join(','));
  return [header, ...rows].join('\n');
}

interface ExportTabProps {
  payload: CstxGraphPayload;
  stats: GraphStats;
  filename: string | null;
}

export function ExportTab({ payload, stats, filename }: ExportTabProps) {
  const t = useT();
  const baseName = useMemo(() => {
    const name = filename ?? 'cstx-snapshot';
    return name.replace(/\.(snapshot\.)?json$/i, '');
  }, [filename]);

  const exportSnapshot = useCallback(() => {
    downloadJson(`${baseName}.snapshot.json`, {
      nodes: payload.nodes, edges: payload.edges, types: payload.types ?? {},
    });
  }, [payload, baseName]);

  const exportNodesCsv = useCallback(() => {
    const rows = payload.nodes.map(n => {
      const model = n.model ?? {};
      return { id: n.id, type: n.type, value: n.value, sources: (n.sources ?? []).join('; '), ...model };
    });
    downloadText(`${baseName}-nodes.csv`, objectToCsvRows(rows as Record<string, unknown>[]), 'text/csv;charset=utf-8');
  }, [payload.nodes, baseName]);

  const exportEdgesCsv = useCallback(() => {
    const rows = payload.edges.map(e => ({
      id: e.id, source_id: e.source_id, target_id: e.target_id, relation_type: e.relation_type, sources: (e.sources ?? []).join('; '),
    }));
    downloadText(`${baseName}-edges.csv`, objectToCsvRows(rows as Record<string, unknown>[]), 'text/csv;charset=utf-8');
  }, [payload.edges, baseName]);

  const exportMarkdown = useCallback(() => {
    const { summary, node_type_counts, vuln } = stats;
    const sorted = (c: Record<string, number>) => Object.entries(c).sort((a, b) => b[1] - a[1]);
    let md = `# CSTX Report\n\n- **Nodes**: ${summary.nodes}\n- **Edges**: ${summary.edges}\n- **Vulnerabilities**: ${vuln.total}\n- **Affected Assets**: ${vuln.affected_assets}\n\n`;
    if (Object.keys(vuln.severity_counts).length) {
      md += '## Severity Breakdown\n\n| Severity | Count |\n|----------|-------|\n';
      sorted(vuln.severity_counts).forEach(([s, c]) => { md += `| ${s} | ${c} |\n`; });
      md += '\n';
    }
    if (vuln.top_vulns.length) {
      md += '## Findings\n\n| Severity | Vulnerability | ID |\n|----------|--------------|----|\n';
      vuln.top_vulns.forEach(v => { md += `| ${v.severity} | ${v.name} | ${v.id} |\n`; });
      md += '\n';
    }
    md += '## Asset Types\n\n| Type | Count |\n|------|-------|\n';
    sorted(node_type_counts).forEach(([t, c]) => { md += `| ${t} | ${c} |\n`; });
    downloadText(`${baseName}-report.md`, md);
  }, [stats, baseName]);

  const formats = [
    { icon: FileJson, label: t('export.snapshot'), desc: t('export.snapshotDesc'), detail: `${payload.nodes.length}n / ${payload.edges.length}e`, action: exportSnapshot },
    { icon: FileSpreadsheet, label: t('export.nodesCsv'), desc: t('export.nodesCsvDesc'), detail: `${payload.nodes.length} rows`, action: exportNodesCsv },
    { icon: FileSpreadsheet, label: t('export.edgesCsv'), desc: t('export.edgesCsvDesc'), detail: `${payload.edges.length} rows`, action: exportEdgesCsv },
    { icon: FileText, label: t('export.markdown'), desc: t('export.markdownDesc'), detail: '', action: exportMarkdown },
  ];

  return (
    <div className="space-y-3 overflow-auto p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('export.title')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {formats.map(f => (
          <button
            key={f.label}
            type="button"
            onClick={f.action}
            className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-600"
          >
            <div className="rounded-lg bg-slate-100 p-2 transition-colors group-hover:bg-blue-50 dark:bg-slate-800 dark:group-hover:bg-blue-900/30">
              <f.icon className="h-5 w-5 text-slate-400 group-hover:text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{f.label}</span>
                <Download className="h-3 w-3 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{f.desc}</p>
              {f.detail && <p className="mt-1 text-[10px] tabular-nums text-slate-300">{f.detail}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
