import { describe, expect, it } from 'vitest'
import {
  decodeLegacyPTYData,
  encodeLegacyPTYData,
  parseLegacyPTYFrame,
} from './legacy-pty'

describe('legacy PTY codec', () => {
  it('accepts known JSON frames and rejects malformed input', () => {
    expect(parseLegacyPTYFrame('{"type":"opened","stream_id":"term-1"}')).toEqual({
      type: 'opened',
      stream_id: 'term-1',
    })
    expect(parseLegacyPTYFrame('{"type":"unknown"}')).toBeNull()
    expect(parseLegacyPTYFrame('[]')).toBeNull()
    expect(parseLegacyPTYFrame('{')).toBeNull()
  })

  it('round-trips UTF-8 terminal data through the legacy base64 field', () => {
    const value = 'pwd\r\n中文\n'
    expect(decodeLegacyPTYData(encodeLegacyPTYData(value))).toBe(value)
  })

  it('treats malformed output data as empty', () => {
    expect(decodeLegacyPTYData()).toBe('')
    expect(decodeLegacyPTYData('%%%')).toBe('')
  })
})
