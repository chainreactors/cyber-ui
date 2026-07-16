import { Network, Server, Globe, File, Fingerprint, AlertCircle } from 'lucide-react'
import type { SCOMetrics } from '../types'

const CELLS = [
  { key: 'ips', icon: Network, label: 'IPs' },
  { key: 'ports', icon: Server, label: 'Ports' },
  { key: 'apps', icon: Globe, label: 'Apps' },
  { key: 'urls', icon: File, label: 'URLs' },
  { key: 'frameworks', icon: Fingerprint, label: 'Frameworks' },
  { key: 'vulns', icon: AlertCircle, label: 'Vulns' },
] as const

export function EasmMetrics({ metrics, labels }: { metrics: SCOMetrics; labels?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {CELLS.map(({ key, icon: Icon, label }) => (
        <div key={key} className="rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-center">
          <Icon className="mx-auto h-4 w-4 text-muted-foreground" />
          <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {metrics[key]}
          </div>
          <div className="text-[11px] text-muted-foreground">{labels?.[key] ?? label}</div>
        </div>
      ))}
    </div>
  )
}
