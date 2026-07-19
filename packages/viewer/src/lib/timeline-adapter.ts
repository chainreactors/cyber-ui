import type { ChatMessage } from './event-reducer'
import type {
  TimelineItem,
  MessageTimelineItem,
  ToolCallTimelineItem,
} from '../types/timeline'

function toTimestamp(ts: string): number {
  const ms = Date.parse(ts)
  return Number.isFinite(ms) ? ms : Date.now()
}

export function chatMessagesToTimeline(messages: ChatMessage[]): TimelineItem[] {
  const items: TimelineItem[] = []

  for (const msg of messages) {
    if (msg.kind === 'tool-call') {
      items.push({
        id: msg.id,
        kind: 'tool_call',
        timestamp: toTimestamp(msg.timestamp),
        actorName: msg.agentName,
        toolCall: {
          id: msg.toolCallId || msg.id,
          toolName: msg.toolName || '',
          toolArgs: msg.content,
          pending: true,
        },
      } satisfies ToolCallTimelineItem)
    } else if (msg.kind === 'tool-return') {
      let existing: ToolCallTimelineItem | undefined
      for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index]
        if (item.kind === 'tool_call' && item.toolCall.id === msg.toolCallId) {
          existing = item
          break
        }
      }
      if (existing) {
        existing.toolCall.result = msg.content
        existing.toolCall.pending = false
      } else {
        items.push({
          id: msg.id,
          kind: 'tool_call',
          timestamp: toTimestamp(msg.timestamp),
          actorName: msg.agentName,
          toolCall: {
            id: msg.toolCallId || msg.id,
            toolName: msg.toolName || '',
            toolArgs: '',
            result: msg.content,
            pending: false,
          },
        } satisfies ToolCallTimelineItem)
      }
    } else {
      items.push({
        id: msg.id,
        kind: 'message',
        timestamp: toTimestamp(msg.timestamp),
        actorName: msg.agentName,
        role: msg.kind === 'user' ? 'user' : 'assistant',
        content: msg.content,
      } satisfies MessageTimelineItem)
    }
  }

  return items
}
