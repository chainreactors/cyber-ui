import { useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import type { TrafficFlow } from '@cyber/aop'
import { DisclosureCard } from '@cyber/ui'
import { aopFlowToHttpView } from './adapters'
import { HttpViewPanels } from './http-view-panels'
import { getMethodColor, getStatusColor } from './traffic-detail'
import type { HttpViewPanelsProps } from './types'

export interface TrafficFlowDisplayProps {
  flow: TrafficFlow
  defaultExpanded?: boolean
  labels?: HttpViewPanelsProps['labels'] & { request?: string; response?: string; partial?: string }
}

/** The same native exchange renderer in a tool timeline or the observation panel. */
export function TrafficFlowDisplay({ flow, defaultExpanded = false, labels }: TrafficFlowDisplayProps) {
  const view = useMemo(() => aopFlowToHttpView(flow), [flow])
  return <div data-testid="traffic-observation"><DisclosureCard defaultExpanded={defaultExpanded} header={<>
    <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono ${getMethodColor(flow.request?.method || '')}`}>{flow.request?.method || 'HTTP'}</span>
    <span className="min-w-0 flex-1 truncate" title={flow.request?.url}>{flow.request?.url || flow.id}</span>
    <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono ${getStatusColor(flow.response?.statusCode || 0)}`}>{flow.response?.statusCode || '—'}</span>
  </>}>
    <div className="h-[24rem] min-w-0 border-t border-border" data-testid="traffic-detail">
      <HttpViewPanels view={view} requestTitle={labels?.request} responseTitle={labels?.response} labels={labels}
        responseHeaderExtra={!flow.complete ? <span className="text-xs text-warning">{labels?.partial || 'Incomplete capture'}</span> : undefined} />
    </div>
  </DisclosureCard></div>
}
