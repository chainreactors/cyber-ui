import { create } from '@bufbuild/protobuf'
import { timestampFromDate } from '@bufbuild/protobuf/wkt'
import {
  ContentSchema,
  EventSchema,
  MessageDeltaSchema,
  MessageSchema,
  TextContentSchema,
  ToolCallSchema,
  ToolResultSchema,
  TurnEndedSchema,
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
    emittedAt: timestampFromDate(new Date(seq * 1000)),
    payload,
  })
}

function text(value: string) {
  return create(ContentSchema, { value: { case: 'text', value: create(TextContentSchema, { text: value }) } })
}

describe('reduceAOPToTimeline', () => {
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

  it('timestamps a completed response at turn end', () => {
    const events = [
      event(1, { case: 'message', value: create(MessageSchema, { id: 'm1', role: 'assistant', content: [text('done')] }) }),
      event(2, { case: 'turnEnded', value: create(TurnEndedSchema, { stopReason: 'completed' }) }),
    ]

    expect(reduceAOPToTimeline(events)[0]).toMatchObject({
      kind: 'assistant_response', timestamp: 2000, streaming: false,
    })
  })
})
