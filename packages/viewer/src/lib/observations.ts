import { anyUnpack } from '@bufbuild/protobuf/wkt'
import {
  ArtifactSchema, CompletedSchema, Correlation, DecisionSchema, FileAccessSchema, LootSchema,
  RefSchema, StartedSchema, TrafficFlowSchema, type Event,
} from '@cyber/aop'

const schemas = [TrafficFlowSchema, FileAccessSchema, ArtifactSchema, LootSchema, StartedSchema, CompletedSchema, DecisionSchema] as const
type Observation = ReturnType<typeof decode>
export type ObservationKind = 'traffic' | 'file' | 'tool' | 'record' | 'cstx' | 'command' | 'process' | 'other'
const decoded = new WeakMap<Event, Observation>()

function decode(event: Event) {
  if (event.payload.case !== 'extension') return undefined
  try {
    for (const schema of schemas) {
      // Narrow the schema independently so this remains a union of native messages.
      const value = anyUnpack(event.payload.value, schema)
      if (value) return value
    }
  } catch { /* A malformed observation must not break a healthy conversation. */ }
}

export function observation(event: Event): Observation {
  if (!decoded.has(event)) decoded.set(event, decode(event))
  return decoded.get(event)
}

export function observationRef(event: Event) {
  for (const extension of event.extensions) {
    try { const ref = anyUnpack(extension, RefSchema); if (ref) return ref } catch { /* Invalid sidecar. */ }
  }
}

export function observationKind(event: Event): ObservationKind | undefined {
  if (event.payload.case === 'toolCall' || event.payload.case === 'toolResult') {
    if (event.payload.value.name === 'record') return 'record'
    if (event.payload.case === 'toolResult' && event.payload.value.output.some(part => part.value.case === 'media' && part.value.value.kind === 'file')) return 'file'
    return 'tool'
  }
  const value = observation(event)
  switch (value?.$typeName) {
    case 'aop.traffic.Flow': return 'traffic'
    case 'aop.file.Access': return 'file'
    case 'aop.tool.Artifact': case 'aop.tool.Loot': return 'cstx'
    case 'aop.operation.Started': case 'aop.operation.Completed':
      return value.kind === 'command' ? 'command' : value.kind === 'process' ? 'process' : value.kind === 'tool' ? 'tool' : 'other'
    case 'aop.operation.Decision': return 'other'
    default: return event.payload.case === 'extension' ? 'other' : undefined
  }
}

export function observationTitle(event: Event): string {
  if (event.payload.case === 'toolCall' || event.payload.case === 'toolResult') return event.payload.value.name
  const value = observation(event)
  switch (value?.$typeName) {
    case 'aop.traffic.Flow': return `${value.request?.method || ''} ${value.request?.url || value.id} ${value.response?.statusCode || ''}`.trim()
    case 'aop.file.Access': return value.path
    case 'aop.tool.Artifact': case 'aop.tool.Loot': return `${value.tool} ${value.kind} ${value.target}`.trim()
    case 'aop.operation.Started': case 'aop.operation.Completed': return value.name
    case 'aop.operation.Decision': return `${value.policy} ${value.point}`.trim()
    default: return event.payload.case === 'extension' ? event.payload.value.typeUrl.split('/').pop() || '' : ''
  }
}

/** A concise activity view over original events; the audit stream stays intact. */
export function observationActivity(events: readonly Event[], toolName?: string): readonly Event[] {
  const scope = (event: Event, id: string) => JSON.stringify([event.sessionId, event.emitter, event.turnId, id])
  const calls = new Map<string, string>()
  for (const event of events) {
    if (event.payload.case === 'toolCall') calls.set(scope(event, event.payload.value.id), event.payload.value.name)
    if (event.payload.case === 'toolResult' && event.payload.value.name) calls.set(scope(event, event.payload.value.callId), event.payload.value.name)
  }
  const activities = new Map<string, Event>()
  for (const event of events) {
    const value = observation(event), ref = observationRef(event)
    const lifecycle = value?.$typeName === 'aop.operation.Started' || value?.$typeName === 'aop.operation.Completed'
    if (lifecycle && value.kind === 'tool' && !(value.$typeName === 'aop.operation.Completed' && value.failure)
      && ref?.correlation === Correlation.EXPLICIT
      && (value.name === toolName || (ref.callId && calls.get(scope(event, ref.callId)) === value.name))) continue
    const callID = event.payload.case === 'toolCall' ? event.payload.value.id : event.payload.case === 'toolResult' ? event.payload.value.callId : undefined
    const key = callID ? `call:${scope(event, callID)}` : lifecycle && ref?.operationId ? `operation:${scope(event, ref.operationId)}` : `event:${scope(event, event.id || String(event.seq))}`
    const previous = activities.get(key)
    if ((event.payload.case === 'toolCall' && previous?.payload.case === 'toolResult')
      || (value?.$typeName === 'aop.operation.Started' && previous && observation(previous)?.$typeName === 'aop.operation.Completed')) continue
    activities.delete(key)
    activities.set(key, event)
  }
  return [...activities.values()]
}

/** A projection of original events, never another observation wire model. */
export function createObservationReducer() {
  const seen = new Set<string>()
  let records: Event[] = [], processed = 0, lastEvent: Event | undefined
  return (events: readonly Event[]): readonly Event[] => {
    if (events.length < processed || (processed && events[processed - 1] !== lastEvent)) {
      seen.clear(); records = []; processed = 0
    }
    let next: Event[] | undefined
    for (let index = processed; index < events.length; index++) {
      const event = events[index]
      if (!observationKind(event)) continue
      const key = JSON.stringify([event.sessionId, event.emitter, event.id || String(event.seq || BigInt(index + 1))])
      if (seen.has(key)) continue
      seen.add(key)
      ;(next ||= [...records]).push(event)
    }
    processed = events.length
    lastEvent = events[processed - 1]
    return records = next || records
  }
}
