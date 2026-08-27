import { describe, expect, it } from 'vitest'
import { resolveToolResultFormat } from './tool-result-format'

describe('resolveToolResultFormat', () => {
  it('prefers structured JSON and keeps a formatted copy payload', () => {
    expect(resolveToolResultFormat('', '{"ok":true,"items":[1,2]}')).toEqual({
      kind: 'code',
      language: 'json',
      code: '{\n  "ok": true,\n  "items": [\n    1,\n    2\n  ]\n}',
    })
  })

  it('uses the request path when the response is a file body', () => {
    expect(resolveToolResultFormat('{"path":"notes.md"}', '# Notes\n\n- one')).toEqual({ kind: 'markdown' })
    expect(resolveToolResultFormat('{"path":"main.py"}', 'def main():\n    return 0')).toEqual({
      kind: 'code',
      language: 'python',
    })
  })

  it('uses highlight.js auto-detection for unlabelled source', () => {
    expect(resolveToolResultFormat('', 'def greet(name):\n    return f"Hello {name}"')).toEqual({
      kind: 'code',
      language: 'python',
    })
    expect(resolveToolResultFormat('', 'request completed\nexit code: 0')).toEqual({ kind: 'text' })
  })
})
