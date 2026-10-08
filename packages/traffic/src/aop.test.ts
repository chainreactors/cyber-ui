import { create } from '@bufbuild/protobuf'
import { anyPack } from '@bufbuild/protobuf/wkt'
import { EventSchema, TrafficFlowSchema, type Event } from '@cyber/aop'
import { describe, expect, it } from 'vitest'
import { createTrafficFlowReducer } from './aop'
import { aopFlowToHttpView } from './adapters'

function captured(id: string, sessionId = 's1', flowId = id): Event {
  return create(EventSchema, { id, sessionId, emitter: 'node', payload: { case: 'extension', value: anyPack(TrafficFlowSchema, create(TrafficFlowSchema, {
    id: flowId, complete: true, request: { method: 'POST', url: 'https://example.test/api?q=1', protocol: 'HTTP/1.1', body: new TextEncoder().encode('请求'), headers: [{ name: 'X-Test', value: 'one' }, { name: 'X-Test', value: 'two' }] },
    response: { statusCode: 201, reasonPhrase: 'Created', body: new TextEncoder().encode('{"ok":true}') },
  })) } })
}

describe('native traffic observations', () => {
  it('deduplicates replay, retains scoped flow IDs, and replaces a changed history', () => {
    const reduce = createTrafficFlowReducer()
    const first = captured('e1', 's1', 'same-flow')
    const second = captured('e1', 's2', 'same-flow')
    expect(reduce([first, first, second])).toHaveLength(2)
    const updated = captured('e2', 's1', 'same-flow')
    updated.payload.case === 'extension' && (updated.payload.value = anyPack(TrafficFlowSchema, create(TrafficFlowSchema, { id: 'same-flow', error: 'connection reset' })))
    expect(reduce([first, first, second, updated])[0].error).toBe('connection reset')
    expect(reduce([second])).toHaveLength(1)
    expect(reduce([])).toEqual([])
  })

  it('ignores unrelated or malformed events and preserves the cached snapshot', () => {
    const reduce = createTrafficFlowReducer()
    const first = captured('e1')
    const snapshot = reduce([first])
    const unrelated = create(EventSchema, { id: 'e2', payload: { case: 'extension', value: anyPack(EventSchema, first) } })
    const malformed = create(EventSchema, { payload: { case: 'extension', value: { typeUrl: 'type.googleapis.com/aop.traffic.Flow', value: new Uint8Array([255]) } } })
    expect(reduce([first, unrelated, malformed, create(EventSchema)])).toBe(snapshot)
  })

  it('preserves duplicate headers, Unicode bodies, partial errors and binary bytes', () => {
    const flow = create(TrafficFlowSchema, {
      id: 'f1', error: 'body interrupted', request: { method: 'POST', url: 'https://example.test/api?q=1', protocol: 'HTTP/1.1', headers: [{ name: 'X-Test', value: 'one' }, { name: 'X-Test', value: 'two' }], body: new TextEncoder().encode('请求') },
      response: { statusCode: 206, body: new Uint8Array([0, 255, 17]) },
    })
    const view = aopFlowToHttpView(flow)
    expect(view.request.headers).toEqual([['X-Test', 'one'], ['X-Test', 'two']])
    expect(view.request.requestTarget).toBe('/api?q=1')
    expect(view.request.body).toBe('请求')
    expect(view.response?.body).toContain('00 ff 11')
    expect(view.error).toBe('body interrupted')
    expect(view.durationMs).toBe(-1)
    expect(flow.response?.body).toEqual(new Uint8Array([0, 255, 17]))
    flow.response!.body = new TextEncoder().encode('a'.repeat(128 * 1024 + 5))
    expect(aopFlowToHttpView(flow).response?.body).toContain('[5 bytes omitted]')
  })
})
