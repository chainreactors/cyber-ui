/**
 * Wire protocol — unified with the JSONL EventRecord format.
 *
 * Shape: {"event_type": "<ClassName>", "session_id": "...", "timestamp": "...", "data": {...}}
 */
export interface APGEvent {
  /** Event class name, e.g. "TextPartEvent", "NodeStartEvent" */
  event_type: string
  session_id?: string
  timestamp: string
  data: Record<string, unknown>
}

/** Agent event class names (event_type values that belong to the "agent" category). */
const AGENT_EVENTS = new Set([
  'ConversationTurnStartEvent',
  'ConversationTurnCompleteEvent',
  'MessageStartEvent',
  'ModelRequestEvent',
  'ModelResponseEvent',
  'ModelResponseCompleteEvent',
  'SystemPromptPartEvent',
  'UserPromptPartEvent',
  'TextPartEvent',
  'ToolCallPartEvent',
  'ToolReturnPartEvent',
])

/** Check whether an event belongs to the "agent" category. */
export function isAgentEvent(evt: APGEvent): boolean {
  return AGENT_EVENTS.has(evt.event_type)
}
