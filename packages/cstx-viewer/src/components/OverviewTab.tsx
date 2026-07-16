import { useMemo } from 'react';
import { useT } from '../lib/i18n';
import type { GraphStats } from '../lib/stats';
import { SEVERITY_COLORS, SEVERITY_ORDER, TYPE_PALETTE } from '../lib/palette';

function sortedEntries(counts: Record<string, number>, limit = 15): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

interface OverviewTabProps {
  stats: GraphStats;
}

export function OverviewTab({ stats }: OverviewTabProps) {
  const t = useT();
  const { summary, node_type_counts, source_counts, top_domains, top_ports, ip_coverage, vuln } = stats;

  const nodeTypeEntries = useMemo(() => sortedEntries(node_type_counts), [node_type_counts]);
  const sourceEntries = useMemo(() => sortedEntries(source_counts), [source_counts]);
  const severityEntries = useMemo(() => {
    const c = vuln.severity_counts;
    return SEVERITY_ORDER.filter(s => c[s] > 0).map(s => ({ s, c: c[s] }));
  }, [vuln.severity_counts]);
  const totalAssets = summary.nodes - vuln.total;

  return (
    <div className="space-y-5 overflow-auto p-4">
      {/* Executive summary card */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        {/* Severity strip — thin visual indicator */}
        {vuln.total > 0 && (
          <div className="flex h-[3px]">
            {severityEntries.map(({ s, c }) => (
              <div key={s} style={{ flex: c, backgroundColor: SEVERITY_COLORS[s] }} />
            ))}
          </div>
        )}
        <div className="p-4">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('ov.title')}</span>
            <span className="text-xs text-slate-400">{summary.nodes} nodes &middot; {summary.edges} edges</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { v: vuln.total, l: t('ov.vulns') },
              { v: vuln.affected_assets, l: t('ov.affected') },
              { v: totalAssets, l: t('ov.totalAssets') },
              { v: nodeTypeEntries.length, l: t('ov.assetTypes') },
              { v: ip_coverage.total, l: t('ov.ips') },
              { v: sourceEntries.length, l: t('ov.sources') },
            ].map(kpi => (
              <div key={kpi.l}>
                <div className="text-2xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{kpi.v}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{kpi.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset distribution + IP coverage */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('ov.assetDist')}</h3>
          <div className="flex h-6 overflow-hidden rounded gap-[2px]">
            {nodeTypeEntries.map(([type, count], i) => (
              <div key={type} title={`${type}: ${count}`} style={{ flex: count, backgroundColor: TYPE_PALETTE[i % TYPE_PALETTE.length] }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {nodeTypeEntries.map(([type, count], i) => (
              <div key={type} className="flex items-center gap-1.5 text-[11px]">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: TYPE_PALETTE[i % TYPE_PALETTE.length] }} />
                <span className="text-slate-500 dark:text-slate-400">{type}</span>
                <span className="tabular-nums text-slate-400 dark:text-slate-500">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {ip_coverage.total > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('ov.ipCoverage')}</h3>
            <div className="space-y-2">
              {[
                { label: 'CDN', value: ip_coverage.with_cdn, color: '#6366f1' },
                { label: 'WAF', value: ip_coverage.with_waf, color: '#f59e0b' },
                { label: 'Cloud', value: ip_coverage.with_cloud, color: '#10b981' },
              ].map(item => {
                const pct = ip_coverage.total ? (item.value / ip_coverage.total * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3 text-xs">
                    <span className="w-10 text-right font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
                    <div className="flex-1 h-[6px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                    <span className="w-16 text-right tabular-nums text-slate-400">{item.value}/{ip_coverage.total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Data Sources + Domains/Ports */}
      <div className="grid gap-4 md:grid-cols-2">
        {sourceEntries.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('ov.sources')}</h3>
            <div className="space-y-1.5">
              {sourceEntries.map(([name, value], i) => {
                const max = sourceEntries[0][1];
                return (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span className="w-20 shrink-0 truncate text-right text-slate-500 dark:text-slate-400">{name}</span>
                    <div className="flex-1 h-[6px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: TYPE_PALETTE[i % TYPE_PALETTE.length] }} />
                    </div>
                    <span className="w-8 shrink-0 text-right tabular-nums text-slate-400">{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(top_domains.length > 0 || top_ports.length > 0) && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            {top_domains.length > 0 && (
              <>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('ov.topDomains')}</h3>
                <div className="mb-3 space-y-1">
                  {top_domains.slice(0, 5).map(d => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{d.domain}</span>
                      <span className="tabular-nums text-slate-400">{d.subdomains} {t('ov.sub')}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {top_ports.length > 0 && (
              <>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('ov.topPorts')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {top_ports.slice(0, 10).map(p => (
                    <span key={p.port} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      :{p.port} <span className="text-slate-400">({p.count})</span>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
