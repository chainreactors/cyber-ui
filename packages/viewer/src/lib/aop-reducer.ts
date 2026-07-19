import type {
  AOPEvent,
  TextData,
  ToolCallData,
  ToolResultData,
  UsageData,
} from '@cyber/agent-protocol'
import type {
  MessageTimelineItem,
  TimelineItem,
  ToolCallTimelineItem,
} from '../types/timeline'

export interface ReduceAOPOptions {
  /** Mark the last open assistant message as streaming. */
  streaming?: boolean
}

function timestampOf(ts: string): number {
  const value = Date.parse(ts)
  return Number.isFinite(value) ? value : 0
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === undefined) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function eventId(event: AOPEvent, index: number, suffix = ''): string {
  const position = event.seq === undefined ? index : event.seq
  return `aop:${event.session_id}:${position}${suffix}`
}

function mergeUsage(
  previous: Record<string, unknown> | undefined,
  usage: UsageData,
): Record<string, unknown> {
  const current = (previous?.usage ?? {}) as Partial<UsageData>
  return {
    ...previous,
    usage: {
      input_tokens: (current.input_tokens ?? 0) + usage.input_tokens,
      output_tokens: (current.output_tokens ?? 0) + usage.output_tokens,
      total_tokens: (current.total_tokens ?? 0) + usage.total_tokens,
      cache_read_tokens: (current.cache_read_tokens ?? 0) + (usage.cache_read_tokens ?? 0),
      cache_write_tokens: (current.cache_write_tokens ?? 0) + (usage.cache_write_tokens ?? 0),
      model: usage.model ?? current.model,
    },
  }
}

/**
 * Reduce raw AOP events directly into cyber-ui timeline items.
 *
 * Input order is authoritative. Sequence numbers are used for duplicate
 * suppression, not global sorting, because several AOP sessions may be merged
 * into one platform stream.
 */
export function reduceAOPToTimeline(
  events: readonly AOPEvent[],
  options: ReduceAOPOptions = {},
): TimelineItem[] {
  const items: TimelineItem[] = []
  const seen = new Set<string>()
  const activeMessages = new Map<string, MessageTimelineItem>()
  const activeThinking = new Map<string, string>()
  const lastMessages = new Map<string, MessageTimelineItem>()
  const toolCalls = new Map<string, ToolCallTimelineItem>()

  const streamKey = (event: AOPEvent) => `${event.session_id}:${event.agent}`
  const toolKey = (event: AOPEvent, callId: string) => `${event.session_id}:${callId}`
  const closeMessage = (key: string) => {
    const message = activeMessages.get(key)
    if (message) message.streaming = false
    activeMessages.delete(key)
  }
  const closeThinking = (key: string) => {
    const id = activeThinking.get(key)
    if (!id) return
    const index = items.findIndex((item) => item.id === id)
    if (index >= 0) items.splice(index, 1)
    activeThinking.delete(key)
  }
  const openThinking = (event: AOPEvent, index: number, key: string, timestamp: number) => {
    if (activeThinking.has(key)) return
    const item: MessageTimelineItem = {
      id: eventId(event, index, ':thinking'),
      kind: 'message',
      timestamp,
      actorName: event.agent,
      role: 'thinking',
      content: '',
      streaming: true,
    }
    items.push(item)
    activeThinking.set(key, item.id)
  }

  events.forEach((event, index) => {
    if (!event.type || !event.session_id) return
    if (event.seq !== undefined) {
      const key = `${event.session_id}:${event.seq}`
      if (seen.has(key)) return
      seen.add(key)
    }

    const key = streamKey(event)
    const timestamp = timestampOf(event.ts)

    switch (event.type) {
      case 'session.start':
        closeMessage(key)
        closeThinking(key)
        items.push({
          id: eventId(event, index, ':start'),
          kind: 'divider',
          timestamp,
          actorName: event.agent,
          label: event.agent ? `${event.agent} session started` : 'Session started',
          variant: 'info',
        })
        break

      case 'session.end': {
        closeMessage(key)
        closeThinking(key)
        const data = event.data as Record<string, unknown>
        const failed = data.stop === 'error' || Boolean(data.error)
        items.push({
          id: eventId(event, index, ':end'),
          kind: 'divider',
          timestamp,
          actorName: event.agent,
          label: failed ? `Session ended: ${String(data.error ?? data.stop)}` : 'Session ended',
          variant: failed ? 'warning' : 'success',
        })
        break
      }

      case 'turn.start':
        closeMessage(key)
        openThinking(event, index, key, timestamp)
        break

      case 'turn.end':
        closeMessage(key)
        closeThinking(key)
        break

      case 'text': {
        const data = event.data as TextData
        if (!data.content) break
        closeThinking(key)
        const role = data.role === 'user' || data.role === 'system' ? data.role : 'assistant'

        if (role !== 'assistant') {
          closeMessage(key)
          const message: MessageTimelineItem = {
            id: eventId(event, index, ':text'),
            kind: 'message',
            timestamp,
            actorName: event.agent,
            role,
            content: data.content,
            streaming: false,
          }
          items.push(message)
          lastMessages.set(key, message)
          break
        }

        let message = activeMessages.get(key)
        if (!message) {
          message = {
            id: eventId(event, index, ':text'),
            kind: 'message',
            timestamp,
            actorName: event.agent,
            role: 'assistant',
            content: '',
            streaming: Boolean(data.delta),
          }
          items.push(message)
          activeMessages.set(key, message)
        }
        message.content = data.delta ? message.content + data.content : data.content
        message.streaming = Boolean(data.delta)
        lastMessages.set(key, message)
        if (!data.delta) activeMessages.delete(key)
        break
      }

      case 'tool.call': {
        closeMessage(key)
        closeThinking(key)
        const data = event.data as ToolCallData
        if (!data.tool_call_id) break
        const item: ToolCallTimelineItem = {
          id: eventId(event, index, `:tool:${data.tool_call_id}`),
          kind: 'tool_call',
          timestamp,
          actorName: event.agent,
          toolCall: {
            id: data.tool_call_id,
            toolName: data.tool_name,
            toolArgs: stringify(data.args),
            pending: true,
          },
        }
        items.push(item)
        toolCalls.set(toolKey(event, data.tool_call_id), item)
        break
      }

      case 'tool.result': {
        closeThinking(key)
        const data = event.data as ToolResultData
        if (!data.tool_call_id) break
        let item = toolCalls.get(toolKey(event, data.tool_call_id))
        if (!item) {
          item = {
            id: eventId(event, index, `:result:${data.tool_call_id}`),
            kind: 'tool_call',
            timestamp,
            actorName: event.agent,
            toolCall: {
              id: data.tool_call_id,
              toolName: data.tool_name ?? '',
              toolArgs: '',
              pending: false,
            },
          }
          items.push(item)
          toolCalls.set(toolKey(event, data.tool_call_id), item)
        }
        item.toolCall.result = stringify(data.content)
        item.toolCall.pending = false
        break
      }

      case 'usage': {
        const message = lastMessages.get(key)
        if (message) {
          message.metadata = mergeUsage(message.metadata, event.data as UsageData)
        }
        break
      }

      case 'error': {
        closeMessage(key)
        closeThinking(key)
        const data = event.data as Record<string, unknown>
        const message: MessageTimelineItem = {
          id: eventId(event, index, ':error'),
          kind: 'message',
          timestamp,
          actorName: event.agent,
          role: 'system',
          content: String(data.message ?? 'Agent error'),
          streaming: false,
          metadata: { code: data.code, retryable: data.retryable },
        }
        items.push(message)
        break
      }

      case 'status': {
        const data = event.data as Record<string, unknown>
        if (data.state === 'thinking') openThinking(event, index, key, timestamp)
        else closeThinking(key)
        break
      }
    }
  })

  if (options.streaming) {
    const last = [...items].reverse().find(
      (item): item is MessageTimelineItem => item.kind === 'message' && item.role === 'assistant',
    )
    if (last) last.streaming = true
  }

  return items
}
