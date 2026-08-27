import { describe, expect, it } from 'vitest'
import { extractShellCommand, summarizeResult, summarizeToolCall } from './tool-utils'

describe('extractShellCommand', () => {
  it('reads current and legacy shell request shapes', () => {
    expect(extractShellCommand('{"command":"printf hello"}')).toBe('printf hello')
    expect(extractShellCommand('"printf world"')).toBe('printf world')
    expect(extractShellCommand('printf legacy')).toBe('printf legacy')
  })

  it('leaves unrelated structured requests for the JSON fallback', () => {
    expect(extractShellCommand('{"path":"README.md"}')).toBeUndefined()
  })
})

describe('summarizeResult', () => {
  it('strips terminal control sequences and collapses a failure to one line', () => {
    expect(summarizeResult('\u001b[31mrequest failed\u001b[0m\nconnection reset')).toBe(
      'request failed connection reset',
    )
  })

  it('bounds the collapsed header summary', () => {
    const summary = summarizeResult('x'.repeat(300))
    expect(summary).toHaveLength(240)
    expect(summary.endsWith('…')).toBe(true)
  })

  it('prioritizes the concrete error and has an explicit missing-detail fallback', () => {
    expect(summarizeToolCall('{"url":"https://example.test"}', 'connection reset', false, true)).toBe(
      'connection reset',
    )
    expect(summarizeToolCall('', undefined, false, true)).toBe('No failure details returned')
  })
})
