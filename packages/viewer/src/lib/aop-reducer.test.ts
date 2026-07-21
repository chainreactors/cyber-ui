import { describe, expect, it } from 'vitest'

import type { AOPEvent } from '@cyber/agent-protocol'
import { reduceAOPToTimeline } from './aop-reducer'
import type { MessageTimelineItem, ToolCallTimelineItem } from '../types/timeline'

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

  it('merges deltas by message_id and lets the final message replace them', () => {
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
    const msgs = messages(items)
    expect(msgs).toHaveLength(2)
    const thinking = msgs.find((m) => m.role === 'thinking')
    const answer = msgs.find((m) => m.role === 'assistant')
    expect(thinking).toMatchObject({ content: 'think-hard', streaming: false })
    expect(answer).toMatchObject({ content: 'ans-wer', streaming: false })
  })

  it('replays idempotently: seq duplicates are suppressed, final message upserts', () => {
    const stream = [
      ev(1, 'message.delta', { message_id: 'm-1', part_type: 'text', part_index: 0, delta: 'hel' }),
      ev(2, 'message', { message_id: 'm-1', role: 'assistant', parts: [{ type: 'text', text: 'hello' }] }),
    ]
    const once = reduceAOPToTimeline(stream)
    const twice = reduceAOPToTimeline([...stream, ...stream])
    expect(messages(twice)).toHaveLength(messages(once).length)
    expect(messages(twice)[0].content).toBe('hello')
  })

  it('pairs tool.call with tool.result', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'tool.call', { tool_call_id: 'tc-1', tool_name: 'bash', args: { command: 'ls' } }),
      ev(2, 'tool.result', { tool_call_id: 'tc-1', tool_name: 'bash', content: 'ok' }),
    ])
    expect(items).toHaveLength(1)
    const tool = items[0] as ToolCallTimelineItem
    expect(tool.kind).toBe('tool_call')
    expect(tool.toolCall).toMatchObject({ id: 'tc-1', toolName: 'bash', pending: false, result: 'ok' })
  })

  it('keeps user and assistant messages in stream order and attaches usage', () => {
    const items = reduceAOPToTimeline([
      ev(1, 'message', { message_id: 'u-1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }),
      ev(2, 'message', { message_id: 'a-1', role: 'assistant', parts: [{ type: 'text', text: 'yo' }] }),
      ev(3, 'usage', { input_tokens: 10, output_tokens: 5, total_tokens: 15, model: 'm' }),
    ])
    const msgs = messages(items)
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect((msgs[1].metadata?.usage as Record<string, unknown>)?.total_tokens).toBe(15)
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
    expect(msgs[0]).toMatchObject({ role: 'system', content: 'slow down' })
    expect(msgs[0].metadata).toMatchObject({ code: 'rate_limit', retryable: true })
    expect(msgs[1]).toMatchObject({ role: 'assistant', content: 'recovered' })
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
    const msgs = messages(items)
    expect(msgs).toHaveLength(2)
    expect(msgs.map((m) => m.content)).toEqual(['from s1', 'from s2'])
  })

  it('marks the last assistant message as streaming when requested', () => {
    const items = reduceAOPToTimeline(
      [ev(1, 'message', { message_id: 'a-1', role: 'assistant', parts: [{ type: 'text', text: 'hi' }] })],
      { streaming: true },
    )
    expect(messages(items)[0].streaming).toBe(true)
  })
})
