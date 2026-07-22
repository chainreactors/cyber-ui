import type {
  AOPEvent,
  DelegationDetail,
  MessageData,
  MessageDeltaData,
  MessagePart,
  SessionStartData,
  ToolCallData,
  ToolResultData,
  UsageData,
} from '@cyber/agent-protocol'
import type {
  AssistantResponseTimelineItem,
  MessageTimelineItem,
  TimelineItem,
  ToolCallEntry,
  SubagentRunTimelineItem,
} from '../types/timeline'

export interface ReduceAOPOptions {
  /** Mark the last assistant response card as streaming. */
  streaming?: boolean
  /** Internal: session that owns the current recursive subtree. */
  rootSessionID?: string
}

interface ChildSession {
  sessionID: string
  parentSessionID: string
  parentToolCallID: string
  name: string
  delegation?: DelegationDetail
  events: AOPEvent[]
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function delegationOf(event: AOPEvent): DelegationDetail | null {
  const detail = objectValue(event.ext?.delegation)
  return detail ? detail as DelegationDetail : null
}

function delegationMode(detail: DelegationDetail): string {
  if (detail.context_mode === 'fork') return 'fork'
  return detail.run_mode ?? ''
}

function childStatus(child?: ChildSession): SubagentRunTimelineItem['status'] {
  if (!child) return 'starting'
  const end = [...child.events].reverse().find((event) => event.session_id === child.sessionID && event.type === 'session.end')
  if (!end) return 'running'
  const data = objectValue(end.data) ?? {}
  if (data.stop === 'canceled') return 'canceled'
  if (data.stop === 'error' || data.error) return 'failed'
  return 'completed'
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

function eventId(event: AOPEvent, index: number, suffix = '', scope?: string): string {
  const position = event.seq === undefined ? index : event.seq
  return `${scope ?? `aop:${event.session_id}:${event.agent}`}:${position}${suffix}`
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

function extBlock(event: AOPEvent, namespace: string): Record<string, unknown> {
  const value = event.ext?.[namespace]
  return value && typeof value === 'object' ? value : {}
}

function extNumber(ext: Record<string, unknown>, key: string): number | undefined {
  const value = ext[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

// Message metadata = the emitting agent's ext `metadata` sub-object flattened to
// the top level (so consumers find e.g. an i18n `code` where the pre-AOP message
// model put it), with the raw ext kept under `ext` for namespace-specific reads.
function messageMetadata(event: AOPEvent): Record<string, unknown> | undefined {
  const ext = extBlock(event, 'cairn')
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
 *
 * AOP exposes thinking, text, and tool activity as separate events. The chat
 * surface intentionally folds those events back into one assistant response
 * per turn so protocol granularity does not leak into the conversation UI.
 */
export function reduceAOPToTimeline(
  events: readonly AOPEvent[],
  options: ReduceAOPOptions = {},
): TimelineItem[] {
  const items: TimelineItem[] = []
  const seen = new Set<string>()

  const childSessionIDs = new Set<string>()
  const childrenByRoute = new Map<string, ChildSession>()
  const childrenByParent = new Map<string, ChildSession[]>()
  for (const event of events) {
    if (event.type !== 'session.start') continue
    if (event.session_id === options.rootSessionID) continue
    const data = event.data as SessionStartData
    if (!data.parent_session_id || !data.parent_tool_call_id) continue
    childSessionIDs.add(event.session_id)
    const child: ChildSession = {
      sessionID: event.session_id,
      parentSessionID: data.parent_session_id,
      parentToolCallID: data.parent_tool_call_id,
      name: event.agent,
      delegation: delegationOf(event) ?? undefined,
      events: [],
    }
    childrenByRoute.set(`${data.parent_session_id}:${data.parent_tool_call_id}`, child)
    const siblings = childrenByParent.get(data.parent_session_id) ?? []
    siblings.push(child)
    childrenByParent.set(data.parent_session_id, siblings)
  }
  const subtreeSessionIDs = (rootSessionID: string): Set<string> => {
    const found = new Set<string>()
    const pending = [rootSessionID]
    while (pending.length > 0) {
      const sessionID = pending.pop()!
      if (found.has(sessionID)) continue
      found.add(sessionID)
      for (const child of childrenByParent.get(sessionID) ?? []) pending.push(child.sessionID)
    }
    return found
  }
  for (const child of childrenByRoute.values()) {
    const subtree = subtreeSessionIDs(child.sessionID)
    child.events = events.filter((event) => subtree.has(event.session_id))
  }
  const subagentsByTool = new Map<string, SubagentRunTimelineItem>()
  // A stream can have only one active model turn, but several streams may be
  // interleaved in a merged timeline. Message/tool indexes make final events
  // idempotently update the card opened by their earlier delta/call event.
  const activeResponses = new Map<string, AssistantResponseTimelineItem>()
  const activeRunIDs = new Map<string, string>()
  const runIDsByStart = new Map<string, string>()
  const responsesByMessage = new Map<string, AssistantResponseTimelineItem>()
  const thinkingByMessage = new Map<string, string>()
  const responsesByTool = new Map<string, AssistantResponseTimelineItem>()
  const lastResponses = new Map<string, AssistantResponseTimelineItem>()

  const streamKey = (event: AOPEvent) => `${event.session_id}:${event.agent}`
  const eventScope = (event: AOPEvent) => (
    activeRunIDs.get(streamKey(event)) ?? `aop:${event.session_id}:${event.agent}`
  )
  const scopedEventId = (event: AOPEvent, index: number, suffix = '') => (
    eventId(event, index, suffix, eventScope(event))
  )
  const messageKey = (event: AOPEvent, messageId: string) => `${eventScope(event)}:message:${messageId}`
  const toolKey = (event: AOPEvent, callId: string) => `${eventScope(event)}:tool:${callId}`
  const responseID = (event: AOPEvent, fallback: string) => {
    const runID = activeRunIDs.get(streamKey(event))
    return runID ? `${runID}:response` : fallback
  }

  const finishResponse = (key: string) => {
    const response = activeResponses.get(key)
    if (!response) return
    response.streaming = false
    activeResponses.delete(key)
    for (const [mkey, owner] of responsesByMessage) {
      if (owner === response) {
        responsesByMessage.delete(mkey)
        thinkingByMessage.delete(mkey)
      }
    }
    for (const [tkey, owner] of responsesByTool) {
      if (owner === response) responsesByTool.delete(tkey)
    }
  }

  const ensureResponse = (
    event: AOPEvent,
    index: number,
    timestamp: number,
    preferredId?: string,
  ): AssistantResponseTimelineItem => {
    const key = streamKey(event)
    const existing = activeResponses.get(key)
    if (existing) return existing

    const replayed = preferredId
      ? items.find((item): item is AssistantResponseTimelineItem => (
          item.kind === 'assistant_response' && item.id === preferredId
        ))
      : undefined
    if (replayed) {
      replayed.streaming = true
      activeResponses.set(key, replayed)
      lastResponses.set(key, replayed)
      return replayed
    }

    const item: AssistantResponseTimelineItem = {
      id: preferredId ?? scopedEventId(event, index, ':response'),
      kind: 'assistant_response',
      timestamp,
      actorName: event.agent,
      tools: [],
      streaming: true,
    }
    items.push(item)
    activeResponses.set(key, item)
    lastResponses.set(key, item)
    return item
  }

  const startTurn = (event: AOPEvent, index: number, timestamp: number) => {
    const key = streamKey(event)
    const active = activeResponses.get(key)
    if (active) {
      active.streaming = true
      return
    }
    const data = event.data as { turn?: number }
    const turn = typeof data.turn === 'number' ? data.turn : undefined
    const fallbackID = turn === undefined
      ? scopedEventId(event, index, ':response')
      : `aop:${event.session_id}:${event.agent}:turn:${turn}`
    ensureResponse(event, index, timestamp, responseID(event, fallbackID))
  }

  const pauseResponse = (key: string) => {
    const response = activeResponses.get(key)
    if (response) response.streaming = false
  }

  const updateThinking = (response: AssistantResponseTimelineItem, mkey: string, content: string) => {
    thinkingByMessage.set(mkey, content)
    const seenThinking = new Set<string>()
    response.thinking = [...responsesByMessage.entries()]
      .filter(([, owner]) => owner === response)
      .map(([messageKey]) => thinkingByMessage.get(messageKey)?.trim() ?? '')
      .filter((thinking) => {
        if (!thinking || seenThinking.has(thinking)) return false
        seenThinking.add(thinking)
        return true
      })
      .join('\n\n') || undefined
  }

  const appendTool = (response: AssistantResponseTimelineItem, tool: ToolCallEntry) => {
    const existing = response.tools.find((candidate) => candidate.id === tool.id)
    if (existing) {
      Object.assign(existing, tool)
    } else {
      response.tools.push(tool)
    }
  }

  events.forEach((event, index) => {
    if (!event.type || !event.session_id) return
    if (childSessionIDs.has(event.session_id)) return
    const key = streamKey(event)

    // A platform chat session may contain many agent runs. Each run restarts
    // AOP seq at zero, so seq is only unique inside session.start → session.end.
    // Replayed history repeats the exact start frame; reuse its prior run id so
    // the replay remains idempotent while a genuinely new start gets a new scope.
    if (event.type === 'session.start') {
      const startIdentity = `${key}:${event.seq ?? index}:${event.ts}`
      let runID = runIDsByStart.get(startIdentity)
      if (!runID) {
        runID = `aop:${event.session_id}:${event.agent}:run:${event.ts}:${event.seq ?? index}`
        runIDsByStart.set(startIdentity, runID)
      }
      activeRunIDs.set(key, runID)
    }

    if (event.seq !== undefined) {
      const seenKey = `${eventScope(event)}:seq:${event.seq}`
      if (seen.has(seenKey)) {
        if (event.type === 'session.end') activeRunIDs.delete(key)
        return
      }
      seen.add(seenKey)
    }

    const timestamp = timestampOf(event.ts)

    switch (event.type) {
      case 'session.start':
        finishResponse(key)
        items.push({
          id: scopedEventId(event, index, ':start'),
          kind: 'divider',
          timestamp,
          actorName: event.agent,
          label: event.agent ? `${event.agent} session started` : 'Session started',
          variant: 'info',
        })
        break

      case 'session.end': {
        finishResponse(key)
        const data = event.data as Record<string, unknown>
        const failed = data.stop === 'error' || Boolean(data.error)
        items.push({
          id: scopedEventId(event, index, ':end'),
          kind: 'divider',
          timestamp,
          actorName: event.agent,
          label: failed ? `Session ended: ${String(data.error ?? data.stop)}` : 'Session ended',
          variant: failed ? 'warning' : 'success',
        })
        activeRunIDs.delete(key)
        break
      }

      case 'turn.start':
        startTurn(event, index, timestamp)
        break

      case 'turn.end':
        // One user request may span several model turns (tool call → tool
        // result → final answer). Keep the response card active until the AOP
        // session ends so those turns render as one conversation unit.
        pauseResponse(key)
        break

      case 'message.delta': {
        const data = event.data as unknown as MessageDeltaData
        if (!data.message_id || !data.delta) break
        const mkey = messageKey(event, data.message_id)
        const response = responsesByMessage.get(mkey) ?? ensureResponse(
          event,
          index,
          timestamp,
          responseID(event, `aop:${event.session_id}:${event.agent}:response:${data.message_id}`),
        )
        responsesByMessage.set(mkey, response)
        response.streaming = true

        if (data.part_type === 'reasoning') {
          updateThinking(response, mkey, (thinkingByMessage.get(mkey) ?? '') + data.delta)
          break
        }

        const current = response.response ?? { content: '', metadata: messageMetadata(event) }
        response.response = { ...current, content: current.content + data.delta }
        break
      }

      case 'message': {
        const data = event.data as unknown as MessageData
        if (!data.message_id) break
        const mkey = messageKey(event, data.message_id)
        const role = data.role === 'user' || data.role === 'system' ? data.role : 'assistant'
        const text = partText(data.parts, 'text')
        const reasoning = partText(data.parts, 'reasoning')
        const images = partImagesMarkdown(data.parts)
        const content = [text, images].filter(Boolean).join('\n')

        if (role === 'assistant') {
          if (!content && !reasoning) break
          const response = responsesByMessage.get(mkey) ?? ensureResponse(
            event,
            index,
            timestamp,
            responseID(event, `aop:${event.session_id}:${event.agent}:response:${data.message_id}`),
          )
          responsesByMessage.set(mkey, response)
          if (reasoning) updateThinking(response, mkey, reasoning)
          if (content) response.response = { content, metadata: messageMetadata(event) }
          response.streaming = false
          lastResponses.set(key, response)
          break
        }

        finishResponse(key)
        if (!content) break
        const message: MessageTimelineItem = {
          id: `${eventScope(event)}:msg:${data.message_id}`,
          kind: 'message',
          timestamp,
          actorName: event.agent,
          role,
          content,
          streaming: false,
          metadata: messageMetadata(event),
        }
        items.push(message)
        break
      }

      case 'tool.call': {
        const data = event.data as unknown as ToolCallData
        if (!data.tool_call_id) break
        const requested = delegationOf(event)
        if (requested) {
          const child = childrenByRoute.get(`${event.session_id}:${data.tool_call_id}`)
          const actual = child?.delegation
          const detail: DelegationDetail = { ...requested, ...actual }
          const nested = child
            ? reduceAOPToTimeline(child.events, {
              streaming: !child.events.some((item) => item.session_id === child.sessionID && item.type === 'session.end'),
              rootSessionID: child.sessionID,
            })
                .filter((item) => item.kind !== 'divider')
            : []
          const item: SubagentRunTimelineItem = {
            id: scopedEventId(event, index, ':subagent'),
            kind: 'subagent_run',
            timestamp,
            actorName: event.agent,
            toolCallID: data.tool_call_id,
            name: child?.name || detail.agent_name || detail.agent_type || 'subagent',
            mode: delegationMode(detail),
            prompt: detail.task ?? '',
            sessionID: child?.sessionID,
            parentSessionID: event.session_id,
            status: childStatus(child),
            items: nested,
          }
          items.push(item)
          subagentsByTool.set(toolKey(event, data.tool_call_id), item)
          break
        }
        const response = ensureResponse(
          event,
          index,
          timestamp,
          responseID(event, `aop:${event.session_id}:${event.agent}:response:tool:${data.tool_call_id}`),
        )
        const tool: ToolCallEntry = {
          id: data.tool_call_id,
          toolName: data.tool_name,
          toolArgs: stringify(data.args),
          pending: true,
        }
        appendTool(response, tool)
        response.streaming = true
        responsesByTool.set(toolKey(event, data.tool_call_id), response)
        break
      }

      case 'tool.result': {
        const data = event.data as unknown as ToolResultData
        if (!data.tool_call_id) break
        const subagent = subagentsByTool.get(toolKey(event, data.tool_call_id))
        if (subagent) {
          subagent.launchResult = stringify(data.content)
          break
        }
        const tkey = toolKey(event, data.tool_call_id)
        const response = responsesByTool.get(tkey) ?? ensureResponse(
          event,
          index,
          timestamp,
          responseID(event, `aop:${event.session_id}:${event.agent}:response:tool:${data.tool_call_id}`),
        )
        const existing = response.tools.find((candidate) => candidate.id === data.tool_call_id)
        appendTool(response, {
          id: data.tool_call_id,
          toolName: data.tool_name ?? existing?.toolName ?? '',
          toolArgs: existing?.toolArgs ?? '',
          result: stringify(data.content),
          pending: false,
        })
        responsesByTool.set(tkey, response)
        break
      }

      case 'usage': {
        const response = lastResponses.get(key)
        if (response?.response) {
          response.response.metadata = mergeUsage(response.response.metadata, event.data as unknown as UsageData)
        }
        break
      }

      case 'error': {
        finishResponse(key)
        const data = event.data as Record<string, unknown>
        const message: MessageTimelineItem = {
          id: scopedEventId(event, index, ':error'),
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
        switch (data.state) {
          case 'thinking':
            ensureResponse(event, index, timestamp).streaming = true
            break
          case 'eval_end':
            {
            const ext = extBlock(event, 'eval')
            items.push({
              id: scopedEventId(event, index, ':eval'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'eval',
              data: {
                round: extNumber(ext, 'round'),
                pass: ext.pass === true,
                reason: typeof ext.reason === 'string' ? ext.reason : undefined,
              },
            })
            break
            }
          case 'eval_error':
            {
            const ext = extBlock(event, 'eval')
            items.push({
              id: scopedEventId(event, index, ':eval'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'eval',
              data: {
                round: extNumber(ext, 'round'),
                pass: false,
                reason: typeof ext.error === 'string' ? ext.error : undefined,
              },
            })
            break
            }
          case 'compact_end':
            {
            const ext = extBlock(event, 'compact')
            items.push({
              id: scopedEventId(event, index, ':compact'),
              kind: 'extension',
              timestamp,
              actorName: event.agent,
              extensionType: 'compact',
              data: {
                tokens_before: extNumber(ext, 'tokens_before'),
                tokens_after: extNumber(ext, 'tokens_after'),
                kept_messages: extNumber(ext, 'kept_messages'),
              },
            })
            break
            }
          case 'token_budget_warning':
            {
            const ext = extBlock(event, 'aop')
            items.push({
              id: scopedEventId(event, index, ':budget'),
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
        }
        break
      }

      default:
        items.push({
          id: scopedEventId(event, index, ':extension'),
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
      (item): item is AssistantResponseTimelineItem => item.kind === 'assistant_response',
    )
    if (last) last.streaming = true
  }

  return items
}
