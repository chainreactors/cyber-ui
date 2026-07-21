import type {
  AOPEvent,
  MessageData,
  MessageDeltaData,
  MessagePart,
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
  return `aop:${event.session_id}:${event.agent}:${position}${suffix}`
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

/** Join the text of all parts of one type (text or reasoning). */
function partText(parts: MessagePart[], type: string): string {
  return parts
    .filter((part) => part.type === type && part.text)
    .map((part) => part.text as string)
    .join('\n')
}

/** Render image parts as markdown: base64 becomes a data URI, a path a link. */
function partImagesMarkdown(parts: MessagePart[]): string {
  const blocks: string[] = []
  for (const part of parts) {
    if (part.type !== 'image' || !part.image) continue
    if (part.image.base64 && part.image.media_type) {
      blocks.push(`![image](data:${part.image.media_type};base64,${part.image.base64})`)
    } else if (part.image.path) {
      blocks.push(`[image: ${part.image.path}]`)
    }
  }
  return blocks.join('\n')
}

/** First ext namespace value — the emitting agent's extension block. */
function extBlock(event: AOPEvent): Record<string, unknown> {
  if (!event.ext) return {}
  for (const value of Object.values(event.ext)) {
    if (value && typeof value === 'object') return value as Record<string, unknown>
  }
  return {}
}

function extNumber(ext: Record<string, unknown>, key: string): number | undefined {
  const value = ext[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// Message metadata = the emitting agent's ext `metadata` sub-object flattened to
// the top level (so consumers find e.g. an i18n `code` where the pre-AOP message
// model put it), with the raw ext kept under `ext` for namespace-specific reads.
function messageMetadata(event: AOPEvent): Record<string, unknown> | undefined {
  const ext = extBlock(event)
  const inner = ext.metadata
  const flattened: Record<string, unknown> =
    inner && typeof inner === 'object' ? { ...(inner as Record<string, unknown>) } : {}
  if (event.ext) flattened.ext = event.ext
  return Object.keys(flattened).length > 0 ? flattened : undefined
}

/**
 * Reduce raw AOP events directly into cyber-ui timeline items.
 *
 * Input order is authoritative. Sequence numbers are used for duplicate
 * suppression, not global sorting, because several AOP sessions may be merged
 * into one platform stream. Assistant streaming arrives as `message.delta`
 * fragments keyed by message_id; the complete `message` event is the
 * authoritative state and replaces whatever the deltas accumulated.
 */
export function reduceAOPToTimeline(
  events: readonly AOPEvent[],
  options: ReduceAOPOptions = {},
): TimelineItem[] {
  const items: TimelineItem[] = []
  const seen = new Set<string>()
  // Accumulators keyed by `${streamKey}:${message_id}`.
  const activeMessages = new Map<string, MessageTimelineItem>()
  const activeThinking = new Map<string, MessageTimelineItem>()
  const lastMessages = new Map<string, MessageTimelineItem>()
  const toolCalls = new Map<string, ToolCallTimelineItem>()

  const streamKey = (event: AOPEvent) => `${event.session_id}:${event.agent}`
  const toolKey = (event: AOPEvent, callId: string) => `${event.session_id}:${event.agent}:${callId}`

  const closeWhere = (map: Map<string, MessageTimelineItem>, prefix: string) => {
    for (const [mkey, message] of map) {
      if (!mkey.startsWith(prefix)) continue
      if (map === activeThinking && !message.content) {
        const index = items.findIndex((item) => item.id === message.id)
        if (index >= 0) items.splice(index, 1)
      } else {
        message.streaming = false
      }
      map.delete(mkey)
    }
  }
  const closeMessage = (key: string) => closeWhere(activeMessages, key)
  const closeThinking = (key: string) => closeWhere(activeThinking, key)

  const openThinking = (event: AOPEvent, index: number, key: string, timestamp: number) => {
    if ([...activeThinking.keys()].some((mkey) => mkey.startsWith(key))) return
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
    activeThinking.set(key, item)
  }

  // Upsert a message item with a stable, message_id-derived id so a complete
  // `message` event replaces its own delta-built entry (and replays are
  // idempotent) instead of appending a duplicate bubble.
  const upsertMessage = (
    map: Map<string, MessageTimelineItem>,
    mkey: string,
    id: string,
    event: AOPEvent,
    timestamp: number,
    role: MessageTimelineItem['role'],
  ): MessageTimelineItem => {
    const existing = map.get(mkey) ?? items.find((item): item is MessageTimelineItem => item.id === id && item.kind === 'message')
    if (existing) {
      existing.streaming = false
      return existing
    }
    const item: MessageTimelineItem = {
      id,
      kind: 'message',
      timestamp,
      actorName: event.agent,
      role,
      content: '',
      streaming: false,
      metadata: messageMetadata(event),
    }
    items.push(item)
    return item
  }

  events.forEach((event, index) => {
    if (!event.type || !event.session_id) return
    if (event.seq !== undefined) {
      const key = `${event.session_id}:${event.agent}:${event.seq}`
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

      case 'message.delta': {
        const data = event.data as MessageDeltaData
        if (!data.message_id || !data.delta) break
        const mkey = `${key}:${data.message_id}`

        if (data.part_type === 'reasoning') {
          closeMessage(key)
          let message = activeThinking.get(mkey)
          if (!message) {
            closeThinking(key)
            message = {
              id: `aop:${event.session_id}:${event.agent}:thinking:${data.message_id}`,
              kind: 'message',
              timestamp,
              actorName: event.agent,
              role: 'thinking',
              content: '',
              streaming: true,
              metadata: messageMetadata(event),
            }
            items.push(message)
            activeThinking.set(mkey, message)
          }
          message.content += data.delta
          break
        }

        closeThinking(key)
        let message = activeMessages.get(mkey)
        if (!message) {
          message = {
            id: `aop:${event.session_id}:${event.agent}:msg:${data.message_id}`,
            kind: 'message',
            timestamp,
            actorName: event.agent,
            role: 'assistant',
            content: '',
            streaming: true,
            metadata: messageMetadata(event),
          }
          items.push(message)
          activeMessages.set(mkey, message)
        }
        message.content += data.delta
        lastMessages.set(key, message)
        break
      }

      case 'message': {
        const data = event.data as MessageData
        if (!data.message_id) break
        const mkey = `${key}:${data.message_id}`
        const role = data.role === 'user' || data.role === 'system' ? data.role : 'assistant'
        const text = partText(data.parts, 'text')
        const reasoning = partText(data.parts, 'reasoning')
        const images = partImagesMarkdown(data.parts)
        const content = [text, images].filter(Boolean).join('\n')

        if (reasoning) {
          const thinking = upsertMessage(
            activeThinking,
            mkey,
            `aop:${event.session_id}:${event.agent}:thinking:${data.message_id}`,
            event,
            timestamp,
            'thinking',
          )
          thinking.content = reasoning
          activeThinking.delete(mkey)
        }

        if (role === 'assistant' && !content && !reasoning) break
        if (role === 'assistant') closeThinking(key)
        else closeMessage(key)

        if (!content) break
        const message = upsertMessage(
          activeMessages,
          mkey,
          `aop:${event.session_id}:${event.agent}:msg:${data.message_id}`,
          event,
          timestamp,
          role,
        )
        message.role = role
        message.content = content
        activeMessages.delete(mkey)
        lastMessages.set(key, message)
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
        const data = event.data as { state?: string }
        const ext = extBlock(event)
        switch (data.state) {
          case 'thinking':
            openThinking(event, index, key, timestamp)
            break
          case 'eval_end':
            items.push({
              id: eventId(event, index, ':eval'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'eval',
              data: {
                round: extNumber(ext, 'eval_round'),
                pass: ext.eval_pass === true,
                reason: typeof ext.eval_reason === 'string' ? ext.eval_reason : undefined,
              },
            })
            break
          case 'eval_error':
            items.push({
              id: eventId(event, index, ':eval'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'eval',
              data: {
                round: extNumber(ext, 'eval_round'),
                pass: false,
                reason: typeof ext.eval_error === 'string' ? ext.eval_error : undefined,
              },
            })
            break
          case 'compact_end':
            items.push({
              id: eventId(event, index, ':compact'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'compact',
              data: {
                tokens_before: extNumber(ext, 'compact_tokens_before'),
                tokens_after: extNumber(ext, 'compact_tokens_after'),
                kept_messages: extNumber(ext, 'compact_kept_messages'),
              },
            })
            break
          case 'token_budget_warning':
            items.push({
              id: eventId(event, index, ':budget'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'token_budget',
              data: {
                context_tokens: extNumber(ext, 'context_tokens'),
                token_budget: extNumber(ext, 'token_budget'),
              },
            })
            break
        }
        break
      }

      default:
        items.push({
          id: eventId(event, index, ':extension'),
          kind: 'extension',
          timestamp,
          actorName: event.agent,
          extensionType: event.type,
          data: event.data as Record<string, unknown>,
        })
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
