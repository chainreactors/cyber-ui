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

  it('treats a response as terminal output when the host labels the request a command', () => {
    const table = 'Service Status\n--------------\nnginx      running\nredis      stopped\n\nPORT   STATE\n-----  -----\n80     open'
    expect(resolveToolResultFormat('{"command":"systemctl status"}', table, 'bash')).toEqual({ kind: 'text' })
    // The same body without that statement is source or a document like any other.
    expect(resolveToolResultFormat('{"command":"systemctl status"}', table).kind).not.toBe('text')
  })

  it('never decides the result format from argument key names', () => {
    const report = '# Findings\n\n[detail](https://example.test/report)'
    const python = 'def greet(name):\n    return f"Hello {name}"'
    for (const args of ['{"input":"example"}', '{"script":"example"}', '{"cmd":"example"}']) {
      expect(resolveToolResultFormat(args, report)).toEqual({ kind: 'markdown' })
      expect(resolveToolResultFormat(args, python)).toEqual({ kind: 'code', language: 'python' })
    }
  })
})
