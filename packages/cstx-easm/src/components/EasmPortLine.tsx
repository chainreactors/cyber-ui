import { ChevronRight, Globe, Server, Fingerprint } from 'lucide-react'
import type { SCOPortNode } from '../types'
import { EasmBadge } from './EasmBadge'
import { statusCodeTone } from '../lib/tones'

export function EasmPortLine({ node, expandable = false }: { node: SCOPortNode; expandable?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-start gap-2">
        {expandable ? (
          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open/service:rotate-90" />
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="w-12 shrink-0 break-words font-mono text-sm font-semibold leading-5 text-foreground">
          {node.port.port}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {node.app ? (
              <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
            ) : node.frameworks.length > 0 ? (
              <Fingerprint className="h-3.5 w-3.5 shrink-0 text-warning" />
            ) : (
              <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">{node.port.protocol}</span>
            {node.app?.midware && <EasmBadge tone="muted">{node.app.midware}</EasmBadge>}
            {node.app?.title && (
              <span className="min-w-0 break-words text-xs text-muted-foreground">{node.app.title}</span>
            )}
          </div>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {node.app?.status_code != null && node.app.status_code > 0 && (
              <EasmBadge tone={statusCodeTone(String(node.app.status_code))}>{node.app.status_code}</EasmBadge>
            )}
            {node.frameworks.map((fw) => (
              <EasmBadge key={fw.cstx_id} tone="yellow">{fw.name}</EasmBadge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
