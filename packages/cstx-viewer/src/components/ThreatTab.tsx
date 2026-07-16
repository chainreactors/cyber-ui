import { useMemo } from 'react';
import { useT } from '../lib/i18n';
import type { GraphStats } from '../lib/stats';
import { SEVERITY_COLORS, SEVERITY_ORDER, TYPE_PALETTE } from '../lib/palette';

interface ThreatTabProps {
  stats: GraphStats;
}

export function ThreatTab({ stats }: ThreatTabProps) {
  const t = useT();
  const { vuln } = stats;

  const severityEntries = useMemo(() => {
    const counts = vuln.severity_counts;
    return SEVERITY_ORDER.filter(s => counts[s] > 0).map(s => ({ severity: s, count: counts[s] }));
  }, [vuln.severity_counts]);

  const affectedTypeEntries = useMemo(
    () => Object.entries(vuln.affected_type_counts).sort((a, b) => b[1] - a[1]),
    [vuln.affected_type_counts],
  );

  if (!vuln.total) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        {t('threat.noVulns')}
      </div>
    );
  }

  const sevKey = (s: string) => `sev.${s}` as const;

  return (
    <div className="space-y-5 overflow-auto p-4">
      {/* Severity strip */}
      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        <div className="flex h-2">
          {severityEntries.map(({ severity, count }) => (
            <div key={severity} style={{ flex: count, backgroundColor: SEVERITY_COLORS[severity] }} />
          ))}
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('threat.title')}</span>
            <span className="text-xs text-slate-400">
              {vuln.total} {t('ov.vulns').toLowerCase()} &middot; {vuln.affected_assets} {t('ov.affected').toLowerCase()}
            </span>
          </div>
          {/* Severity cards */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(severityEntries.length, 6)}, 1fr)` }}>
            {severityEntries.map(({ severity, count }) => (
              <div
                key={severity}
                className="rounded-lg border p-3 text-center"
                style={{ borderColor: SEVERITY_COLORS[severity] + '40' }}
              >
                <div className="text-xl font-bold tabular-nums" style={{ color: SEVERITY_COLORS[severity] }}>
                  {count}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: SEVERITY_COLORS[severity], opacity: 0.8 }}>
                  {t(sevKey(severity))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Findings table */}
      {vuln.top_vulns.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('threat.findings')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 pr-4 font-semibold text-slate-400">{t('threat.col.severity')}</th>
                  <th className="pb-2 pr-4 font-semibold text-slate-400">{t('threat.col.vuln')}</th>
                  <th className="pb-2 font-semibold text-slate-400 text-right">{t('threat.col.affected')}</th>
                </tr>
              </thead>
              <tbody>
                {vuln.top_vulns.map(v => (
                  <tr key={v.id} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="py-2 pr-4">
                      <span
                        className="inline-block w-[60px] rounded px-2 py-0.5 text-center text-[10px] font-semibold text-white"
                        style={{ backgroundColor: SEVERITY_COLORS[v.severity] ?? '#6b7280' }}
                      >
                        {t(sevKey(v.severity)).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="font-medium text-slate-700 dark:text-slate-200">{v.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">{v.id}</div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{v.degree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Affected assets by type */}
      {affectedTypeEntries.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('threat.affectedByType')}</h3>
          <div className="space-y-1.5">
            {affectedTypeEntries.map(([type, count], i) => {
              const max = affectedTypeEntries[0][1];
              return (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 truncate text-right text-slate-500 dark:text-slate-400">{type}</span>
                  <div className="flex-1 h-[6px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, backgroundColor: TYPE_PALETTE[i % TYPE_PALETTE.length] }} />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
