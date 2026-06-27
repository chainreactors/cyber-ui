import type { CSSProperties } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useResolvedTheme } from '../../lib/use-resolved-theme'

interface Props {
  content: string
  className?: string
  isDark?: boolean
}

interface PromptSection {
  tag: string
  content: string
}

const colorMap: Record<string, { dark: string; light: string }> = {
  'node-name':   { dark: '#60a5fa', light: '#2563eb' },
  'goal':        { dark: '#4ade80', light: '#16a34a' },
  'output':      { dark: '#22d3ee', light: '#0891b2' },
  'input':       { dark: '#fbbf24', light: '#d97706' },
  'branches':    { dark: '#a78bfa', light: '#7c3aed' },
  'rules':       { dark: '#f87171', light: '#dc2626' },
  'examples':    { dark: '#facc15', light: '#ca8a04' },
  'context':     { dark: '#818cf8', light: '#4f46e5' },
  'guardrail':   { dark: '#f87171', light: '#dc2626' },
  'fallback':    { dark: '#fb923c', light: '#ea580c' },
  'user-intent': { dark: '#2dd4bf', light: '#0d9488' },
  'dialectics':  { dark: '#c084fc', light: '#9333ea' },
  'history':     { dark: '#9ca3af', light: '#6b7280' },
}

const labels: Record<string, string> = {
  'node-name': 'Node', 'goal': 'Goal', 'output': 'Output Schema',
  'input': 'Input Schema', 'branches': 'Branches', 'rules': 'Rules',
  'examples': 'Examples', 'context': 'Context', 'guardrail': 'Guardrail',
  'fallback': 'Fallback', 'user-intent': 'User Intent',
  'dialectics': 'Dialectics', 'history': 'History',
}

export default function PromptContent({ content, isDark: isDarkProp }: Props) {
  const isDark = useResolvedTheme(isDarkProp)

  if (!content || !content.trim()) {
    return <span style={{ color: isDark ? '#4b5563' : '#9ca3af' }}>Empty</span>
  }

  const sections = parsePromptXml(content)

  if (sections.length === 0) {
    return (
      <pre style={{
        whiteSpace: 'pre-wrap', fontSize: 12, fontFamily: 'monospace',
        color: isDark ? '#d1d5db' : '#4b5563', margin: 0,
      }}>
        {content}
      </pre>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sections.map((section, i) => (
        <PromptSectionView key={i} tag={section.tag} content={section.content} />
      ))}
    </div>
  )
}

function PromptSectionView({ tag, content }: { tag: string; content: string }) {
  const isDark = useResolvedTheme()
  const trimmed = content.trim()
  if (!trimmed) return null

  const colors = colorMap[tag] ?? { dark: '#9ca3af', light: '#6b7280' }
  const labelColor = isDark ? colors.dark : colors.light
  const borderColor = isDark
    ? `${colors.dark}40`
    : `${colors.light}30`

  const label = labels[tag] ?? tag
  const isCode = /^(from |import |class |Model code|Models:)/m.test(trimmed)
  const hlStyle = isDark ? oneDark : oneLight

  const wrapStyle: CSSProperties = {
    borderRadius: 4,
    border: `1px solid ${borderColor}`,
    overflow: 'hidden',
  }

  const hdrStyle: CSSProperties = {
    padding: '4px 8px',
    borderBottom: `1px solid ${isDark ? 'rgba(31,41,55,0.3)' : '#e5e7eb'}`,
    background: isDark ? 'rgba(31,41,55,0.4)' : '#f9fafb',
  }

  return (
    <div style={wrapStyle}>
      <div style={hdrStyle}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: labelColor }}>
          {label}
        </span>
      </div>
      <div style={{ padding: '6px 8px' }}>
        {isCode ? (
          <SyntaxHighlighter
            language="python"
            style={hlStyle}
            customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.7rem', background: 'transparent', borderRadius: 0 }}
          >
            {trimmed}
          </SyntaxHighlighter>
        ) : (
          <pre style={{
            whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.5, margin: 0,
            color: isDark ? '#d1d5db' : '#4b5563',
          }}>
            {trimmed}
          </pre>
        )}
      </div>
    </div>
  )
}

function parsePromptXml(xml: string): PromptSection[] {
  const sections: PromptSection[] = []
  let inner = xml.trim()
  const promptMatch = inner.match(/<prompt>\s*([\s\S]*?)\s*<\/prompt>/)
  if (promptMatch) {
    inner = promptMatch[1]
  }
  const tagRegex = /<([\w-]+)>\s*([\s\S]*?)\s*<\/\1>/g
  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(inner)) !== null) {
    const tag = match[1]
    const content = match[2]
    if (tag === 'system' || tag === 'role' || tag === 'guidance') continue
    sections.push({ tag, content })
  }
  return sections
}
