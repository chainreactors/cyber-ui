import { create } from '@bufbuild/protobuf'
import { PtyProtocolMessageSchema } from '@cyber/aop'
import { describe, expect, it } from 'vitest'
import { decodePTYFrame, encodePTYFrame, encodeTerminalData, sessionFromFrame, sessionsFromFrame } from './index'

describe('canonical PTY frames', () => {
  it('round-trips UTF-8 terminal bytes through protobuf', () => {
    const input = "printf '中文\\n'\\n"
    const message = create(PtyProtocolMessageSchema, {
      message: { case: 'input', value: { streamId: '', data: encodeTerminalData(input) } },
    })

    const decoded = decodePTYFrame(encodePTYFrame(message))

    expect(decoded.message.case).toBe('input')
    if (decoded.message.case === 'input') {
      expect(new TextDecoder().decode(decoded.message.value.data)).toBe(input)
    }
  })

  it('reads canonical session response variants', () => {
    const opened = create(PtyProtocolMessageSchema, {
      message: { case: 'opened', value: { streamId: 'term-1', session: { id: 'shell-1', name: 'test' } } },
    })
    const sessions = create(PtyProtocolMessageSchema, {
      message: { case: 'sessions', value: { streamId: 'term-1', sessions: [{ id: 'shell-1' }, { id: '' }] } },
    })

    expect(sessionFromFrame(opened)?.id).toBe('shell-1')
    expect(sessionsFromFrame(sessions).map((session) => session.id)).toEqual(['shell-1'])
  })
})
