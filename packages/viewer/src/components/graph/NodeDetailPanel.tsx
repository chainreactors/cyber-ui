import { useState, type CSSProperties } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { X, GitBranch, Brain, AlertCircle, Route } from 'lucide-react'
import type { APGNodeData } from '../../lib/event-reducer'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { formatTokenCount, formatTokenUsageLong } from '../../lib/token-usage'
import { MarkdownContent } from '@cyber/markdown'
import LoadingPlaceholder from '../shared/LoadingPlaceholder'
import PromptContent from '../shared/PromptContent'

interface Props {
  node: APGNodeData | null
  onClose: () => void
  isDark?: boolean
}

export default function NodeDetailPanel({ node, onClose, isDark: isDarkProp }: Props) {
  const [tab, setTab] = useState<'prompt' | 'output'>('prompt')
  const isDark = useResolvedTheme(isDarkProp)

  if (!node) return null

  const panelStyle: CSSProperties = {
    position: 'absolute', right: 0, top: 0, height: '100%', width: 320,
    backdropFilter: 'blur(8px)', zIndex: 50,
    display: 'flex', flexDirection: 'column',
    borderLeft: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
    background: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
  }

  const headerStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
  }

  const tabBarStyle: CSSProperties = {
    display: 'flex',
    borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
  }

  const tabBtn = (active: boolean): CSSProperties => ({
    flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 500,
    textTransform: 'capitalize', border: 'none', cursor: 'pointer',
    background: 'transparent',
    color: active ? '#60a5fa' : (isDark ? '#6b7280' : '#9ca3af'),
    borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
  })

  const usageLabel = formatTokenUsageLong(node.tokenUsage)

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{
            fontSize: 12, fontWeight: 600, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: isDark ? '#f3f4f6' : '#1f2937',
          }}>
            {node.label}
          </h3>
          <div style={{
            marginTop: 4,
            fontSize: 10,
            color: isDark ? '#9ca3af' : '#6b7280',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {['Step ' + node.step, node.nodeType, usageLabel].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9ca3af' }}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <div style={tabBarStyle}>
        {(['prompt', 'output'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabBtn(tab === t)}>{t}</button>
        ))}
      </div>

      {node.tokenUsage && (
        <div style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          padding: '8px 12px',
          borderBottom: `1px solid ${isDark ? '#1f2937' : '#e5e7eb'}`,
        }}>
          {[
            `Total ${formatTokenCount(node.tokenUsage.totalTokens)}`,
            `In ${formatTokenCount(node.tokenUsage.inputTokens)}`,
            `Out ${formatTokenCount(node.tokenUsage.outputTokens)}`,
          ].map((label) => (
            <span
              key={label}
              style={{
                fontSize: 10,
                padding: '3px 7px',
                borderRadius: 999,
                background: isDark ? 'rgba(59,130,246,0.14)' : '#dbeafe',
                color: isDark ? '#93c5fd' : '#1d4ed8',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, fontSize: 12, color: isDark ? '#d1d5db' : '#4b5563' }}>
        {tab === 'prompt' && (
          node.prompt
            ? <PromptContent content={node.prompt} />
            : (node.status === 'running' || node.status === 'pending')
              ? <LoadingPlaceholder label="Preparing prompt" isDark={isDark} compact />
              : <span style={{ color: '#4b5563' }}>Prompt not captured.</span>
        )}
        {tab === 'output' && (
          node.output
            ? <AgentResponseView output={node.output} />
            : (node.status === 'running' || node.status === 'pending')
              ? <LoadingPlaceholder label="Rendering output" isDark={isDark} compact />
              : <span style={{ color: '#4b5563' }}>Output not available.</span>
        )}
      </div>
    </div>
  )
}

/* ---------- Structured AgentResponse renderer ---------- */

const sectionColors: Record<string, { dark: string; light: string }> = {
  purple: { dark: '#a78bfa', light: '#7c3aed' },
  blue:   { dark: '#60a5fa', light: '#2563eb' },
  red:    { dark: '#f87171', light: '#dc2626' },
  cyan:   { dark: '#22d3ee', light: '#0891b2' },
  gray:   { dark: '#9ca3af', light: '#6b7280' },
}

function AgentResponseView({ output }: { output: Record<string, unknown> }) {
  const isDark = useResolvedTheme()
  const data = output.data as Record<string, unknown> | null
  const branch = output.branch as string | null
  const reasoning = output.reasoning as string | null
  const error = output.error as string | null
  const executionPath = output.execution_path as string[] | undefined
  const hlStyle = isDark ? oneDark : oneLight

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {reasoning && (
        <Section icon={<Brain style={{ width: 12, height: 12, color: isDark ? '#a78bfa' : '#7c3aed' }} />} label="Reasoning" color="purple">
          <MarkdownContent content={reasoning} isDark={isDark} />
        </Section>
      )}
      {branch && (
        <Section icon={<GitBranch style={{ width: 12, height: 12, color: isDark ? '#60a5fa' : '#2563eb' }} />} label="Branch" color="blue">
          <span style={{ fontFamily: 'monospace', color: isDark ? '#93c5fd' : '#2563eb' }}>{branch}</span>
        </Section>
      )}
      {error && (
        <Section icon={<AlertCircle style={{ width: 12, height: 12, color: isDark ? '#f87171' : '#dc2626' }} />} label="Error" color="red">
          <span style={{ color: isDark ? '#fca5a5' : '#dc2626' }}>{error}</span>
        </Section>
      )}
      {data && (
        <Section icon={<span style={{ fontSize: 10, fontWeight: 700, color: isDark ? '#22d3ee' : '#0891b2' }}>{'{}'}</span>} label="Data" color="cyan">
          <SyntaxHighlighter
            language="json"
            style={hlStyle}
            customStyle={{ margin: 0, padding: '0.5rem', fontSize: '0.7rem', background: 'transparent', borderRadius: 0 }}
          >
            {JSON.stringify(data, null, 2)}
          </SyntaxHighlighter>
        </Section>
      )}
      {executionPath && executionPath.length > 0 && (
        <Section icon={<Route style={{ width: 12, height: 12, color: isDark ? '#9ca3af' : '#6b7280' }} />} label="Path" color="gray">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {executionPath.map((p, i) => (
              <span key={i} style={{
                fontSize: 10, fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4,
                background: isDark ? '#1f2937' : '#f3f4f6',
                color: isDark ? '#d1d5db' : '#4b5563',
              }}>
                {p}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ icon, label, color, children }: {
  icon: React.ReactNode; label: string; color: string; children: React.ReactNode
}) {
  const isDark = useResolvedTheme()
  const c = sectionColors[color] ?? sectionColors.gray
  const borderColor = isDark ? `${c.dark}40` : `${c.light}30`

  return (
    <div style={{ borderRadius: 4, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
        borderBottom: `1px solid ${isDark ? 'rgba(31,41,55,0.3)' : '#e5e7eb'}`,
        background: isDark ? 'rgba(31,41,55,0.4)' : '#f9fafb',
      }}>
        {icon}
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: isDark ? '#9ca3af' : '#6b7280' }}>{label}</span>
      </div>
      <div style={{ padding: '6px 8px' }}>{children}</div>
    </div>
  )
}
