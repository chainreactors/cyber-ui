import { useState, type CSSProperties } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Terminal,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { useResolvedTheme } from '../../lib/use-resolved-theme'

interface Props {
  kind: 'tool-call' | 'tool-return'
  toolName: string
  content: string
  toolCallId?: string
  rawContent?: Record<string, unknown>
  isDark?: boolean
}

const themes = {
  dark: {
    python:  { border: '#78350f66', bg: 'rgba(69,26,3,0.3)',  text: '#fbbf24' },
    call:    { border: '#312e8166', bg: 'rgba(49,46,129,0.3)', text: '#818cf8' },
    ret:     { border: '#115e5966', bg: 'rgba(17,94,89,0.3)',  text: '#2dd4bf' },
    id: '#4b5563', chevron: '#6b7280',
    summaryText: '#6b7280', summaryBorder: 'rgba(31,41,55,0.3)',
    divider: 'rgba(31,41,55,0.3)', agent: '#d1d5db',
    stdout:  { border: 'rgba(22,101,52,0.3)', hdrBg: 'rgba(5,46,22,0.3)', hdrBorder: 'rgba(22,101,52,0.2)', pre: '#e5e7eb' },
    stderr:  { border: 'rgba(113,63,18,0.3)', hdrBg: 'rgba(69,26,3,0.3)', hdrBorder: 'rgba(113,63,18,0.2)', pre: '#fde68a' },
    error:   { border: 'rgba(127,29,29,0.4)', hdrBg: 'rgba(69,10,10,0.4)', hdrBorder: 'rgba(127,29,29,0.3)', val: '#fca5a5', frameTxt: 'rgba(254,202,202,0.7)', frameBorder: 'rgba(127,29,29,0.2)' },
    result:  { border: 'rgba(22,78,99,0.3)', hdrBg: 'rgba(8,51,68,0.3)', hdrBorder: 'rgba(22,78,99,0.2)' },
    codeBg: 'rgba(0,0,0,0.3)',
    lineNum: '#4b5563',
  },
  light: {
    python:  { border: '#fde68a', bg: '#fffbeb',  text: '#d97706' },
    call:    { border: '#c7d2fe', bg: '#eef2ff', text: '#4f46e5' },
    ret:     { border: '#99f6e4', bg: '#f0fdfa',  text: '#0d9488' },
    id: '#9ca3af', chevron: '#9ca3af',
    summaryText: '#6b7280', summaryBorder: '#e5e7eb',
    divider: '#e5e7eb', agent: '#4b5563',
    stdout:  { border: '#bbf7d0', hdrBg: '#f0fdf4', hdrBorder: '#bbf7d0', pre: '#1f2937' },
    stderr:  { border: '#fde68a', hdrBg: '#fffbeb', hdrBorder: '#fde68a', pre: '#92400e' },
    error:   { border: '#fecaca', hdrBg: '#fef2f2', hdrBorder: '#fecaca', val: '#dc2626', frameTxt: '#f87171', frameBorder: '#fee2e2' },
    result:  { border: '#a5f3fc', hdrBg: '#ecfeff', hdrBorder: '#a5f3fc' },
    codeBg: 'rgba(0,0,0,0.03)',
    lineNum: '#9ca3af',
  },
}

const iconSm: CSSProperties = { width: 12, height: 12, flexShrink: 0 }

export default function ToolCallDisplay({ kind, toolName, content, toolCallId, rawContent, isDark: isDarkProp }: Props) {
  const [expanded, setExpanded] = useState(true)
  const isDark = useResolvedTheme(isDarkProp)
  const s = themes[isDark ? 'dark' : 'light']
  const hlStyle = isDark ? oneDark : oneLight
  const isCall = kind === 'tool-call'
  const Chevron = expanded ? ChevronDown : ChevronRight

  const wrap = (border: string): CSSProperties => ({
    borderRadius: 6, border: `1px solid ${border}`, overflow: 'hidden',
  })

  const hdrBtn = (bg: string): CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 12px', background: bg, border: 'none', cursor: 'pointer',
    transition: 'filter 0.15s',
  })

  if (isCall) {
    const isPythonExec = toolName === 'python_exec' || rawContent?.code != null

    if (isPythonExec) {
      const code = rawContent?.code as string ?? content
      const firstLine = code.split('\n')[0].slice(0, 80)
      const c = s.python

      return (
        <div style={wrap(c.border)}>
          <button onClick={() => setExpanded(!expanded)} style={hdrBtn(c.bg)}>
            <Code2 style={{ ...iconSm, color: c.text }} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: c.text }}>python_exec</span>
            {toolCallId && (
              <span style={{ fontSize: 9, color: s.id, marginLeft: 'auto', marginRight: 4, fontFamily: 'monospace' }}>{toolCallId.slice(0, 8)}</span>
            )}
            <Chevron style={{ ...iconSm, color: s.chevron }} />
          </button>
          {!expanded && (
            <div style={{ padding: '4px 12px', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderTop: `1px solid ${s.summaryBorder}`, color: s.summaryText }}>{firstLine}</div>
          )}
          {expanded && (
            <div style={{ borderTop: `1px solid ${s.divider}`, maxHeight: 288, overflowY: 'auto' }}>
              <SyntaxHighlighter
                language="python"
                style={hlStyle}
                customStyle={{ margin: 0, padding: '0.75rem', fontSize: '0.75rem', background: s.codeBg, borderRadius: 0 }}
                showLineNumbers
                lineNumberStyle={{ color: s.lineNum, fontSize: '0.65rem', minWidth: '2em' }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )
    }

    // Other tool calls
    const jsonStr = typeof rawContent === 'object' ? JSON.stringify(rawContent, null, 2) : content
    const cc = s.call

    return (
      <div style={wrap(cc.border)}>
        <button onClick={() => setExpanded(!expanded)} style={hdrBtn(cc.bg)}>
          <CheckCircle2 style={{ ...iconSm, color: cc.text }} />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: cc.text }}>{toolName}</span>
          {toolCallId && (
            <span style={{ fontSize: 9, color: s.id, marginLeft: 'auto', marginRight: 4, fontFamily: 'monospace' }}>{toolCallId.slice(0, 8)}</span>
          )}
          <Chevron style={{ ...iconSm, color: s.chevron }} />
        </button>
        {expanded && (
          <div style={{ borderTop: `1px solid ${s.divider}`, maxHeight: 288, overflowY: 'auto' }}>
            <SyntaxHighlighter
              language="json"
              style={hlStyle}
              customStyle={{ margin: 0, padding: '0.75rem', fontSize: '0.75rem', background: s.codeBg, borderRadius: 0 }}
            >
              {jsonStr}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    )
  }

  // Tool return — render structured BlockingOutput
  const raw = rawContent ?? {}
  const stdout = raw.stdout as string | undefined
  const stderr = raw.stderr as string | undefined
  const result = raw.result
  const tb = raw.traceback as Record<string, unknown> | undefined

  const hasStdout = stdout && stdout.trim()
  const hasStderr = stderr && stderr.trim()
  const hasTb = !!tb
  const hasResult = result != null

  const summary = hasTb
    ? `Error: ${(tb.exc_type as string) ?? 'Exception'}`
    : hasStdout
      ? stdout.trim().split('\n')[0].slice(0, 80)
      : hasResult
        ? String(typeof result === 'string' ? result : JSON.stringify(result)).slice(0, 80)
        : '(no output)'

  const rc = s.ret

  return (
    <div style={wrap(rc.border)}>
      <button onClick={() => setExpanded(!expanded)} style={hdrBtn(rc.bg)}>
        <Terminal style={{ ...iconSm, color: rc.text }} />
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: rc.text }}>Return</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: s.agent }}>{toolName}</span>
        {toolCallId && (
          <span style={{ fontSize: 9, color: s.id, marginLeft: 'auto', marginRight: 4, fontFamily: 'monospace' }}>{toolCallId.slice(0, 8)}</span>
        )}
        <Chevron style={{ ...iconSm, color: s.chevron }} />
      </button>

      {!expanded && (
        <div style={{ padding: '4px 12px', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderTop: `1px solid ${s.summaryBorder}`, color: s.summaryText }}>{summary}</div>
      )}

      {expanded && (
        <div style={{ borderTop: `1px solid ${s.divider}`, display: 'flex', flexDirection: 'column', gap: 6, padding: 8 }}>
          {hasTb && (
            <div style={{ borderRadius: 4, border: `1px solid ${s.error.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: `1px solid ${s.error.hdrBorder}`, background: s.error.hdrBg }}>
                <AlertTriangle style={{ width: 12, height: 12, color: '#f87171' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#f87171' }}>
                  {(tb!.exc_type as string) ?? 'Error'}
                </span>
              </div>
              <div style={{ padding: '6px 8px', fontSize: 12, color: s.error.val }}>
                {tb!.exc_value as string}
              </div>
              {Array.isArray(tb!.frames) && (tb!.frames as unknown[]).length > 0 && (
                <pre style={{ padding: '6px 8px', fontSize: 10, fontFamily: 'monospace', borderTop: `1px solid ${s.error.frameBorder}`, overflowX: 'auto', color: s.error.frameTxt, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {(tb!.frames as Array<Record<string, unknown>>).map((f) =>
                    `  ${f.filename}:${f.lineno} in ${f.name}\n    ${f.line ?? ''}\n`
                  ).join('')}
                </pre>
              )}
            </div>
          )}

          {hasStdout && (
            <div style={{ borderRadius: 4, border: `1px solid ${s.stdout.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: `1px solid ${s.stdout.hdrBorder}`, background: s.stdout.hdrBg }}>
                <Terminal style={{ width: 12, height: 12, color: '#4ade80' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#4ade80' }}>stdout</span>
              </div>
              <pre style={{ padding: '6px 8px', fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', maxHeight: 160, whiteSpace: 'pre-wrap', color: s.stdout.pre, margin: 0 }}>
                {stdout!.trim()}
              </pre>
            </div>
          )}

          {hasStderr && (
            <div style={{ borderRadius: 4, border: `1px solid ${s.stderr.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: `1px solid ${s.stderr.hdrBorder}`, background: s.stderr.hdrBg }}>
                <AlertTriangle style={{ width: 12, height: 12, color: '#fbbf24' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#fbbf24' }}>stderr</span>
              </div>
              <pre style={{ padding: '6px 8px', fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', maxHeight: 160, whiteSpace: 'pre-wrap', color: s.stderr.pre, margin: 0 }}>
                {stderr!.trim()}
              </pre>
            </div>
          )}

          {hasResult && (
            <div style={{ borderRadius: 4, border: `1px solid ${s.result.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderBottom: `1px solid ${s.result.hdrBorder}`, background: s.result.hdrBg }}>
                <CheckCircle2 style={{ width: 12, height: 12, color: '#22d3ee' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#22d3ee' }}>result</span>
              </div>
              <div style={{ maxHeight: 192, overflowY: 'auto' }}>
                <SyntaxHighlighter
                  language="json"
                  style={hlStyle}
                  customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.75rem', background: 'transparent', borderRadius: 0 }}
                >
                  {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          {!hasTb && !hasStdout && !hasStderr && !hasResult && (
            <div style={{ padding: '6px 8px', fontSize: 12, color: '#6b7280' }}>(no output)</div>
          )}
        </div>
      )}
    </div>
  )
}
