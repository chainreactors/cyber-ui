import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@cyber/theme'
import type { TrafficFlow } from '@cyber/aop'
import { aopFlowToHttpView } from './adapters'
import { HttpViewPanels } from './http-view-panels'
import { getMethodColor, getStatusColor } from './traffic-detail'

const defaults = {
  search: 'Search URL, method or status', empty: 'No captured traffic in this session',
  request: 'Request', response: 'Response', partial: 'Incomplete capture',
  loadFailed: 'Failed to load', requestError: 'Request error', noResponse: 'No response', emptyBody: '(Empty body)',
}

export interface TrafficPanelProps {
  flows: readonly TrafficFlow[]
  labels?: Partial<typeof defaults>
  className?: string
}

/** A captured-flow browser backed directly by the canonical traffic protobuf. */
export function TrafficPanel({ flows, labels, className }: TrafficPanelProps) {
  const l = { ...defaults, ...labels }
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number>()
  const indices = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return flows.flatMap((flow, index) => !needle || [flow.request?.method, flow.request?.url, flow.response?.statusCode, flow.error]
      .some(value => String(value || '').toLocaleLowerCase().includes(needle)) ? [index] : []).reverse()
  }, [flows, query])
  const activeIndex = selectedIndex !== undefined && indices.includes(selectedIndex) ? selectedIndex : indices[0]
  const flow = activeIndex === undefined ? undefined : flows[activeIndex]
  const view = useMemo(() => flow ? aopFlowToHttpView(flow) : null, [flow])
  return <div className={cn('flex h-full min-h-0 flex-col', className)} data-testid="traffic-panel">
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={l.search} aria-label={l.search}
          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs outline-none focus:border-primary" />
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground" data-testid="traffic-count">{indices.length} / {flows.length}</span>
    </div>
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(8rem,35%)_minmax(0,1fr)] lg:grid-cols-[minmax(16rem,32%)_minmax(0,1fr)] lg:grid-rows-1">
      <ul className="min-h-0 overflow-auto border-b border-border lg:border-b-0 lg:border-r" data-testid="traffic-list">
        {indices.map(index => {
          const entry = flows[index]
          const status = entry.response?.statusCode || 0
          return <li key={index}>
            <button type="button" aria-pressed={index === activeIndex} onClick={() => setSelectedIndex(index)}
              className={cn('flex w-full min-w-0 items-start gap-2 border-b border-border/50 px-3 py-2 text-left text-xs hover:bg-muted/40', index === activeIndex && 'bg-primary/10')}>
              <span className={cn('shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]', getMethodColor(entry.request?.method || ''))}>{entry.request?.method || '—'}</span>
              <span className="min-w-0 flex-1 break-all" title={entry.request?.url}>{entry.request?.url || entry.id}</span>
              <span className={cn('shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]', getStatusColor(status))}>{status || '—'}</span>
            </button>
          </li>
        })}
        {!indices.length && <li className="p-4 text-center text-xs text-muted-foreground">{l.empty}</li>}
      </ul>
      <div className="min-h-0 min-w-0" data-testid="traffic-detail">
        <HttpViewPanels view={view} emptyText={l.empty} requestTitle={l.request} responseTitle={l.response} labels={l}
          responseHeaderExtra={flow && !flow.complete ? <span className="text-xs text-warning">{l.partial}</span> : undefined} />
      </div>
    </div>
  </div>
}
