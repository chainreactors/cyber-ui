import { describe, expect, it } from 'vitest'

import type { AOPEvent } from '@cyber/agent-protocol'
import { reduceAOPToTimeline } from './aop-reducer'
import type { AssistantResponseTimelineItem, MessageTimelineItem } from '../types/timeline'

const TS = '2026-07-19T00:00:00Z'

function ev(seq: number, type: string, data: unknown, extra?: Partial<AOPEvent>): AOPEvent {
  return {
    type: type as AOPEvent['type'],
    ts: TS,
    session_id: 's1',
    agent: 'aiscan',
    seq,
    data,
    ...extra,
  } as AOPEvent
}

function messages(items: ReturnType<typeof reduceAOPToTimeline>): MessageTimelineItem[] {
  return items.filter((i): i is MessageTimelineItem => i.kind === 'message')
}

function responses(items: ReturnType<typeof reduceAOPToTimeline>): AssistantResponseTimelineItem[] {
  return items.filter((i): i is AssistantResponseTimelineItem => i.kind === 'assistant_response')
}

describe('reduceAOPToTimeline', () => {
  it('brackets a run with session dividers', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', {}),
      ev(2, 'session.end', { stop: 'completed', turns: 1 }),
    ])
    expect(items.map((i) => i.kind)).toEqual(['divider', 'divider'])
    expect(items[0]).toMatchObject({ variant: 'info' })
    expect(items[1]).toMatchObject({ variant: 'success', label: 'Session ended' })
  })

  it('marks a failed session end as warning with the error', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.end', { stop: 'error', error: 'boom' }),
    ])
    expect(items[0]).toMatchObject({ kind: 'divider', variant: 'warning', label: 'Session ended: boom' })
  })

  it('folds thinking and response deltas into one assistant card', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'message.delta', { message_id: 'm-1', part_type: 'reasoning', part_index: 0, delta: 'think-' }),
      ev(2, 'message.delta', { message_id: 'm-1', part_type: 'reasoning', part_index: 0, delta: 'hard' }),
      ev(3, 'message.delta', { message_id: 'm-1', part_type: 'text', part_index: 1, delta: 'ans-' }),
      ev(4, 'message.delta', { message_id: 'm-1', part_type: 'text', part_index: 1, delta: 'wer' }),
      ev(5, 'message', {
        message_id: 'm-1',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'think-hard' },
          { type: 'text', text: 'ans-wer' },
        ],
      }),
    ])
    const cards = responses(items)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      thinking: 'think-hard',
      response: { content: 'ans-wer' },
      streaming: false,
    })
  })

  it('replays idempotently: seq duplicates are suppressed, final message upserts', () => {
    const stream = [
      ev(1, 'message.delta', { message_id: 'm-1', part_type: 'text', part_index: 0, delta: 'hel' }),
      ev(2, 'message', { message_id: 'm-1', role: 'assistant', parts: [{ type: 'text', text: 'hello' }] }),
    ]
    const once = reduceAOPToTimeline(stream)
    const twice = reduceAOPToTimeline([...stream, ...stream])
    expect(responses(twice)).toHaveLength(responses(once).length)
    expect(responses(twice)[0].response?.content).toBe('hello')
  })

  it('pairs tool.call with tool.result inside one assistant card', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'tool.call', { tool_call_id: 'tc-1', tool_name: 'bash', args: { command: 'ls' } }),
      ev(2, 'tool.result', { tool_call_id: 'tc-1', tool_name: 'bash', content: 'ok' }),
    ])
    expect(items).toHaveLength(1)
    const card = items[0] as AssistantResponseTimelineItem
    expect(card.kind).toBe('assistant_response')
    expect(card.tools[0]).toMatchObject({ id: 'tc-1', toolName: 'bash', pending: false, result: 'ok' })
  })

  it('keeps user messages and assistant cards in stream order and attaches usage', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'message', { message_id: 'u-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }),
      ev(2, 'message', { message_id: 'a-1', role: 'assistant', parts: [{ type: 'text', text: 'yo' }] }),
      ev(3, 'usage', { input_tokens: 10, output_tokens: 5, total_tokens: 15, model: 'm' }),
    ])
    expect(items.map((item) => item.kind)).toEqual(['message', 'assistant_response'])
    expect(messages(items)[0].role).toBe('user')
    expect((responses(items)[0].response?.metadata?.usage as Record<string, unknown>)?.total_tokens).toBe(15)
  })

  it('groups thinking, response, and tools by AOP turn boundaries', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'turn.start', { turn: 3 }),
      ev(2, 'message.delta', { message_id: 'm-3', part_type: 'reasoning', part_index: 0, delta: 'inspect' }),
      ev(3, 'message', {
        message_id: 'm-3',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'inspect target' },
          { type: 'text', text: 'running check' },
        ],
      }),
      ev(4, 'tool.call', { tool_call_id: 'tc-3', tool_name: 'bash', args: { command: 'whoami' } }),
      ev(5, 'tool.result', { tool_call_id: 'tc-3', tool_name: 'bash', content: 'john' }),
      ev(6, 'turn.end', { turn: 3 }),
    ])

    expect(items).toHaveLength(1)
    expect(responses(items)[0]).toMatchObject({
      id: 'aop:s1:aiscan:turn:3',
      thinking: 'inspect target',
      response: { content: 'running check' },
      tools: [{ id: 'tc-3', toolName: 'bash', result: 'john', pending: false }],
      streaming: false,
    })
  })

  it('aggregates consecutive tool and answer turns into one response card', () => {
    const items = reduceAOPToTimeline([
      ev(0, 'session.start', {}),
      ev(1, 'turn.start', { turn: 1 }),
      ev(2, 'message', { message_id: 'tool-turn', role: 'assistant', parts: [{ type: 'reasoning', text: 'use a tool' }] }),
      ev(3, 'tool.call', { tool_call_id: 'tc-1', tool_name: 'bash', args: { command: 'echo ok' } }),
      ev(4, 'tool.result', { tool_call_id: 'tc-1', tool_name: 'bash', content: 'ok' }),
      ev(5, 'turn.end', { turn: 1 }),
      ev(6, 'turn.start', { turn: 2 }),
      ev(7, 'message', {
        message_id: 'answer-turn',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'report the result' },
          { type: 'text', text: 'done' },
        ],
      }),
      ev(8, 'turn.end', { turn: 2 }),
      ev(9, 'session.end', { stop: 'completed', turns: 2 }),
    ])

    expect(responses(items)).toHaveLength(1)
    expect(responses(items)[0]).toMatchObject({
      thinking: 'use a tool\n\nreport the result',
      response: { content: 'done' },
      tools: [{ id: 'tc-1', result: 'ok', pending: false }],
      streaming: false,
    })
  })

  it('keeps reused message ids isolated across session runs', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', {}),
      ev(2, 'turn.start', { turn: 1 }),
      ev(3, 'message', { message_id: 'stable', role: 'assistant', parts: [{ type: 'text', text: 'first' }] }),
      ev(4, 'turn.end', { turn: 1 }),
      ev(5, 'session.end', { stop: 'completed', turns: 1 }),
      ev(6, 'session.start', {}),
      ev(7, 'turn.start', { turn: 1 }),
      ev(8, 'message', { message_id: 'stable', role: 'assistant', parts: [{ type: 'text', text: 'second' }] }),
      ev(9, 'turn.end', { turn: 1 }),
      ev(10, 'session.end', { stop: 'completed', turns: 1 }),
    ])

    expect(responses(items).map((card) => card.response?.content)).toEqual(['first', 'second'])
  })

  it('keeps every IOA card when each chat request resets seq', () => {
    const titles = ['资产盘点完成', '高危入口验证任务', '验证进度更新', '最终复核结论']
    const stream = titles.flatMap((title, index) => {
      const ts = `2026-07-19T00:0${index}:00Z`
      return [
        ev(0, 'session.start', {}, { ts }),
        ev(1, 'turn.start', { turn: 1 }, { ts }),
        ev(2, 'tool.call', {
          tool_call_id: `ioa-${index}`,
          tool_name: 'bash',
          args: { command: `ioa_send --content '{"title":"${title}","content":"detail"}'` },
        }, { ts }),
        ev(3, 'tool.result', {
          tool_call_id: `ioa-${index}`,
          tool_name: 'bash',
          content: JSON.stringify({
            id: `message-${index}`,
            space_id: 'space-1',
            content: { type: 'note', title, content: 'detail' },
          }),
        }, { ts }),
        ev(4, 'message', {
          message_id: 'stable-answer-id',
          role: 'assistant',
          parts: [{ type: 'text', text: `done ${index}` }],
        }, { ts }),
        ev(5, 'turn.end', { turn: 1 }, { ts }),
        ev(6, 'session.end', { stop: 'completed', turns: 1 }, { ts }),
      ]
    })

    const once = responses(reduceAOPToTimeline(stream))
    const replayed = responses(reduceAOPToTimeline([...stream, ...stream]))

    expect(once).toHaveLength(4)
    expect(replayed).toHaveLength(4)
    expect(new Set(once.map((card) => card.id)).size).toBe(4)
    expect(once.map((card) => JSON.parse(card.tools[0].result || '{}').content.title)).toEqual(titles)
  })

  it('renders image parts as markdown', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'message', {
        message_id: 'u-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'look' },
          { type: 'image', image: { base64: 'AAAA', media_type: 'image/png' } },
        ],
      }),
    ])
    expect(messages(items)[0].content).toBe('look\n![image](data:image/png;base64,AAAA)')
  })

  it('surfaces AOP errors as system messages without closing the stream', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'error', { code: 'rate_limit', message: 'slow down', retryable: true }),
      ev(2, 'message', { message_id: 'a-1', role: 'assistant', parts: [{ type: 'text', text: 'recovered' }] }),
    ])
    const msgs = messages(items)
    const cards = responses(items)
    expect(msgs[0]).toMatchObject({ role: 'system', content: 'slow down' })
    expect(msgs[0].metadata).toMatchObject({ code: 'rate_limit', retryable: true })
    expect(cards[0]).toMatchObject({ response: { content: 'recovered' } })
  })

  it('maps status extensions (eval/compact/budget) to extension items', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'status', { state: 'eval_end' }, { ext: { aiscan: { eval_round: 2, eval_pass: true } } }),
      ev(2, 'status', { state: 'compact_end' }, { ext: { aiscan: { compact_tokens_before: 100, compact_tokens_after: 40, compact_kept_messages: 3 } } }),
      ev(3, 'status', { state: 'token_budget_warning' }, { ext: { aiscan: { context_tokens: 90, token_budget: 100 } } }),
    ])
    expect(items.map((i) => i.kind)).toEqual(['extension', 'extension', 'extension'])
    expect(items[0]).toMatchObject({ extensionType: 'eval', data: { round: 2, pass: true } })
    expect(items[1]).toMatchObject({ extensionType: 'compact', data: { tokens_before: 100, tokens_after: 40, kept_messages: 3 } })
    expect(items[2]).toMatchObject({ extensionType: 'token_budget', data: { context_tokens: 90, token_budget: 100 } })
  })

  it('separates interleaved sessions by stream key', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'message', { message_id: 'm-1', role: 'assistant', parts: [{ type: 'text', text: 'from s1' }] }),
      ev(2, 'message', { message_id: 'm-1', role: 'assistant', parts: [{ type: 'text', text: 'from s2' }] }, { session_id: 's2' }),
    ])
    const cards = responses(items)
    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.response?.content)).toEqual(['from s1', 'from s2'])
  })

  it('marks the last assistant card as streaming when requested', () => {
    const items = reduceAOPToTimeline(
      [ev(1, 'message', { message_id: 'a-1', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] })],
      { streaming: true },
    )
    expect(responses(items)[0].streaming).toBe(true)
  })
})
