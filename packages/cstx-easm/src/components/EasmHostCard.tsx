import { useState } from 'react'
import { ChevronRight, Network } from 'lucide-react'
import type { SCOHostGroup } from '../types'
import { EasmBadge } from './EasmBadge'
import { EasmPortRow } from './EasmPortRow'

export function EasmHostCard({ host }: { host: SCOHostGroup }) {
  const [open, setOpen] = useState(true)

  return (
    <details
      className="group scroll-mt-24 py-3 first:pt-0 last:pb-0"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-all font-mono text-sm font-semibold text-foreground">{host.ip.ip}</span>
            {host.ip.country && <EasmBadge tone="muted">{host.ip.country}</EasmBadge>}
            {host.ip.cdn_name && <EasmBadge tone="yellow">{host.ip.cdn_name}</EasmBadge>}
          </div>
        </div>
      </summary>
      <div className="ml-6 mt-3 border-l border-border/70 pl-3">
        <div className="divide-y divide-border/60">
          {host.ports.map((node) => (
            <EasmPortRow key={node.port.cstx_id} node={node} />
          ))}
        </div>
      </div>
    </details>
  )
}

export function EasmHostList({ hosts }: { hosts: SCOHostGroup[] }) {
  return (
    <div className="divide-y divide-border/70">
      {hosts.map((host) => (
        <EasmHostCard key={host.ip.cstx_id} host={host} />
      ))}
    </div>
  )
}
