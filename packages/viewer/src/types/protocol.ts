/**
 * Wire protocol — supports both legacy APGEvent and AOP v1 formats natively.
 *
 * Legacy APGEvent: {"event_type": "TextPartEvent", "timestamp": "...", "data": {...}}
 * AOP v1:          {"v": 1, "type": "text", "ts": "...", "agent": "...", "data": {...}}
 *
 * Consumers (reducers, adapters) should check both `event_type` and `type` fields
 * to handle both formats without a normalization pass.
 */

/** Legacy APG event format (aide's Python EventRecord). */
export interface APGEvent {
  /** Legacy event class name, e.g. "TextPartEvent", "NodeStartEvent" */
  event_type: string
  session_id?: string
  timestamp: string
  data: Record<string, unknown>
}

/** AOP v1 event format (universal agent output protocol). */
export interface AOPWireEvent {
  v: number
  type: string
  ts: string
  session_id: string
  agent: string
  seq?: number
  data: Record<string, unknown>
  ext?: Record<string, Record<string, unknown>>
}

/** Either format — used as input to reducers that handle both. */
export type WireEvent = APGEvent | AOPWireEvent

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
const AOP_AGENT_TYPES = new Set([
  'session.start', 'session.end', 'text', 'tool.call', 'tool.result',
  'usage', 'turn.start', 'turn.end',
])

/** Check whether an event belongs to the "agent" category (both formats). */
export function isAgentEvent(evt: WireEvent): boolean {
  const t = eventType(evt)
  return LEGACY_AGENT_EVENTS.has(t) || AOP_AGENT_TYPES.has(t)
}
