/**
 * Wire protocol for platform events and canonical AOP events.
 *
 * Legacy APGEvent: {"event_type": "TextPartEvent", "timestamp": "...", "data": {...}}
 * AOP:             {"type": "text", "ts": "...", "agent": "...", "data": {...}}
 *
 * Agent output is reduced only by the AOP reducer. Platform reducers may inspect
 * both event shapes where AOP usage accounting is relevant to a graph.
 */

import type { AOPEvent } from '@cyber/agent-protocol'

/** Legacy APG event format (aide's Python EventRecord). */
export interface APGEvent {
  /** Legacy event class name, e.g. "TextPartEvent", "NodeStartEvent" */
  event_type: string
  session_id?: string
  timestamp: string
  data: Record<string, unknown>
}

/** Either format — used as input to reducers that handle both. */
export type WireEvent = APGEvent | AOPEvent<Record<string, unknown>>

/** Detect the wire format of a raw event object. */
export function eventType(evt: WireEvent): string {
  if ('event_type' in evt && typeof evt.event_type === 'string') return evt.event_type
  if ('type' in evt && typeof evt.type === 'string') return evt.type as string
  return ''
}

/** Extract timestamp from either format. */
export function eventTimestamp(evt: WireEvent): string {
  if ('timestamp' in evt && typeof evt.timestamp === 'string') return evt.timestamp
  if ('ts' in evt && typeof evt.ts === 'string') return evt.ts as string
  return new Date().toISOString()
}

/** Extract agent/actor name from either format. */
export function eventAgent(evt: WireEvent): string {
  const d = evt.data
  if (typeof d?.agent_name === 'string') return d.agent_name
  if ('agent' in evt && typeof evt.agent === 'string') return evt.agent as string
  return ''
}

/** Agent event types in both formats. */
const LEGACY_AGENT_EVENTS = new Set([
  'ConversationTurnStartEvent', 'ConversationTurnCompleteEvent',
  'MessageStartEvent', 'ModelRequestEvent', 'ModelResponseEvent',
  'ModelResponseCompleteEvent', 'SystemPromptPartEvent', 'UserPromptPartEvent',
  'TextPartEvent', 'ToolCallPartEvent', 'ToolReturnPartEvent',
])
/** Check whether a legacy platform event belongs to the agent category. */
export function isAgentEvent(evt: WireEvent): boolean {
  const t = eventType(evt)
  return LEGACY_AGENT_EVENTS.has(t)
}
