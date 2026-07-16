import { AlertCircle } from 'lucide-react'
import { cn } from '@cyber/theme'
import type { Vuln } from '../types'
import { EasmBadge } from './EasmBadge'
import { severityTone } from '../lib/tones'

export function EasmVulnCard({ vuln, detailsLabel = 'Details' }: { vuln: Vuln; detailsLabel?: string }) {
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
          <div className="mt-2 max-h-96 overflow-auto rounded-md border border-border bg-background/50 p-3 text-muted-foreground">
            {vuln.request && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground/70">Request</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px]">{vuln.request}</pre>
              </div>
            )}
            {vuln.response && (
              <div className={vuln.request ? 'mt-3' : ''}>
                <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground/70">Response</div>
                <pre className="whitespace-pre-wrap font-mono text-[11px]">{vuln.response}</pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

export function EasmVulnList({ vulns, detailsLabel }: { vulns: Vuln[]; detailsLabel?: string }) {
  return (
    <div className="space-y-2">
      {vulns.map((vuln, idx) => (
        <EasmVulnCard key={`${vuln.cstx_id}:${idx}`} vuln={vuln} detailsLabel={detailsLabel} />
      ))}
    </div>
  )
}
