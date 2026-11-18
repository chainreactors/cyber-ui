import { create, fromBinary, toBinary, type MessageInitShape } from '@bufbuild/protobuf'
import { anyPack } from '@bufbuild/protobuf/wkt'
import { describe, expect, it } from 'vitest'
import { ArtifactSchema, CompletedSchema, Correlation, EventSchema, FileAccessSchema, RefSchema, StartedSchema, TrafficFlowSchema, type Event } from '@cyber/aop'
import { createAOPTimelineReducer } from './aop-reducer'
import { createObservationReducer, observation, observationActivity, observationKind } from './observations'

function event(id: string, payload: MessageInitShape<typeof EventSchema>['payload'], scope: Partial<Pick<Event, 'sessionId' | 'emitter' | 'turnId' | 'extensions'>> = {}): Event {
  return create(EventSchema, { id, sessionId: 'session', emitter: 'node', turnId: 'turn', payload, ...scope })
}
function flow(id: string, callId = 'call', scope: Partial<Event> = {}) {
  return event(id, { case: 'extension', value: anyPack(TrafficFlowSchema, create(TrafficFlowSchema, { id, request: { method: 'GET', url: 'https://example.test' } })) }, {
    extensions: [anyPack(RefSchema, create(RefSchema, { callId, correlation: Correlation.EXPLICIT }))], ...scope,
  })
}
const call = () => event('call-event', { case: 'toolCall', value: { id: 'call', name: 'bash' } })

describe('native observations', () => {
  it('summarizes calls and operation phases while preserving all original audit events', () => {
    const started = event('started', { case: 'extension', value: anyPack(StartedSchema, create(StartedSchema, { kind: 'tool', name: 'bash' })) }, { extensions: [anyPack(RefSchema, create(RefSchema, { callId: 'call', operationId: 'call', correlation: Correlation.EXPLICIT }))] })
    const result = event('result', { case: 'toolResult', value: { callId: 'call', name: 'bash' } })
    const command = event('command-start', { case: 'extension', value: anyPack(StartedSchema, create(StartedSchema, { kind: 'command', name: 'scan' })) }, { extensions: [anyPack(RefSchema, create(RefSchema, { operationId: 'command' }))] })
    const complete = event('command-end', { case: 'extension', value: anyPack(CompletedSchema, create(CompletedSchema, { kind: 'command', name: 'scan' })) }, { extensions: command.extensions })
    const events = [call(), started, command, flow('http'), complete, result]
    const records = createObservationReducer()(events)
    expect(records).toHaveLength(6)
    expect(observationActivity(records)).toEqual([events[3], complete, result])
    expect(observationActivity([complete, command, result, events[0]])).toEqual([complete, result])
    expect(records).toEqual(events)
    expect(observationActivity(records).every(item => events.includes(item))).toBe(true)
  })

  it('retains failures and unattributed or different nested tools instead of hiding them', () => {
    const operation = (id: string, name: string, correlation: Correlation, failed = false) => event(id, {
      case: 'extension', value: anyPack(CompletedSchema, create(CompletedSchema, { kind: 'tool', name, failure: failed ? { message: 'failed' } : undefined })),
    }, { extensions: [anyPack(RefSchema, create(RefSchema, { callId: 'call', operationId: id, correlation }))] })
    const mirror = operation('mirror', 'bash', Correlation.EXPLICIT)
    const failure = operation('failure', 'bash', Correlation.EXPLICIT, true)
    const child = operation('child', 'curl', Correlation.EXPLICIT)
    const unlinked = operation('unlinked', 'bash', Correlation.UNATTRIBUTED)
    expect(observationActivity([call(), mirror, failure, child, unlinked])).toEqual([call(), failure, child, unlinked])
    expect(observationActivity([mirror, failure, child, unlinked], 'bash')).toEqual([failure, child, unlinked])
  })

  it.each([{ sessionId: 'other' }, { emitter: 'other' }, { turnId: 'other' }])('keeps activity call IDs isolated across %j', scope => {
    const first = call(), second = event('other-result', { case: 'toolResult', value: { callId: 'call', name: 'bash' } }, scope)
    expect(observationActivity([first, second])).toEqual([first, second])
  })

  it('attaches a late observation once and preserves the previous tool snapshot', () => {
    const reduce = createAOPTimelineReducer({ lifecycle: 'none' })
    const tool = call(), capture = fromBinary(EventSchema, toBinary(EventSchema, flow('flow')))
    const before = reduce([tool])
    const after = reduce([tool, capture, capture])
    expect(after).toHaveLength(1)
    if (after[0].kind !== 'assistant_response' || before[0].kind !== 'assistant_response') throw new Error('missing response')
    expect(before[0].tools[0].observations).toBeUndefined()
    expect(after[0].tools[0].observations).toEqual([capture])
    expect(after[0].tools[0].observations![0]).toBe(capture)
    expect(observation(capture)).toBe(observation(capture))
  })

  it('moves an observation received before its tool into that tool', () => {
    const reduce = createAOPTimelineReducer({ lifecycle: 'none' }), capture = flow('early')
    expect(reduce([capture])[0]).toMatchObject({ kind: 'extension', event: capture })
    const result = reduce([capture, call()])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ kind: 'assistant_response', tools: [{ observations: [capture] }] })
  })

  it.each([{ sessionId: 'other' }, { emitter: 'other' }, { turnId: 'other' }])('isolates reused IDs across %j', scope => {
    const reduce = createAOPTimelineReducer({ lifecycle: 'none' }), own = flow('flow'), other = flow(scope.turnId ? 'flow-other' : 'flow', 'call', scope)
    const result = reduce([call(), own, other])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ tools: [{ observations: [own] }] })
    expect(result[1]).toMatchObject({ kind: 'extension', event: other })
  })

  it('keeps unattributed traffic separate even while a tool runs', () => {
    const capture = flow('unattributed', 'call', { extensions: [anyPack(RefSchema, create(RefSchema, { callId: 'call', correlation: Correlation.UNATTRIBUTED }))] })
    const result = createAOPTimelineReducer({ lifecycle: 'none' })([call(), capture])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ tools: [{ pending: true }] })
    expect(result[1]).toMatchObject({ kind: 'extension', event: capture })
  })

  it('indexes all mechanisms as original events and resets on history replacement', () => {
    const records = [
      call(), flow('http'),
      event('file', { case: 'extension', value: anyPack(FileAccessSchema, create(FileAccessSchema, { path: 'report.txt' })) }),
      event('record', { case: 'toolResult', value: { callId: 'record', name: 'record' } }),
      event('asset', { case: 'extension', value: anyPack(ArtifactSchema, create(ArtifactSchema, { tool: 'gogo' })) }),
      ...['command', 'process'].map(kind => event(kind, { case: 'extension', value: anyPack(CompletedSchema, create(CompletedSchema, { kind, name: 'work' })) })),
      event('other', { case: 'extension', value: { typeUrl: 'test/unknown', value: new Uint8Array([1, 2]) } }),
    ]
    expect(records.map(observationKind)).toEqual(['tool', 'traffic', 'file', 'record', 'cstx', 'command', 'process', 'other'])
    const reduce = createObservationReducer(), first = reduce(records)
    expect(first.every((record, index) => record === records[index])).toBe(true)
    expect(reduce([...records, records[0]])).toBe(first)
    expect(reduce([...records, records[0], event('text', { case: 'message', value: { role: 'user' } })])).toBe(first)
    const replacement = flow('new', '', { sessionId: 'new' })
    expect(reduce([replacement])).toEqual([replacement])
  })
})
