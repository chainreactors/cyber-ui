import { useState, type CSSProperties } from 'react'
import { ChevronDown, ChevronRight, User, Bot } from 'lucide-react'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { MarkdownContent } from '@aspect/markdown'

interface Props {
  kind: 'user' | 'assistant'
  agentName: string
  content: string
  timestamp: string
  isDark?: boolean
}

const themes = {
  dark: {
    user:      { border: '#1e3a5f', bg: 'rgba(30,58,95,0.3)', text: '#60a5fa' },
    assistant: { border: '#4c1d95', bg: 'rgba(76,29,149,0.3)', text: '#a78bfa' },
    agent: '#d1d5db', time: '#4b5563', chevron: '#6b7280',
    summaryText: '#6b7280', summaryBorder: 'rgba(31,41,55,0.3)',
    bodyText: '#e5e7eb', bodyBorder: 'rgba(31,41,55,0.3)',
  },
  light: {
    user:      { border: '#bfdbfe', bg: '#eff6ff', text: '#2563eb' },
    assistant: { border: '#ddd6fe', bg: '#f5f3ff', text: '#7c3aed' },
    agent: '#4b5563', time: '#9ca3af', chevron: '#9ca3af',
    summaryText: '#6b7280', summaryBorder: '#e5e7eb',
    bodyText: '#374151', bodyBorder: '#e5e7eb',
  },
}

export default function MessageBubble({ kind, agentName, content, timestamp, isDark: isDarkProp }: Props) {
  const [expanded, setExpanded] = useState(true)
  const isDark = useResolvedTheme(isDarkProp)
  const s = themes[isDark ? 'dark' : 'light']
  const c = kind === 'user' ? s.user : s.assistant
  const Chevron = expanded ? ChevronDown : ChevronRight
  const Icon = kind === 'user' ? User : Bot
  const label = kind === 'user' ? 'Prompt' : 'Response'
  const time = new Date(timestamp).toLocaleTimeString()
  const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80)

  const wrapStyle: CSSProperties = {
    borderRadius: 6,
    border: `1px solid ${c.border}`,
    overflow: 'hidden',
  }

  const headerStyle: CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    background: c.bg,
    border: 'none',
    cursor: 'pointer',
    transition: 'filter 0.15s',
  }

  const iconStyle: CSSProperties = { width: 12, height: 12, flexShrink: 0, color: c.text }

  return (
    <div style={wrapStyle}>
      <button onClick={() => setExpanded(!expanded)} style={headerStyle}>
        <Icon style={iconStyle} />
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: c.text }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: s.agent }}>{agentName}</span>
        <span style={{ fontSize: 9, marginLeft: 'auto', marginRight: 4, fontFamily: 'monospace', color: s.time }}>{time}</span>
        <Chevron style={{ width: 12, height: 12, flexShrink: 0, color: s.chevron }} />
      </button>

      {!expanded && (
        <div style={{ padding: '4px 12px', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderTop: `1px solid ${s.summaryBorder}`, color: s.summaryText }}>{firstLine}</div>
      )}

      {expanded && (
        <div style={{ borderTop: `1px solid ${s.bodyBorder}`, padding: '8px 12px', maxHeight: 384, overflowY: 'auto', fontSize: 14, color: s.bodyText }}>
          <MarkdownContent content={content} isDark={isDarkProp} />
        </div>
      )}
    </div>
  )
}
