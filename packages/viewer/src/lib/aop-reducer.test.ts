import { create } from '@bufbuild/protobuf'
import {
  ContentSchema,
  EventSchema,
  MessageDeltaSchema,
  MessageSchema,
  TextContentSchema,
  ReasoningContentSchema,
  StatusSchema,
  ToolCallSchema,
  ToolResultSchema,
  TurnStartedSchema,
  type Event,
} from '@cyber/aop'
import { describe, expect, it } from 'vitest'
import { reduceAOPToTimeline } from './aop-reducer'

function event(seq: number, payload: Event['payload']): Event {
  return create(EventSchema, {
    id: `event-${seq}`,
    sessionId: 'session-1',
    turnId: 'turn-1',
    emitter: 'agent-1',
    seq: BigInt(seq),
    payload,
  })
}

function text(value: string) {
  return create(ContentSchema, { value: { case: 'text', value: create(TextContentSchema, { text: value }) } })
}

describe('reduceAOPToTimeline', () => {
  it('rolls back a failed attempt using an authoritative empty message', () => {
    const delta = (seq: number, part: 'text' | 'reasoning', value: string) =>
      event(seq, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'retry', value: { case: part, value } }) })
    const events = [
      event(1, { case: 'message', value: create(MessageSchema, { id: 'earlier', role: 'assistant', content: [text('previous step')] }) }),
      delta(2, 'reasoning', 'failed thought'), delta(3, 'text', 'failed answer'),
      event(4, { case: 'message', value: create(MessageSchema, { id: 'retry', role: 'assistant' }) }),
      delta(5, 'reasoning', 'retry thought'), delta(6, 'text', 'retry answer'),
    ]
    expect(reduceAOPToTimeline(events.slice(0, 4), { streaming: true })[0]).toMatchObject({
      thinking: '', response: { content: 'previous step' },
    })
    expect(reduceAOPToTimeline(events, { streaming: true })[0]).toMatchObject({
      thinking: 'retry thought', response: { content: 'previous step\n\nretry answer' }, streaming: true,
    })
  })

  it('reconciles each streamed message without erasing earlier text or reasoning', () => {
    const events = [
      event(1, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm1', value: { case: 'reasoning', value: 'first thought' } }) }),
      event(2, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm1', value: { case: 'text', value: 'first draft' } }) }),
      event(3, { case: 'message', value: create(MessageSchema, { id: 'm1', role: 'assistant', content: [
        text('first step'), create(ContentSchema, { value: { case: 'reasoning', value: create(ReasoningContentSchema, { text: 'first thought' }) } }),
      ] }) }),
      event(4, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm2', value: { case: 'reasoning', value: 'second thought' } }) }),
      event(5, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm2', value: { case: 'text', value: 'second draft' } }) }),
      event(6, { case: 'message', value: create(MessageSchema, { id: 'm2', role: 'assistant', content: [
        text('second step'), create(ContentSchema, { value: { case: 'reasoning', value: create(ReasoningContentSchema, { text: 'second thought' }) } }),
      ] }) }),
    ]
    expect(reduceAOPToTimeline(events.slice(0, 5), { streaming: true })[0]).toMatchObject({
      thinking: 'first thought\n\nsecond thought', response: { content: 'first step\n\nsecond draft' }, streaming: true,
    })
    const result = reduceAOPToTimeline(events)
    expect(result[0]).toMatchObject({
      thinking: 'first thought\n\nsecond thought', response: { content: 'first step\n\nsecond step' }, streaming: false,
    })
    expect(reduceAOPToTimeline([...events, ...events])).toEqual(result)
  })

  it.each(['turn-1', ''])('starts a new response after a host boundary scoped to %j', (turnId) => {
    const boundary = event(2, { case: 'status', value: create(StatusSchema, { state: 'compact_start' }) })
    boundary.turnId = turnId
    const events = [
      event(1, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm1', value: { case: 'text', value: 'before' } }) }),
      boundary,
      event(3, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm2', value: { case: 'text', value: 'after' } }) }),
    ]
    const result = reduceAOPToTimeline(events, { streaming: true, responseBoundary: value => value.payload.case === 'status' })
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ response: { content: 'before' }, streaming: false })
    expect(result[1]).toMatchObject({ response: { content: 'after' }, streaming: true })
    expect(result[0].id).not.toBe(result[1].id)
  })

  it('uses deltas for streaming and the complete message as authority', () => {
    const events = [
      event(1, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm1', value: { case: 'text', value: 'hel' } }) }),
      event(2, { case: 'messageDelta', value: create(MessageDeltaSchema, { messageId: 'm1', value: { case: 'text', value: 'lo' } }) }),
      event(3, { case: 'message', value: create(MessageSchema, { id: 'm1', role: 'assistant', content: [text('hello')] }) }),
    ]
    expect(reduceAOPToTimeline(events)[0]).toMatchObject({
      kind: 'assistant_response', streaming: false, response: { content: 'hello' },
    })
  })

  it('joins a tool result to its generated tool call ID', () => {
    const events = [
      event(1, { case: 'toolCall', value: create(ToolCallSchema, { id: 'call-1', name: 'search' }) }),
      event(2, { case: 'toolResult', value: create(ToolResultSchema, { callId: 'call-1', name: 'search', output: [text('done')] }) }),
    ]
    expect(reduceAOPToTimeline(events)[0]).toMatchObject({
      kind: 'assistant_response',
      tools: [{ id: 'call-1', toolName: 'search', result: 'done', pending: false }],
    })
  })

  it('places the user message before assistant work even when turn.start arrives first', () => {
    const events = [
      event(1, { case: 'turnStarted', value: create(TurnStartedSchema) }),
      event(2, { case: 'message', value: create(MessageSchema, { id: 'u1', role: 'user', content: [text('check this')] }) }),
      event(3, { case: 'toolCall', value: create(ToolCallSchema, { id: 'call-1', name: 'read' }) }),
      event(4, { case: 'message', value: create(MessageSchema, { id: 'm1', role: 'assistant', content: [text('done')] }) }),
    ]

    expect(reduceAOPToTimeline(events).map(item => item.kind)).toEqual([
      'message',
      'assistant_response',
    ])
  })

  it('keeps multiple assistant messages from the same turn in order', () => {
    const events = [
      event(1, { case: 'message', value: create(MessageSchema, { id: 'm1', role: 'assistant', content: [text('first step')] }) }),
      event(2, { case: 'toolCall', value: create(ToolCallSchema, { id: 'call-1', name: 'read' }) }),
      event(3, { case: 'message', value: create(MessageSchema, { id: 'm2', role: 'assistant', content: [text('final answer')] }) }),
    ]

    expect(reduceAOPToTimeline(events)[0]).toMatchObject({
      kind: 'assistant_response',
      response: { content: 'first step\n\nfinal answer' },
    })
  })
})
