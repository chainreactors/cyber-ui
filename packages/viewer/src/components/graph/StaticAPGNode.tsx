// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { memo, type CSSProperties } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Target, Play, GitBranch, Package } from 'lucide-react'
import { useResolvedTheme } from '../../lib/use-resolved-theme'
import { type NodeTheme, handleStyle, resolveNodeTheme } from '../../lib/node-themes'

/* ---- colour palette (static graph: intention=blue, action=green) ---- */

const lightThemes: Record<string, NodeTheme> = {
  intention: { border: '#3b82f6', bg: '#eff6ff', iconColor: '#3b82f6' },
  action:    { border: '#22c55e', bg: '#f0fdf4', iconColor: '#22c55e' },
  evaluation:{ border: '#a855f7', bg: '#faf5ff', iconColor: '#a855f7' },
  result:    { border: '#f59e0b', bg: '#fffbeb', iconColor: '#f59e0b' },
}

const darkThemes: Record<string, NodeTheme> = {
  intention: { border: '#60a5fa', bg: 'rgba(30,58,138,0.45)', iconColor: '#60a5fa' },
  action:    { border: '#4ade80', bg: 'rgba(20,83,45,0.45)',  iconColor: '#4ade80' },
  evaluation:{ border: '#c084fc', bg: 'rgba(88,28,135,0.45)', iconColor: '#c084fc' },
  result:    { border: '#fbbf24', bg: 'rgba(120,53,15,0.45)', iconColor: '#fbbf24' },
}

/* ---- icon per node type ---- */

const iconSize = { width: 16, height: 16, flexShrink: 0 } as const

function NodeIcon({ nodeType, color }: { nodeType: string; color: string }) {
  const style = { ...iconSize, color }
  switch (nodeType) {
    case 'intention':  return <Target style={style} />
    case 'action':     return <Play style={style} />
    case 'evaluation': return <GitBranch style={style} />
    case 'result':     return <Package style={style} />
    default:           return <Play style={style} />
  }
}

/* ---- node component ---- */

export interface StaticNodeData {
  label: string
  nodeType: string
  nodeId: string
  isDark?: boolean
}

function StaticAPGNode({ data }: NodeProps) {
  const d = data as unknown as StaticNodeData
  const isDark = useResolvedTheme(d.isDark)
  const t = resolveNodeTheme(d.nodeType, isDark, lightThemes, darkThemes)

  const containerStyle: CSSProperties = {
    borderRadius: 8,
    border: `2px solid ${t.border}`,
    background: t.bg,
    padding: '10px 16px',
    minWidth: 160,
    cursor: 'grab',
  }

  const labelStyle: CSSProperties = {
    fontSize: 14,
    fontWeight: 500,
    color: isDark ? '#f3f4f6' : '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const subtitleStyle: CSSProperties = {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 2,
    paddingLeft: 24,
  }

  return (
    <div style={containerStyle}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <NodeIcon nodeType={d.nodeType} color={t.iconColor} />
        <span style={labelStyle}>{d.label}</span>
      </div>
      <div style={subtitleStyle}>{d.nodeType}</div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  )
}

export default memo(StaticAPGNode)
