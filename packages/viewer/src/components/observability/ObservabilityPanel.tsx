import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Event } from '@cyber/aop'
import { Activity, ArrowLeft, ArrowLeftRight, Box, Camera, Check, CircleX, Copy, Cpu, FileText, Loader2, Search, Terminal, Wrench, X } from 'lucide-react'
import { Button, EmptyState, Tabs, TabsContent, TabsList, TabsTrigger } from '@cyber/ui'
import { cn } from '@cyber/theme'
import { createAOPTimelineReducer } from '../../lib/aop-reducer'
import { observation, observationActivity, observationKind, observationRef, observationTitle, type ObservationKind } from '../../lib/observations'
import { useObservations } from '../../lib/use-observations'
import { summarizeArgs } from '../../lib/tool-utils'
import type { ToolCallEntry } from '../../types/timeline'
import { ToolResultDisplay, type ToolResultDisplayProps } from '../chat/ToolResultDisplay'
import { ObservationDisplay, type ObservationLabels } from './ObservationDisplay'

const categories: ObservationKind[] = ['tool', 'traffic', 'file', 'record', 'cstx', 'command', 'process', 'other']
const icons = { tool: Wrench, traffic: ArrowLeftRight, file: FileText, record: Camera, cstx: Box, command: Terminal, process: Cpu, other: Activity }
const defaults = {
  all: 'All', search: 'Search observations', empty: 'No observations in this session',
  emptyHint: 'Tool results and captured data will appear here.', filteredEmpty: 'No matching observations', clearFilters: 'Clear filters',
  session: 'Session activity', assets: 'Asset library', activity: 'Activity', events: 'Raw events', metadata: 'Metadata', back: 'Back to observations', copy: 'Copy event ID', copied: 'Copied', newItems: '{{count}} new items', jumpToLatest: 'Jump to latest',
  categories: { tool: 'Tools', traffic: 'Traffic', file: 'Files', record: 'Recordings', cstx: 'CSTX', command: 'Commands', process: 'Processes', other: 'Other' },
}
type ToolPresentation = Pick<ToolResultDisplayProps, 'resolveMedia' | 'labels' | 'mediaLabels' | 'recordLabels'>
export interface ObservabilityPanelProps {
  events: readonly Event[]
  labels?: ObservationLabels & Partial<Omit<typeof defaults, 'categories'>>
  toolProps?: ToolPresentation
  assets?: ReactNode
  assetCount?: number
  className?: string
}

const callKey = (session: string, emitter: string, turn: string, call: string) => JSON.stringify([session, emitter, turn, call])
const time = (event: Event) => event.emittedAt ? new Date(Number(event.emittedAt.seconds) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch { /* Try the selection fallback below. */ }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try { return document.execCommand('copy') } catch { return false } finally { textarea.remove() }
}

/** Native records, concise activity, and an optional existing asset library. */
export function ObservabilityPanel({ events, labels, toolProps, assets, assetCount = 0, className }: ObservabilityPanelProps) {
  const l = { ...defaults, ...labels, categories: { ...defaults.categories, ...labels?.categories } }
  const records = useObservations(events)
  const activities = useMemo(() => observationActivity(records), [records])
  const [page, setPage] = useState('session')
  const [view, setView] = useState<'activity' | 'events'>('activity')
  const [category, setCategory] = useState<ObservationKind | 'all'>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Event>()
  const [detailOpen, setDetailOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [wide, setWide] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const previousSourceLength = useRef(0)
  const initializedSource = useRef(false)
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= 720))
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])
  const source = view === 'events' ? records : activities
  const reduce = useMemo(() => createAOPTimelineReducer({ lifecycle: 'none' }), [])
  const tools = useMemo(() => {
    const calls = new Map<string, ToolCallEntry>()
    for (const item of reduce(events)) {
      if (item.kind === 'assistant_response') for (const tool of item.tools) calls.set(callKey(item.sessionId || '', item.actorName || '', item.turnId || '', tool.id), tool)
    }
    return calls
  }, [events, reduce])
  const eventTool = (event: Event) => event.payload.case === 'toolCall' || event.payload.case === 'toolResult'
    ? tools.get(callKey(event.sessionId, event.emitter, event.turnId, event.payload.case === 'toolCall' ? event.payload.value.id : event.payload.value.callId)) : undefined
  const counts = useMemo(() => {
    const result = new Map<ObservationKind, number>()
    for (const event of source) { const kind = observationKind(event)!; result.set(kind, (result.get(kind) || 0) + 1) }
    return result
  }, [source])
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return source.filter(event => {
      if (category !== 'all' && observationKind(event) !== category) return false
      if (!needle) return true
      const ref = observationRef(event), value = observation(event)
      const call = event.payload.case === 'toolCall' ? event.payload.value.id : event.payload.case === 'toolResult' ? event.payload.value.callId : undefined
      const error = value?.$typeName === 'aop.operation.Completed' ? value.failure?.message : value && 'error' in value ? value.error : undefined
      const args = eventTool(event)?.toolArgs
      return [observationTitle(event), event.emitter, call, ref?.callId, ref?.operationId, error, args ? JSON.stringify(args) : undefined].some(value => value?.toLocaleLowerCase().includes(needle))
    }).slice().reverse()
  }, [source, category, query, tools])
  const active = selected && visible.includes(selected) ? selected : visible[0]
  const clearFilters = () => { setQuery(''); setCategory('all'); setDetailOpen(false) }
  const copyEventID = async () => {
    if (!active?.id) return
    try {
      if (await copyText(active.id)) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    } catch { /* Clipboard permissions are optional; the ID remains visible in metadata. */ }
  }

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement)?.tagName || '')) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape' && detailOpen) {
        event.preventDefault()
        event.stopPropagation()
        setDetailOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [detailOpen])

  useEffect(() => {
    const previous = previousSourceLength.current
    previousSourceLength.current = source.length
    if (!initializedSource.current) { initializedSource.current = true; return }
    if (source.length <= previous) return
    const list = listRef.current
    if (!list || list.scrollTop <= 24) {
      list?.scrollTo({ top: 0, behavior: 'smooth' })
      setNewCount(0)
    } else {
      setNewCount(count => count + source.length - previous)
    }
  }, [source.length])

  const selectAt = (index: number, open = false) => {
    const event = visible[index]
    if (!event) return
    setSelected(event)
    if (open) setDetailOpen(true)
  }
  useEffect(() => {
    previousSourceLength.current = source.length
    setNewCount(0)
  }, [view, category, query])

  const handleRowKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1)
    if (next >= 0 && next < visible.length) {
      selectAt(next)
      requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus())
    }
  }
  return <Tabs ref={panelRef} value={page} onValueChange={setPage} className={cn('flex h-full min-h-0 flex-col', className)} data-testid="observability-panel">
    {assets && <div className="shrink-0 border-b border-border px-4">
      <TabsList className="h-11 gap-4 rounded-none bg-transparent p-0">
        <TabsTrigger value="session" className="h-full gap-2 rounded-none border-b-2 border-transparent px-0 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Activity className="h-3.5 w-3.5" />{l.session}<span className="font-mono text-xs text-muted-foreground">{activities.length}</span></TabsTrigger>
        <TabsTrigger value="assets" className="h-full gap-2 rounded-none border-b-2 border-transparent px-0 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Box className="h-3.5 w-3.5" />{l.assets}<span className="font-mono text-xs text-muted-foreground">{assetCount}</span></TabsTrigger>
      </TabsList>
    </div>}
    <TabsContent value="session" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
      <div className={cn('shrink-0 border-b border-border bg-muted/10', detailOpen && !wide && 'hidden')}>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-2 pt-3">
          <div className="relative min-w-[8rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={`${l.search} (/)`} aria-label={l.search}
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-8 text-xs outline-none focus:border-primary" />
            {query && <button type="button" onClick={() => setQuery('')} aria-label={l.clearFilters} title={l.clearFilters}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="flex rounded-md bg-muted p-0.5" role="group" aria-label={l.events}>
            {(['activity', 'events'] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} data-observation-view={mode} onClick={() => setView(mode)}
              className={cn('rounded px-2 py-1 text-xs transition-colors', view === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{mode === 'activity' ? l.activity : l.events}</button>)}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto" role="group" aria-label={l.all}>
            {(['all', ...categories] as const).filter(kind => kind === 'all' || counts.has(kind) || category === kind).map(kind =>
              <button key={kind} type="button" aria-pressed={category === kind} onClick={() => setCategory(kind)} data-observation-kind={kind}
                className={cn('shrink-0 rounded-md px-2 py-1 text-xs transition-colors', category === kind ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted')}>
                {kind === 'all' ? l.all : l.categories[kind]} <span className="ml-1 font-mono text-xs opacity-70">{kind === 'all' ? source.length : counts.get(kind) || 0}</span>
              </button>,
            )}
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground" data-testid="observation-count">{visible.length} / {source.length}</span>
        </div>
      </div>
      <div className={cn('min-h-0 flex-1', wide && 'grid grid-cols-[minmax(14rem,30%)_minmax(0,1fr)]')}>
        <div className={cn('relative h-full min-h-0 overflow-hidden border-border bg-muted/10', wide && 'border-r', detailOpen && !wide && 'hidden')}>
          {newCount > 0 && <button type="button" onClick={() => { listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); setNewCount(0) }} className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-medium text-primary shadow-sm transition hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={l.jumpToLatest}>
            {l.newItems.replace('{{count}}', String(newCount))}
          </button>}
        <ul ref={listRef} onScroll={() => { if (listRef.current && listRef.current.scrollTop <= 24) setNewCount(0) }} className="h-full min-h-0 overflow-auto overscroll-contain" data-testid="observation-list">
          {visible.map((event, index) => {
            const kind = observationKind(event)!, Icon = icons[kind], entry = eventTool(event), value = observation(event)
            const rawCall = view === 'events' && event.payload.case === 'toolCall'
            const failed = !rawCall && entry?.error || (value?.$typeName === 'aop.operation.Completed' && value.failure) || (value && 'error' in value && value.error)
            const pending = rawCall || entry?.pending || value?.$typeName === 'aop.operation.Started'
            return <li key={JSON.stringify([event.sessionId, event.emitter, event.id || index])}>
              <button type="button" aria-pressed={event === active} onKeyDown={event => handleRowKeyDown(event, index)} onClick={() => { setSelected(event); setDetailOpen(true) }} className={cn('group flex w-full min-w-0 gap-2.5 border-b border-border/40 border-l-2 border-l-transparent px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary', event === active && 'border-l-primary bg-primary/5')}>
                <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground', failed && 'border-destructive/20 text-destructive')}><Icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{l.categories[kind]}</span><span>{time(event)}</span></span>
                  <span className="block truncate text-xs font-medium" title={observationTitle(event)}>{observationTitle(event)}</span>
                  {entry?.toolArgs && <span className="block truncate font-mono text-xs text-muted-foreground" title={summarizeArgs(entry.toolArgs)}>{summarizeArgs(entry.toolArgs)}</span>}
                </span>
                {failed ? <CircleX className="mt-1 h-3 w-3 shrink-0 text-destructive" aria-label={l.failed || 'Failed'} /> : pending ? <Loader2 className="mt-1 h-3 w-3 shrink-0 animate-spin text-warning" /> : entry ? <Check className="mt-1 h-3 w-3 shrink-0 text-success" /> : null}
              </button>
            </li>
          })}
          {!visible.length && <li className="flex h-full flex-col items-center justify-center gap-3 p-6">
            <EmptyState compact icon={Activity} title={source.length ? l.filteredEmpty : l.empty} description={!source.length ? l.emptyHint : undefined} />
            {source.length > 0 && <Button variant="outline" size="xs" onClick={clearFilters}>{l.clearFilters}</Button>}
          </li>}
        </ul>
        </div>
        <div className={cn('h-full min-h-0 min-w-0 overflow-auto bg-background', !detailOpen && !wide && 'hidden')} data-testid="observation-detail">
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-3 py-2"><Button variant="ghost" size="icon-xs" className={wide ? 'hidden' : undefined} onClick={() => setDetailOpen(false)} aria-label={l.back}><ArrowLeft className="h-3.5 w-3.5" /></Button><span className="min-w-0 flex-1 truncate text-xs">{active ? observationTitle(active) : l.empty}</span>{active?.id && <Button variant="ghost" size="icon-xs" onClick={copyEventID} aria-label={copied ? l.copied : l.copy} title={copied ? l.copied : l.copy}><Copy className="h-3.5 w-3.5" /></Button>}</div>
          {active ? <div key={JSON.stringify([active.sessionId, active.emitter, active.id])} className="space-y-3 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate" title={active.emitter}>{active.emitter}</span><time>{time(active)}</time></div>
            {eventTool(active) ? <ToolResultDisplay {...eventTool(active)!}
              {...(view === 'events' && active.payload.case === 'toolCall' ? { pending: true, error: undefined, toolResult: undefined, result: undefined, resultEventId: undefined, observations: undefined } : {})}
              {...toolProps} observationLabels={l} defaultExpanded /> : <ObservationDisplay event={active} labels={l} defaultExpanded />}
            <div className="sr-only" aria-live="polite">{copied ? l.copied : ''}</div><details className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground"><summary className="cursor-pointer">{l.metadata}</summary><dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 font-mono">
              {[['event', active.id], ['session', active.sessionId], ['turn', active.turnId], ['call', active.payload.case === 'toolCall' ? active.payload.value.id : active.payload.case === 'toolResult' ? active.payload.value.callId : observationRef(active)?.callId], ['operation', observationRef(active)?.operationId], ['seq', String(active.seq)]].filter(([, value]) => value).map(([key, value]) => <div key={key} className="contents"><dt>{key}</dt><dd className="break-all">{value}</dd></div>)}
            </dl></details>
          </div> : <div className="flex h-full items-center justify-center p-6"><EmptyState compact icon={Activity} title={l.empty} /></div>}
        </div>
      </div>
    </TabsContent>
    {assets && <TabsContent value="assets" className="mt-0 min-h-0 flex-1 data-[state=inactive]:hidden">{assets}</TabsContent>}
  </Tabs>
}
