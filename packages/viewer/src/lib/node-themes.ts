import type { CSSProperties } from 'react'

/** Colour tokens for a single node type. */
export interface NodeTheme {
  border: string
  bg: string
  iconColor: string
}

/* ---- fallback themes (used when nodeType is unknown) ---- */

export const fallbackLight: NodeTheme = { border: '#9ca3af', bg: '#f9fafb', iconColor: '#6b7280' }
export const fallbackDark: NodeTheme  = { border: '#6b7280', bg: 'rgba(31,41,55,0.6)', iconColor: '#9ca3af' }

/* ---- shared handle style for ReactFlow nodes ---- */

export const handleStyle: CSSProperties = {
  width: 8,
  height: 8,
  background: '#94a3b8',
  border: '2px solid #cbd5e1',
}

/** Resolve theme for a given nodeType + dark/light mode. */
export function resolveNodeTheme(
  nodeType: string,
  isDark: boolean,
  light: Record<string, NodeTheme>,
  dark: Record<string, NodeTheme>,
): NodeTheme {
  const palette = isDark ? dark : light
  return palette[nodeType] ?? (isDark ? fallbackDark : fallbackLight)
}
