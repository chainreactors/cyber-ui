/**
 * Wire protocol for AIDE platform events. AOP events are generated protobuf
 * Event values and are handled separately by the AOP reducer.
 */

/** AIDE platform event format (Python EventRecord). */
export interface APGEvent {
  /** Legacy event class name, e.g. "TextPartEvent", "NodeStartEvent" */
  event_type: string
  session_id?: string
  timestamp: string
  data: Record<string, unknown>
}

export type WireEvent = APGEvent

/** Detect the wire format of a raw event object. */
export function eventType(evt: WireEvent): string {
  return evt.event_type
}

/** Extract timestamp from either format. */
export function eventTimestamp(evt: WireEvent): string {
  return evt.timestamp
}

/** Extract agent/actor name from either format. */
export function eventAgent(evt: WireEvent): string {
  const d = evt.data
  if (typeof d?.agent_name === 'string') return d.agent_name
  return ''
}

const PLATFORM_AGENT_EVENTS = new Set([
  'ConversationTurnStartEvent', 'ConversationTurnCompleteEvent',
  'MessageStartEvent', 'ModelRequestEvent', 'ModelResponseEvent',
  'ModelResponseCompleteEvent', 'SystemPromptPartEvent', 'UserPromptPartEvent',
  'TextPartEvent', 'ToolCallPartEvent', 'ToolReturnPartEvent',
])
/** Check whether a legacy platform event belongs to the agent category. */
export function isAgentEvent(evt: WireEvent): boolean {
  const t = eventType(evt)
  return PLATFORM_AGENT_EVENTS.has(t)
}
