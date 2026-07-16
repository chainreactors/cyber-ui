import type { SCONode, SCOResultModel } from '../types'
import { buildSCOModel } from '../lib/buildModel'
import { EasmMetrics } from './EasmMetrics'
import { EasmHostList } from './EasmHostCard'

export function EasmResultView({ model, labels }: { model: SCOResultModel; labels?: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <EasmMetrics metrics={model.metrics} labels={labels} />
      {model.hosts.length > 0 && (
        <section>
          <h4 className="border-b border-border/60 pb-2 text-xs font-semibold text-foreground">
            {labels?.hosts ?? 'Hosts'}
          </h4>
          <div className="pt-1">
            <EasmHostList hosts={model.hosts} />
          </div>
        </section>
      )}
    </div>
  )
}

export function EasmResultFromNodes({ nodes, duration = '', labels }: { nodes: SCONode[]; duration?: string; labels?: Record<string, string> }) {
  const model = buildSCOModel(nodes, duration)
  return <EasmResultView model={model} labels={labels} />
}
