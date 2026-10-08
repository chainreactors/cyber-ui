import type { SCONode, SCOResultModel } from '../types'
import type { ComponentProps } from 'react'
import { buildSCOModel } from '../lib/buildModel'
import { EasmMetrics } from './EasmMetrics'
import { EasmHostList } from './EasmHostCard'
import { EmptyState } from '@cyber/ui'

export function EasmResultView({ model, labels, anchorPrefix, linkLabel, compact = false }: {
  model: SCOResultModel
  labels?: Record<string, string>
  anchorPrefix?: string
  linkLabel?: (name: string) => string
  compact?: boolean
}) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      <EasmMetrics metrics={model.metrics} labels={labels} compact={compact} />
        <section>
          <h4 className="border-b border-border/60 pb-2 text-xs font-semibold text-foreground">
            {labels?.hosts ?? 'Hosts'}
          </h4>
          <div className="pt-1">
            {model.hosts.length > 0
              ? <EasmHostList hosts={model.hosts} labels={labels} anchorPrefix={anchorPrefix} linkLabel={linkLabel} />
              : <EmptyState compact title={labels?.noHosts ?? 'No hosts'} />}
          </div>
        </section>
    </div>
  )
}

export function EasmResultFromNodes({ nodes, duration = '', ...props }: { nodes: SCONode[]; duration?: string } & Omit<ComponentProps<typeof EasmResultView>, 'model'>) {
  const model = buildSCOModel(nodes, duration)
  return <EasmResultView model={model} {...props} />
}
