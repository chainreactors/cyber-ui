import type { Content, EncodedValue, Event, TokenUsage } from '@cyber/aop'
import type {
  AssistantResponseTimelineItem,
  MessageTimelineItem,
  TimelineItem,
  ToolCallEntry,
} from '../types/timeline'

export interface ReduceAOPOptions {
  streaming?: boolean
  lifecycle?: 'all' | 'errors' | 'none'
}

const decoder = new TextDecoder()
const MAX_TOOL_ARGS_CHARS = 32_000
const MAX_TOOL_RESULT_CHARS = 100_000

function timestamp(event: Event): number {
  if (!event.emittedAt) return 0
  return Number(event.emittedAt.seconds) * 1000 + event.emittedAt.nanos / 1_000_000
}

function encoded(value?: EncodedValue): unknown {
  if (!value) return undefined
  if (value.mediaType === 'application/json' || value.mediaType === 'application/protobuf+json') {
    try { return JSON.parse(decoder.decode(value.data)) }
    catch { return undefined }
  }
  return value.data
}

function stringify(value: unknown, limit: number): string {
  let text = ''
  if (typeof value === 'string') text = value
  else if (value instanceof Uint8Array) text = decoder.decode(value)
  else if (value !== undefined) {
    try { text = JSON.stringify(value, null, 2) }
    catch { text = String(value) }
  }
  return text.length <= limit ? text : `${text.slice(0, limit)}\n... (${text.length - limit} characters omitted)`
}

function contentText(parts: readonly Content[], kind: 'text' | 'reasoning' | 'refusal' = 'text'): string {
  const values: string[] = []
  for (const part of parts) {
    if (kind === 'text' && part.value.case === 'text') values.push(part.value.value.text)
    if (kind === 'reasoning' && part.value.case === 'reasoning') values.push(part.value.value.text)
    if (kind === 'refusal' && part.value.case === 'refusal') values.push(part.value.value)
  }
  return values.filter(Boolean).join('\n')
}

function contentMedia(parts: readonly Content[]): string {
  const values: string[] = []
  for (const part of parts) {
    if (part.value.case !== 'media') continue
    const media = part.value.value
    const resource = media.resource
    if (resource?.source.case === 'uri') values.push(`[${media.kind || 'media'}](${resource.source.value})`)
    else if (resource?.filename) values.push(`[${media.kind || 'media'}: ${resource.filename}]`)
  }
  return values.join('\n')
}

function usageMetadata(usage: TokenUsage): Record<string, unknown> {
  return {
    usage: {
      input_tokens: Number(usage.inputTokens),
      output_tokens: Number(usage.outputTokens),
      total_tokens: Number(usage.totalTokens),
      model: usage.model,
      ...Object.fromEntries(Object.entries(usage.detail).map(([key, value]) => [key, Number(value)])),
    },
  }
}

export function reduceAOPToTimeline(
  events: readonly Event[],
  options: ReduceAOPOptions = {},
): TimelineItem[] {
  const items: TimelineItem[] = []
  const seen = new Set<string>()
  const responses = new Map<string, AssistantResponseTimelineItem>()
  const responseByMessage = new Map<string, AssistantResponseTimelineItem>()
  const responseByTool = new Map<string, AssistantResponseTimelineItem>()
  const lifecycle = options.lifecycle ?? 'all'

  const streamKey = (event: Event) => `${event.sessionId}:${event.emitter}`
  const scope = (event: Event) => `${streamKey(event)}:${event.turnId || 'session'}`
  const eventKey = (event: Event, index: number) => event.id || `${scope(event)}:${event.seq || BigInt(index + 1)}`
  const responseID = (event: Event) => `${scope(event)}:response`

  const ensureResponse = (event: Event): AssistantResponseTimelineItem => {
    const key = scope(event)
    const current = responses.get(key)
    if (current) return current
    const response: AssistantResponseTimelineItem = {
      id: responseID(event),
      kind: 'assistant_response',
      timestamp: timestamp(event),
      actorName: event.emitter,
      tools: [],
      streaming: true,
    }
    items.push(response)
    responses.set(key, response)
    return response
  }

  const finish = (event: Event) => {
    const response = responses.get(scope(event))
    if (response) response.streaming = false
  }

  const appendTool = (response: AssistantResponseTimelineItem, tool: ToolCallEntry) => {
    const current = response.tools.find((entry) => entry.id === tool.id)
    if (current) Object.assign(current, tool)
    else response.tools.push(tool)
  }

  events.forEach((event, index) => {
    if (!event.sessionId || !event.payload.case) return
    const unique = eventKey(event, index)
    if (seen.has(unique)) return
    seen.add(unique)

    switch (event.payload.case) {
      case 'sessionStarted':
        if (lifecycle === 'all') items.push({
          id: `${unique}:start`, kind: 'divider', timestamp: timestamp(event), actorName: event.emitter,
          label: event.payload.value.parentSessionId ? 'Sub-session started' : 'Session started', variant: 'info',
        })
        break

      case 'sessionEnded':
        finish(event)
        if (lifecycle === 'all') items.push({
          id: `${unique}:end`, kind: 'divider', timestamp: timestamp(event), actorName: event.emitter,
          label: event.payload.value.reason ? `Session ended: ${event.payload.value.reason}` : 'Session ended', variant: 'success',
        })
        break

      case 'turnStarted':
        ensureResponse(event)
        break

      case 'turnEnded': {
        finish(event)
        const ended = event.payload.value
        const failure = ended.error?.message
        if (failure && lifecycle !== 'none') items.push({
          id: `${unique}:error`, kind: 'divider', timestamp: timestamp(event), actorName: event.emitter,
          label: failure, variant: 'warning',
        })
        const response = responses.get(scope(event))
        if (response && ended.usage) response.response = {
          content: response.response?.content ?? '',
          metadata: { ...response.response?.metadata, ...usageMetadata(ended.usage) },
        }
        break
      }

      case 'messageDelta': {
        const delta = event.payload.value
        const key = `${scope(event)}:message:${delta.messageId}`
        const response = responseByMessage.get(key) ?? ensureResponse(event)
        responseByMessage.set(key, response)
        response.streaming = true
        if (delta.value.case === 'reasoning') response.thinking = `${response.thinking ?? ''}${delta.value.value}`
        else if (delta.value.case === 'text') response.response = {
          ...response.response,
          content: `${response.response?.content ?? ''}${delta.value.value}`,
        }
        break
      }

      case 'message': {
        const message = event.payload.value
        const text = [contentText(message.content), contentText(message.content, 'refusal'), contentMedia(message.content)].filter(Boolean).join('\n')
        const reasoning = contentText(message.content, 'reasoning')
        if (message.role === 'assistant') {
          const key = `${scope(event)}:message:${message.id}`
          const response = responseByMessage.get(key) ?? ensureResponse(event)
          responseByMessage.set(key, response)
          if (reasoning) response.thinking = reasoning
          if (text) response.response = { ...response.response, content: text }
          response.streaming = false
          break
        }
        if (!text) break
        const item: MessageTimelineItem = {
          id: message.id || unique,
          kind: 'message', timestamp: timestamp(event), actorName: event.emitter,
          role: message.role === 'system' ? 'system' : 'user', content: text, streaming: false,
        }
        items.push(item)
        break
      }

      case 'toolCall': {
        const call = event.payload.value
        const response = ensureResponse(event)
        appendTool(response, {
          id: call.id, toolName: call.name,
          toolArgs: stringify(encoded(call.arguments), MAX_TOOL_ARGS_CHARS), pending: true,
        })
        responseByTool.set(`${scope(event)}:tool:${call.id}`, response)
        break
      }

      case 'toolResult': {
        const result = event.payload.value
        const key = `${scope(event)}:tool:${result.callId}`
        const response = responseByTool.get(key) ?? ensureResponse(event)
        const current = response.tools.find((entry) => entry.id === result.callId)
        appendTool(response, {
          id: result.callId, toolName: result.name || current?.toolName || '', toolArgs: current?.toolArgs || '',
          result: stringify(contentText(result.output), MAX_TOOL_RESULT_CHARS),
          pending: false, error: result.isError,
        })
        responseByTool.set(key, response)
        break
      }

      case 'usage': {
        const response = responses.get(scope(event))
        if (response) response.response = {
          content: response.response?.content ?? '',
          metadata: { ...response.response?.metadata, ...usageMetadata(event.payload.value) },
        }
        break
      }

      case 'error':
        if (lifecycle !== 'none') items.push({
          id: unique, kind: 'divider', timestamp: timestamp(event), actorName: event.emitter,
          label: event.payload.value.message, variant: 'warning',
        })
        break

      case 'extension': {
        const extension = event.payload.value
        items.push({
          id: unique, kind: 'extension', timestamp: timestamp(event), actorName: event.emitter,
          extensionType: extension.typeUrl || 'extension',
          data: { typeUrl: extension.typeUrl },
        })
        break
      }
    }
  })

  if (!options.streaming) for (const response of responses.values()) response.streaming = false
  return items
}
