import { useMemo, type ComponentProps } from 'react'
import { anyUnpack } from '@bufbuild/protobuf/wkt'
import { DecisionAction, PtySessionSchema, type Event } from '@cyber/aop'
import { FileAccessDisplay } from '@cyber/file-manager'
import { TrafficFlowDisplay } from '@cyber/traffic'
import { CSTXArtifactDisplay } from '@cyber/cstx-easm'
import { DisclosureCard } from '@cyber/ui'
import { Activity, Box, Check, CircleX, Loader2, Shield, Terminal } from 'lucide-react'
import { observation, observationActivity, observationTitle, type ObservationKind } from '../../lib/observations'

export interface ObservationLabels {
  categories?: Partial<Record<ObservationKind, string>>
  started?: string
  completed?: string
  failed?: string
  allowed?: string
  denied?: string
  canceled?: string
  empty?: string
  related?: string
  file?: ComponentProps<typeof FileAccessDisplay>['labels']
  traffic?: ComponentProps<typeof TrafficFlowDisplay>['labels']
  cstx?: ComponentProps<typeof CSTXArtifactDisplay>['labels']
}

export interface ObservationDisplayProps {
  event: Event
  defaultExpanded?: boolean
  labels?: ObservationLabels
}

/** Render the original typed payload through its owning cyber-ui component. */
export function ObservationDisplay({ event, defaultExpanded = false, labels = {} }: ObservationDisplayProps) {
  const value = observation(event)
  if (value?.$typeName === 'aop.traffic.Flow') return <TrafficFlowDisplay flow={value} defaultExpanded={defaultExpanded} labels={labels.traffic} />
  if (value?.$typeName === 'aop.file.Access') return <FileAccessDisplay access={value} defaultExpanded={defaultExpanded} labels={labels.file} />
  if (value?.$typeName === 'aop.tool.Artifact') return <CSTXArtifactDisplay artifact={value} defaultExpanded={defaultExpanded} anchorPrefix={`observation-${event.id}`} labels={labels.cstx} />

  if (value?.$typeName === 'aop.operation.Started' || value?.$typeName === 'aop.operation.Completed') {
    const completed = value.$typeName === 'aop.operation.Completed'
    const failure = completed ? value.failure : undefined
    const elapsed = completed && value.startedAt && event.emittedAt
      ? Number(event.emittedAt.seconds - value.startedAt.seconds) * 1000 + (event.emittedAt.nanos - value.startedAt.nanos) / 1e6 : undefined
    let process
    for (const extension of event.extensions) {
      try { const info = anyUnpack(extension, PtySessionSchema); if (info) process = info } catch { /* Malformed optional process details. */ }
    }
    const Icon = value.kind === 'process' || value.kind === 'command' ? Terminal : Activity
    return <div data-testid="operation-observation"><DisclosureCard defaultExpanded={defaultExpanded} header={<>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 rounded border border-border px-1.5 py-0.5">{labels.categories?.[value.kind as ObservationKind] || value.kind}</span>
      <span className="min-w-0 flex-1 truncate" title={value.name}>{value.name}</span>
      <span className={failure ? 'text-destructive' : 'text-muted-foreground'}>{failure ? labels.failed || 'Failed' : completed ? labels.completed || 'Completed' : labels.started || 'Started'}</span>
      {failure ? <CircleX className="h-3 w-3 shrink-0 text-destructive" /> : completed ? <Check className="h-3 w-3 shrink-0 text-success" /> : <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
    </>}>
      <div className="space-y-2 border-t border-border p-3 text-xs">
        {(value.name.length > 80 || value.name.includes('\n')) && <pre className="whitespace-pre-wrap break-words">{value.name}</pre>}
        {elapsed === undefined && !process && !failure && <p className="text-muted-foreground">{event.emittedAt ? new Date(Number(event.emittedAt.seconds) * 1000).toLocaleString() : completed ? labels.completed || 'Completed' : labels.started || 'Started'}</p>}
        {elapsed !== undefined && elapsed >= 0 && <p className="text-muted-foreground">{Math.round(elapsed)} ms</p>}
        {process && <p className="font-mono text-muted-foreground">PID {process.process?.pid || process.pid} · {process.state} · exit {process.process?.exitCode ?? process.exitCode}</p>}
        {failure && <p role="alert" className="break-words text-destructive">{failure.message}</p>}
      </div>
    </DisclosureCard></div>
  }

  if (value?.$typeName === 'aop.operation.Decision') return <DisclosureCard defaultExpanded={defaultExpanded} header={<>
    <Shield className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{value.policy} · {value.point}</span>
    <span>{value.action === DecisionAction.ALLOW ? labels.allowed || 'Allowed' : value.action === DecisionAction.DENY ? labels.denied || 'Denied' : value.action === DecisionAction.CANCEL ? labels.canceled || 'Canceled' : '—'}</span>
  </>}><p role={value.failure ? 'alert' : undefined} className="border-t border-border p-3 text-xs text-destructive">{value.failure?.message || value.point}</p></DisclosureCard>

  if (value?.$typeName === 'aop.tool.Loot') return <DisclosureCard defaultExpanded={defaultExpanded} header={<>
    <Box className="h-3.5 w-3.5 shrink-0" /><span className="shrink-0">CSTX · {value.tool}</span><span className="min-w-0 flex-1 truncate">{value.target}</span><span>{value.verificationStatus || value.priority}</span>
  </>}><div className="space-y-2 border-t border-border p-3 text-xs"><p className="whitespace-pre-wrap break-words">{value.description}</p><p className="text-muted-foreground">{value.kind} · {value.tags.join(', ')}</p></div></DisclosureCard>

  if (event.payload.case !== 'extension') return null
  const payload = event.payload.value
  return <DisclosureCard defaultExpanded={defaultExpanded} header={<>
    <Activity className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate" title={payload.typeUrl}>{observationTitle(event)}</span><span className="shrink-0 text-muted-foreground">{payload.value.length} B</span>
  </>}><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all border-t border-border p-3 text-xs">{Array.from(payload.value.subarray(0, 256), byte => byte.toString(16).padStart(2, '0')).join(' ') || labels.empty || 'No payload'}</pre></DisclosureCard>
}

/** Coalesce operation lifecycle phases without changing or copying their payloads. */
export function ObservationList({ events, labels, toolName }: { events: readonly Event[]; labels?: ObservationLabels; toolName?: string }) {
  const records = useMemo(() => observationActivity(events, toolName), [events, toolName])
  return <div className="space-y-2" data-testid="tool-observations">{records.map((event, index) => <ObservationDisplay key={event.id || index} event={event} labels={labels} />)}</div>
}
