// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CheckCircle, Package, XCircle, Circle, Play, Target, GitBranch } from 'lucide-react'
import type { APGNodeData } from '../../lib/event-reducer'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { type NodeTheme, handleStyle, resolveNodeTheme } from '../../lib/node-themes'
import { formatTokenUsageShort } from '../../lib/token-usage'

/* ---- colour palette (live graph: intention=purple, action=blue) ---- */

const lightThemes: Record<string, NodeTheme> = {
  intention: { border: '#a855f7', bg: '#faf5ff', iconColor: '#a855f7' },
  action:    { border: '#3b82f6', bg: '#eff6ff', iconColor: '#3b82f6' },
  evaluation:{ border: '#f59e0b', bg: '#fffbeb', iconColor: '#f59e0b' },
  result:    { border: '#22c55e', bg: '#f0fdf4', iconColor: '#22c55e' },
}

const darkThemes: Record<string, NodeTheme> = {
  intention: { border: '#c084fc', bg: 'rgba(88,28,135,0.45)', iconColor: '#c084fc' },
  action:    { border: '#60a5fa', bg: 'rgba(30,58,138,0.45)', iconColor: '#60a5fa' },
  evaluation:{ border: '#fbbf24', bg: 'rgba(120,53,15,0.45)', iconColor: '#fbbf24' },
  result:    { border: '#4ade80', bg: 'rgba(20,83,45,0.45)',  iconColor: '#4ade80' },
}

const iconSize = { width: 16, height: 16, flexShrink: 0 } as const

function getNodeIcon(nodeType: string, status: string, typeColor: string) {
  const errorColor = '#ef4444'
  const successColor = '#22c55e'

  if (status === 'error') return <XCircle style={{ ...iconSize, color: errorColor }} />
  if (status === 'completed') return <CheckCircle style={{ ...iconSize, color: successColor }} />

  const c = typeColor
  switch (nodeType) {
    case 'intention':  return <Target style={{ ...iconSize, color: c }} />
    case 'action':     return <Play style={{ ...iconSize, color: c }} />
    case 'evaluation': return <GitBranch style={{ ...iconSize, color: c }} />
    case 'result':     return <Package style={{ ...iconSize, color: c }} />
    default:           return <Circle style={{ ...iconSize, color: '#6b7280' }} />
  }
}

function LiveAPGNode({ data }: NodeProps) {
  const d = data as APGNodeData & { isDark?: boolean }
  const isDark = useResolvedTheme(d.isDark)
  const t = resolveNodeTheme(d.nodeType, isDark, lightThemes, darkThemes)

  const borderColor = d.status === 'error' ? '#ef4444' : t.border

  const containerStyle: CSSProperties = {
    borderRadius: 8,
    border: `2px solid ${borderColor}`,
    background: t.bg,
    padding: '10px 16px',
    minWidth: 170,
    transition: 'all 0.3s',
    boxShadow: d.status === 'running'
      ? `0 0 12px ${t.border}40, 0 4px 6px rgba(0,0,0,0.1)`
      : d.status === 'error'
        ? '0 0 12px rgba(239,68,68,0.3), 0 4px 6px rgba(0,0,0,0.1)'
        : undefined,
  }

  const displayTitle = d.title || d.label
  const usageLabel = formatTokenUsageShort(d.tokenUsage)

  return (
    <div style={containerStyle}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        {getNodeIcon(d.nodeType, d.status, t.iconColor)}
        <span style={{
          fontSize: 14, fontWeight: 500,
          color: isDark ? '#f3f4f6' : '#1f2937',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 220,
        }}>
          {displayTitle}
        </span>
      </div>
      {d.summary && (
        <div style={{
          fontSize: 12, marginTop: 2, paddingLeft: 24,
          color: isDark ? '#d1d5db' : '#374151',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          maxWidth: 240,
        }}>
          {d.summary}
        </div>
      )}
      <div style={{ fontSize: 11, marginTop: 2, paddingLeft: 24, color: isDark ? '#6b7280' : '#9ca3af' }}>
        {['Step ' + d.step, d.nodeType, usageLabel].filter(Boolean).join(' · ')}
      </div>
      {d.errorMessage && (
        <div style={{
          marginTop: 4, fontSize: 12, paddingLeft: 24,
          color: isDark ? '#fca5a5' : '#dc2626',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {d.errorMessage}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  )
}

export default memo(LiveAPGNode)
