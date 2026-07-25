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
      ev(2, 'session.end', { reason: 'completed' }),
    ])
    expect(items.map((i) => i.kind)).toEqual(['divider', 'divider'])
    expect(items[0]).toMatchObject({ variant: 'info' })
    expect(items[1]).toMatchObject({ variant: 'success', label: 'Session ended' })
  })

  it('labels a child run as a sub-session', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', { parent_session_id: 'root-session' }, { session_id: 'child-session' }),
    ])
    expect(items[0]).toMatchObject({
      kind: 'divider',
      label: 'aiscan sub-session started',
    })
  })

  it('marks a non-routine session end reason as a warning', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.end', { reason: 'canceled' }),
    ])
    expect(items[0]).toMatchObject({ kind: 'divider', variant: 'warning', label: 'Session ended: canceled' })
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

  it('drops a redelivered seqless user echo instead of rendering it twice', () => {
    // The hub echoes each user message as an AOP `message` with seq omitted
    // (0 → omitempty), so the seq-based replay guard can't suppress a double
    // delivery. Deduping by the message's stable id must, or the operator sees
    // their own message twice.
    const echo = {
      type: 'message',
      ts: TS,
      session_id: 's1',
      agent: 'aiscan.web',
      data: { message_id: 'user-echo-1', role: 'user', parts: [{ type: 'text', text: '帮我测试' }] },
    } as AOPEvent
    const items = reduceAOPToTimeline([echo, echo])
    expect(messages(items)).toHaveLength(1)
    expect(messages(items)[0]).toMatchObject({ role: 'user', content: '帮我测试' })
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
      ev(1, 'turn.start', {}, { turn_id: 'run-3' }),
      ev(2, 'message.delta', { message_id: 'm-3', part_type: 'reasoning', part_index: 0, delta: 'inspect' }, { turn_id: 'run-3' }),
      ev(3, 'message', {
        message_id: 'm-3',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'inspect target' },
          { type: 'text', text: 'running check' },
        ],
      }, { turn_id: 'run-3' }),
      ev(4, 'tool.call', { tool_call_id: 'tc-3', tool_name: 'bash', args: { command: 'whoami' } }, { turn_id: 'run-3' }),
      ev(5, 'tool.result', { tool_call_id: 'tc-3', tool_name: 'bash', content: 'john' }, { turn_id: 'run-3' }),
      ev(6, 'turn.end', { stop: 'completed' }, { turn_id: 'run-3' }),
    ])

    expect(items).toHaveLength(1)
    expect(responses(items)[0]).toMatchObject({
      id: 'aop:s1:aiscan:turn:run-3:response',
      thinking: 'inspect target',
      response: { content: 'running check' },
      tools: [{ id: 'tc-3', toolName: 'bash', result: 'john', pending: false }],
      streaming: false,
    })
  })

  it('keeps canonical turn ids isolated within one long-lived session', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', {}),
      ev(2, 'turn.start', {}, { turn_id: 'run-1' }),
      ev(3, 'message', {
        message_id: 'm-1', role: 'assistant', parts: [{ type: 'text', text: 'first' }],
      }, { turn_id: 'run-1' }),
      ev(4, 'turn.end', { stop: 'completed' }, { turn_id: 'run-1' }),
      ev(5, 'turn.start', {}, { turn_id: 'run-2' }),
      ev(6, 'message', {
        message_id: 'm-2', role: 'assistant', parts: [{ type: 'text', text: 'second' }],
      }, { turn_id: 'run-2' }),
      ev(7, 'turn.end', { stop: 'completed' }, { turn_id: 'run-2' }),
      ev(8, 'session.end', { reason: 'completed' }),
    ], { lifecycle: 'none' })

    expect(responses(items).map((card) => ({
      id: card.id,
      content: card.response?.content,
      streaming: card.streaming,
    }))).toEqual([
      { id: 'aop:s1:aiscan:turn:run-1:response', content: 'first', streaming: false },
      { id: 'aop:s1:aiscan:turn:run-2:response', content: 'second', streaming: false },
    ])
  })

  it('does not let a late turn end close the newer active turn', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'turn.start', {}, { turn_id: 'run-1' }),
      ev(2, 'message.delta', {
        message_id: 'm-1', part_type: 'reasoning', part_index: 0, delta: 'first',
      }, { turn_id: 'run-1' }),
      ev(3, 'turn.start', {}, { turn_id: 'run-2' }),
      ev(4, 'message.delta', {
        message_id: 'm-2', part_type: 'reasoning', part_index: 0, delta: 'second',
      }, { turn_id: 'run-2' }),
      ev(5, 'turn.end', { stop: 'completed' }, { turn_id: 'run-1' }),
    ], { streaming: true, lifecycle: 'none' })

    expect(responses(items)).toHaveLength(2)
    expect(responses(items)[0]).toMatchObject({ thinking: 'first', streaming: false })
    expect(responses(items)[1]).toMatchObject({ thinking: 'second', streaming: true })
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

  it('maps namespaced status extensions to extension items', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'status', { state: 'eval_end' }, {
        ext: { eval: { round: 1, max_rounds: 3, pass: true, reason: 'criteria met' } },
      }),
      ev(2, 'status', { state: 'compact_end' }, {
        ext: { compact: { tokens_before: 100, tokens_after: 40, kept_messages: 3 } },
      }),
      ev(3, 'status', { state: 'token_budget_warning' }, {
        ext: { aop: { context_tokens: 90, token_budget: 100 } },
      }),
    ])
    expect(items.map((i) => i.kind)).toEqual(['extension', 'extension', 'extension'])
    expect(items[0]).toMatchObject({
      extensionType: 'eval',
      data: { round: 1, pass: true, reason: 'criteria met' },
    })
    expect(items[1]).toMatchObject({ extensionType: 'compact', data: { tokens_before: 100, tokens_after: 40, kept_messages: 3 } })
    expect(items[2]).toMatchObject({ extensionType: 'token_budget', data: { context_tokens: 90, token_budget: 100 } })
  })

  it('normalizes legacy eval status extensions to one-based rounds', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'status', { state: 'eval_end' }, {
        ext: { aiscan: { eval_round: 0, eval_pass: true, eval_reason: 'legacy pass' } },
      }),
      ev(2, 'status', { state: 'eval_error' }, {
        ext: { aiscan: { eval_round: 1, eval_error: 'legacy error' } },
      }),
    ])
    expect(items[0]).toMatchObject({
      extensionType: 'eval',
      data: { round: 1, pass: true, reason: 'legacy pass' },
    })
    expect(items[1]).toMatchObject({
      extensionType: 'eval',
      data: { round: 2, pass: false, reason: 'legacy error' },
    })
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

  it('keeps completed history closed while another session is busy', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', {}),
      ev(2, 'message', { message_id: 'a-1', role: 'assistant', parts: [{ type: 'text', text: 'done' }] }),
      ev(3, 'session.end', { stop: 'completed', turns: 1 }),
    ], { streaming: true })
    expect(responses(items)[0].streaming).toBe(false)
  })

  it('can hide routine lifecycle while preserving failed session ends', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', {}),
      ev(2, 'session.end', { stop: 'error', error: 'boom' }),
    ], { lifecycle: 'errors' })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'divider', variant: 'warning', label: 'Session ended: boom' })
  })

  it('keeps a result-before-call tool complete and carries its error state', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'tool.result', { tool_call_id: 'tc-1', tool_name: 'bash', content: 'failed', is_error: true }),
      ev(2, 'tool.call', { tool_call_id: 'tc-1', tool_name: 'bash', args: { command: 'exit 1' } }),
    ])
    expect(responses(items)[0].tools[0]).toMatchObject({
      id: 'tc-1', result: 'failed', pending: false, error: true,
    })
  })

  it('drops an empty turn when its session ends', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'session.start', {}),
      ev(2, 'turn.start', { turn: 1 }),
      ev(3, 'turn.end', { turn: 1 }),
      ev(4, 'session.end', { stop: 'completed', turns: 1 }),
    ], { lifecycle: 'none' })
    expect(items).toEqual([])
  })

  it('caps large tool results before they reach the renderer', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'tool.result', { tool_call_id: 'tc-large', tool_name: 'read', content: 'x'.repeat(120_000) }),
    ])
    const result = responses(items)[0].tools[0].result || ''
    expect(result.length).toBeLessThan(101_000)
    expect(result).toContain('characters omitted')
  })
})
