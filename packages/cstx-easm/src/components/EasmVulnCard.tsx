import { AlertCircle } from 'lucide-react'
import { cn } from '@cyber/theme'
import type { Vuln } from '../types'
import { EasmBadge } from './EasmBadge'
import { severityTone } from '../lib/tones'
import { HttpEvidenceView } from '@cyber/traffic'

export function EasmVulnCard({ vuln, detailsLabel = 'Details', labels }: { vuln: Vuln; detailsLabel?: string; labels?: Record<string, string> }) {
  const hasDetail = Boolean(vuln.request || vuln.response)
  const tone = severityTone(vuln.severity)
  const isWeakpass = Boolean(vuln.username)
  const displayName = vuln.vuln_id || vuln.name || vuln.value

  return (
    <div className={cn(
      'rounded-md border p-3 text-xs',
      vuln.severity?.toLowerCase() === 'critical' || vuln.severity?.toLowerCase() === 'high'
        ? 'border-destructive/20 bg-destructive/5'
        : 'border-border/70 bg-background/30',
    )}>
      <div className="flex flex-wrap items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        {vuln.severity && <EasmBadge tone={tone}>{vuln.severity}</EasmBadge>}
        <span className="break-all font-mono text-sm font-medium text-foreground">{displayName}</span>
        {vuln.pocname && <EasmBadge tone="muted">{vuln.pocname}</EasmBadge>}
      </div>
      {isWeakpass && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-mono">{vuln.username}</span>
          {vuln.password && (
            <>
              <span>/</span>
              <span className="font-mono">{vuln.password}</span>
            </>
          )}
        </div>
      )}
      {hasDetail && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
            {detailsLabel}
          </summary>
          <HttpEvidenceView request={vuln.request} response={vuln.response} requestTitle={labels?.request} responseTitle={labels?.response} />
        </details>
      )}
    </div>
  )
}

export function EasmVulnList({ vulns, detailsLabel, labels }: { vulns: Vuln[]; detailsLabel?: string; labels?: Record<string, string> }) {
  return (
    <div className="space-y-2">
      {vulns.map((vuln, idx) => (
        <EasmVulnCard key={`${vuln.cstx_id}:${idx}`} vuln={vuln} detailsLabel={detailsLabel} labels={labels} />
      ))}
    </div>
  )
}
