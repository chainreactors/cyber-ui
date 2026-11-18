import { useMemo } from 'react'
import { anyUnpack } from '@bufbuild/protobuf/wkt'
import { TrafficFlowSchema, type TrafficFlow, type Event } from '@cyber/aop'

/** Project the existing observation stream without decoding old bodies on every token. */
export function createTrafficFlowReducer() {
  const flows = new Map<string, TrafficFlow>()
  const seen = new Set<string>()
  let processed = 0
  let lastEvent: Event | undefined
  let snapshot: readonly TrafficFlow[] = []
  return (events: readonly Event[]): readonly TrafficFlow[] => {
    let changed = false
    if (events.length < processed || (processed && events[processed - 1] !== lastEvent)) {
      flows.clear(); seen.clear(); processed = 0; changed = true
    }
    for (let index = processed; index < events.length; index++) {
      const event = events[index]
      const eventKey = JSON.stringify([event.sessionId, event.emitter, event.id])
      if (event.payload.case !== 'extension' || (event.id && seen.has(eventKey))) continue
      try {
        const flow = anyUnpack(event.payload.value, TrafficFlowSchema)
        if (!flow) continue
        if (event.id) seen.add(eventKey)
        flows.set(JSON.stringify([event.sessionId, event.emitter, flow.id || event.id || String(event.seq)]), flow)
        changed = true
      } catch { /* Ignore a malformed observation while keeping the stream usable. */ }
    }
    processed = events.length
    lastEvent = events[processed - 1]
    if (changed) snapshot = [...flows.values()]
    return snapshot
  }
}

export function useTrafficFlows(events: readonly Event[]): readonly TrafficFlow[] {
  const reduce = useMemo(() => createTrafficFlowReducer(), [])
  return useMemo(() => reduce(events), [events, reduce])
}
