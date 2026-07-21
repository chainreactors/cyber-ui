// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { Fragment, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  MessageSquareQuote,
  PlayCircle,
  Sparkles,
  SplitSquareVertical,
  Workflow,
  Wrench,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { reduceExecutionGraphState } from '../lib/execution-graph'
import { reduceExecutionHistoryGraphState } from '../lib/execution-history-graph'
import { useResolvedTheme } from '../lib/use-resolved-theme'
import LoadingPlaceholder from './shared/LoadingPlaceholder'
import type { APGEvent } from '../types/protocol'
import type {
  ExecutionEventRecord,
  ExecutionGraphNodeData,
  ExecutionGraphNodeKind,
  ExecutionNodeStatus,
} from '../types/execution-graph'
import type { TokenUsageSummary } from '../lib/token-usage'
import {
  formatTokenCount,
  formatTokenUsageShort,
  normalizeTokenUsage,
} from '../lib/token-usage'

type ViewNodeData = ExecutionGraphNodeData & {
  isDark?: boolean
  onToggle?: (id: string) => void
  onInspect?: (id: string) => void
  onMeasure?: (id: string, size: { width: number; height: number }) => void
}

type ViewNode = Node<ViewNodeData, 'executionNode'>
type MeasuredNodeSize = { width: number; height: number }
type ToolDigestItem = {
  id: string
  title: string
  label: string
  qualifiedName: string
  status: ExecutionNodeStatus
  durationMs: number
  depth: number
  childCount: number
}

export interface ExecutionGraphViewProps {
  events: ExecutionEventRecord[]
  historyEvents?: APGEvent[]
  isRunning?: boolean
  isDark?: boolean
  className?: string
}

const EXECUTION_VIEW_MIN_WIDTH = 1180
const EXECUTION_GRAPH_MIN_WIDTH = 820

const handleStyle = {
  width: 8,
  height: 8,
  border: 'none',
  background: '#94a3b8',
}

function kindIcon(kind: ExecutionGraphNodeKind) {
  if (kind === 'tool') return Wrench
  if (kind === 'mtp_block') return Boxes
  if (kind === 'turn') return SplitSquareVertical
  if (kind === 'skill' || kind === 'skill_block') return Sparkles
  if (kind === 'hitl') return MessageSquareQuote
  return Workflow
}

function kindPalette(kind: ExecutionGraphNodeKind, isDark: boolean) {
  if (kind === 'step') {
    return {
      border: '#5b21b6',
      bg: isDark ? 'rgba(76,29,149,0.26)' : '#f5f3ff',
      badge: isDark ? 'rgba(139,92,246,0.18)' : '#ede9fe',
      text: isDark ? '#ddd6fe' : '#5b21b6',
      subtle: isDark ? '#c4b5fd' : '#6d28d9',
    }
  }
  if (kind === 'mtp_block') {
    return {
      border: '#2563eb',
      bg: isDark ? 'rgba(30,64,175,0.22)' : '#eff6ff',
      badge: isDark ? 'rgba(59,130,246,0.18)' : '#dbeafe',
      text: isDark ? '#bfdbfe' : '#1d4ed8',
      subtle: isDark ? '#93c5fd' : '#1e40af',
    }
  }
  if (kind === 'turn') {
    return {
      border: '#be185d',
      bg: isDark ? 'rgba(159,18,57,0.20)' : '#fff1f2',
      badge: isDark ? 'rgba(244,114,182,0.18)' : '#ffe4e6',
      text: isDark ? '#fbcfe8' : '#be185d',
      subtle: isDark ? '#f9a8d4' : '#9d174d',
    }
  }
  if (kind === 'tool') {
    return {
      border: '#475569',
      bg: isDark ? 'rgba(51,65,85,0.28)' : '#f8fafc',
      badge: isDark ? 'rgba(148,163,184,0.16)' : '#e2e8f0',
      text: isDark ? '#cbd5e1' : '#334155',
      subtle: isDark ? '#94a3b8' : '#475569',
    }
  }
  if (kind === 'skill' || kind === 'skill_block') {
    return {
      border: '#0f766e',
      bg: isDark ? 'rgba(15,118,110,0.20)' : '#ecfdf5',
      badge: isDark ? 'rgba(20,184,166,0.16)' : '#ccfbf1',
      text: isDark ? '#99f6e4' : '#0f766e',
      subtle: isDark ? '#5eead4' : '#115e59',
    }
  }
  if (kind === 'hitl') {
    return {
      border: '#b45309',
      bg: isDark ? 'rgba(146,64,14,0.24)' : '#fff7ed',
      badge: isDark ? 'rgba(251,191,36,0.18)' : '#fed7aa',
      text: isDark ? '#fde68a' : '#9a3412',
      subtle: isDark ? '#fcd34d' : '#7c2d12',
    }
  }
  return {
    border: '#4338ca',
    bg: isDark ? 'rgba(49,46,129,0.24)' : '#eef2ff',
    badge: isDark ? 'rgba(129,140,248,0.18)' : '#e0e7ff',
    text: isDark ? '#c7d2fe' : '#3730a3',
    subtle: isDark ? '#a5b4fc' : '#312e81',
  }
}

function statusBadgeTone(status: ExecutionNodeStatus, isDark: boolean) {
  if (status === 'error') {
    return {
      bg: isDark ? 'rgba(239,68,68,0.16)' : '#fee2e2',
      text: isDark ? '#fecaca' : '#991b1b',
    }
  }
  if (status === 'pending') {
    return {
      bg: isDark ? 'rgba(245,158,11,0.18)' : '#fef3c7',
      text: isDark ? '#fde68a' : '#92400e',
    }
  }
  if (status === 'running') {
    return {
      bg: isDark ? 'rgba(59,130,246,0.16)' : '#dbeafe',
      text: isDark ? '#bfdbfe' : '#1d4ed8',
    }
  }
  return {
    bg: isDark ? 'rgba(34,197,94,0.16)' : '#dcfce7',
    text: isDark ? '#bbf7d0' : '#166534',
  }
}

function formatBadge(node: ExecutionGraphNodeData): string {
  if (node.kind === 'mtp_block') return 'mtp'
  if (node.kind === 'skill_block') return 'skills'
  return node.badge
}

function asToolDigestItems(value: unknown): ToolDigestItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const status: ExecutionNodeStatus = record.status === 'error'
      ? 'error'
      : record.status === 'pending'
        ? 'pending'
        : record.status === 'running'
          ? 'running'
          : 'completed'
    return [{
      id: typeof record.id === 'string' ? record.id : '',
      title: typeof record.title === 'string' ? record.title : '',
      label: typeof record.label === 'string' ? record.label : '',
      qualifiedName: typeof record.qualified_name === 'string' ? record.qualified_name : '',
      status,
      durationMs: typeof record.duration_ms === 'number' && Number.isFinite(record.duration_ms) ? record.duration_ms : 0,
      depth: typeof record.depth === 'number' && Number.isFinite(record.depth) ? record.depth : 0,
      childCount: typeof record.child_count === 'number' && Number.isFinite(record.child_count) ? record.child_count : 0,
    }]
  }).filter((item) => item.id.length > 0)
}

function compactDuration(durationMs: number): string {
  if (!durationMs || durationMs <= 0) return ''
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`
}

function toolStatusColor(status: ExecutionNodeStatus, isDark: boolean): string {
  if (status === 'error') return isDark ? '#fca5a5' : '#dc2626'
  if (status === 'pending') return isDark ? '#fcd34d' : '#d97706'
  if (status === 'running') return isDark ? '#93c5fd' : '#2563eb'
  return isDark ? '#86efac' : '#16a34a'
}

function stripToolDigestDetails(details: Record<string, unknown>): Record<string, unknown> {
  const {
    tool_preview: _toolPreview,
    tool_tree: _toolTree,
    tool_overflow_count: _toolOverflowCount,
    ...rest
  } = details
  return rest
}

function cardWidth(kind: ExecutionGraphNodeKind): number {
  if (kind === 'step') return 340
  if (kind === 'turn') return 308
  if (kind === 'hitl') return 308
  if (kind === 'mtp_block') return 324
  if (kind === 'skill_block') return 280
  return 248
}

function cardShadow(node: ExecutionGraphNodeData, border: string): string {
  if (node.kind === 'hitl' && node.status === 'pending') {
    return `0 0 0 2px ${border}25, 0 18px 42px ${border}33`
  }
  if (node.status === 'running') {
    return `0 0 0 1px ${border}20, 0 14px 28px ${border}24`
  }
  return '0 12px 30px rgba(15,23,42,0.10)'
}

function compactPreview(value: string, maxLength = 88): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

function nodeCardPreview(node: ExecutionGraphNodeData): { primary: string; secondary: string } {
  if (node.kind === 'step') {
    return {
      primary: compactPreview(String(node.details.attempt_summary || node.summary || 'Execution step')),
      secondary: compactPreview(String(node.details.eval_route_target || node.details.eval_verdict || node.nodeType || '')),
    }
  }
  if (node.kind === 'turn') {
    return {
      primary: compactPreview(String(node.details.user_text || 'Conversation turn')),
      secondary: compactPreview(String(node.details.assistant_text || node.details.agent_name || '')),
    }
  }
  if (node.kind === 'mtp_block') {
    return {
      primary: compactPreview(String(node.details.qualified_name || node.title || node.label || 'MTP block')),
      secondary: compactPreview([
        node.metrics.totalCalls ? `${node.metrics.totalCalls} calls` : '',
        node.metrics.rootCount ? `${node.metrics.rootCount} branches` : '',
        node.metrics.maxDepth ? `depth ${node.metrics.maxDepth}` : '',
      ].filter(Boolean).join(' · ')),
    }
  }
  if (node.kind === 'tool') {
    return {
      primary: compactPreview(String(node.details.qualified_name || node.details.tool_name || node.title || node.label || 'Tool call')),
      secondary: compactPreview(String(node.details.error || node.details.result || '')),
    }
  }
  if (node.kind === 'skill_block') {
    return {
      primary: compactPreview(Array.isArray(node.details.skill_names) ? node.details.skill_names.join(', ') : 'Context skills'),
      secondary: '',
    }
  }
  if (node.kind === 'skill') {
    return {
      primary: compactPreview(String(node.details.description || node.title || node.label || 'Skill')),
      secondary: '',
    }
  }
  if (node.kind === 'hitl') {
    return {
      primary: compactPreview(String(node.details.report_type || node.title || 'Checkpoint')),
      secondary: compactPreview(String(node.details.content || node.details.response || '')),
    }
  }
  return {
    primary: compactPreview(node.summary || node.title || node.label || ''),
    secondary: '',
  }
}

function nodeTokenUsage(node: ExecutionGraphNodeData): TokenUsageSummary | null {
  return (node.metrics.tokenUsage as TokenUsageSummary | undefined)
    ?? normalizeTokenUsage(node.details.token_usage)
    ?? null
}

function nodeMetricChips(node: ExecutionGraphNodeData): string[] {
  const chips: string[] = []
  const tokenUsage = nodeTokenUsage(node)

  if ((node.kind === 'step' || node.kind === 'turn') && tokenUsage) {
    chips.push(formatTokenUsageShort(tokenUsage))
  }

  if (node.kind === 'step') {
    if (node.metrics.turnCount) chips.push(`${node.metrics.turnCount} turns`)
    if (node.metrics.toolCount) chips.push(`${node.metrics.toolCount} tools`)
    if (node.metrics.skillCount) chips.push(`${node.metrics.skillCount} skills`)
  } else if (node.kind === 'turn') {
    if (node.metrics.messageCount) chips.push(`${node.metrics.messageCount} msgs`)
    if (node.metrics.toolCount) chips.push(`${node.metrics.toolCount} tools`)
    if (node.metrics.mtpCount) chips.push(`${node.metrics.mtpCount} mtp`)
  } else if (node.kind === 'mtp_block') {
    if (node.metrics.totalCalls) chips.push(`${node.metrics.totalCalls} calls`)
    if (node.metrics.maxDepth) chips.push(`depth ${node.metrics.maxDepth}`)
  }

  return chips.slice(0, 4)
}

function ExecutionNodeCard({ data }: NodeProps<ViewNode>) {
  const isDark = useResolvedTheme(data.isDark)
  const palette = kindPalette(data.kind, isDark)
  const statusTone = statusBadgeTone(data.status, isDark)
  const Icon = kindIcon(data.kind)
  const preview = nodeCardPreview(data)
  const metricChips = nodeMetricChips(data)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!data.onMeasure) return

    const element = cardRef.current
    if (!element) return

    let lastWidth = -1
    let lastHeight = -1
    const emitSize = (width: number, height: number) => {
      const nextWidth = Math.round(width)
      const nextHeight = Math.round(height)
      if (nextWidth <= 0 || nextHeight <= 0) return
      if (nextWidth === lastWidth && nextHeight === lastHeight) return
      lastWidth = nextWidth
      lastHeight = nextHeight
      data.onMeasure?.(data.id, { width: nextWidth, height: nextHeight })
    }

    emitSize(element.offsetWidth, element.offsetHeight)

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      emitSize(element.offsetWidth, element.offsetHeight)
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [data.id, data.onMeasure])

  return (
    <div
      ref={cardRef}
      style={{
        width: cardWidth(data.kind),
        minWidth: cardWidth(data.kind),
        maxWidth: cardWidth(data.kind),
        boxSizing: 'border-box',
        borderRadius: data.kind === 'hitl' ? 22 : 18,
        border: `1.5px solid ${palette.border}`,
        background: palette.bg,
        boxShadow: cardShadow(data, palette.border),
        padding: 15,
        color: isDark ? '#e2e8f0' : '#0f172a',
      }}
    >
      <Handle id="top" type="target" position={Position.Top} style={handleStyle} />
      <Handle id="left" type="target" position={Position.Left} style={handleStyle} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: palette.badge,
            color: palette.text,
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: data.kind === 'step' ? 'initial' : 'ellipsis',
                  whiteSpace: data.kind === 'step' ? 'normal' : 'nowrap',
                  wordBreak: data.kind === 'step' ? 'break-word' : 'normal',
                  lineHeight: data.kind === 'step' ? 1.4 : undefined,
                  maxWidth: '100%',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {data.title || data.label}
              </div>
              {data.onInspect && (
                <button
                  type="button"
                  className="nodrag nopan"
                  onClick={(event) => {
                    event.stopPropagation()
                    data.onInspect?.(data.id)
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    border: 'none',
                    background: palette.badge,
                    color: palette.text,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginTop: data.kind === 'step' ? 1 : 0,
                  }}
                  aria-label="open detail panel"
                  title="打开详情面板"
                >
                  <Eye size={13} />
                </button>
              )}
            </div>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 7px',
                borderRadius: 999,
                background: palette.badge,
                color: palette.text,
              }}
            >
              {formatBadge(data)}
            </span>
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 7px',
                borderRadius: 999,
                background: statusTone.bg,
                color: statusTone.text,
              }}
            >
              {data.status}
            </span>
          </div>

          {(preview.primary || preview.secondary) && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {preview.primary && (
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: isDark ? '#e2e8f0' : '#334155',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 4,
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {preview.primary}
                </div>
              )}
              {preview.secondary && (
                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: isDark ? '#94a3b8' : '#64748b',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 2,
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {preview.secondary}
                </div>
              )}
            </div>
          )}

          {metricChips.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {metricChips.map((chip) => (
                <span
                  key={chip}
                  style={{
                    fontSize: 10,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: isDark ? 'rgba(15,23,42,0.45)' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    color: isDark ? '#cbd5e1' : '#475569',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {data.collapsible && data.onToggle && (
          <button
            type="button"
            className="nodrag nopan"
            onClick={(event) => {
              event.stopPropagation()
              data.onToggle?.(data.id)
            }}
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: 'none',
              background: palette.badge,
              color: palette.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label={data.collapsed ? 'expand' : 'collapse'}
          >
            {data.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle} />
      <Handle id="right" type="source" position={Position.Right} style={handleStyle} />
    </div>
  )
}

const nodeTypes: NodeTypes = {
  executionNode: memo(ExecutionNodeCard),
}

function parseJsonLikeString(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return value
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

function normalizeDetailValue(value: unknown): unknown {
  return typeof value === 'string' ? parseJsonLikeString(value) : value
}

function looksLikePromptXml(value: string): boolean {
  return /^<[\w-]+>/.test(value.trim())
}

function promptTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    'node-name': 'Node',
    'goal': 'Goal',
    'output': 'Output',
    'input': 'Input',
    'branches': 'Branches',
    'rules': 'Rules',
    'examples': 'Examples',
    'context': 'Context',
    'guardrail': 'Guardrail',
    'fallback': 'Fallback',
    'user-intent': 'User Intent',
    'user-message': 'User Message',
    'dialectics': 'Dialectics',
    'history': 'History',
    'system': 'System',
    'role': 'Role',
    'guidance': 'Guidance',
  }
  return labels[tag] ?? tag.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function promptXmlToMarkdown(value: string): string {
  const source = value.trim()
  if (!source || !looksLikePromptXml(source)) return value

  const parser = new DOMParser()
  const doc = parser.parseFromString(source, 'application/xml')
  if (doc.querySelector('parsererror')) return value

  function elementToMarkdown(element: Element, level: number): string {
    const blocks: string[] = []

    if (element.children.length === 0) {
      const text = element.textContent?.trim() ?? ''
      return text ? `${'#'.repeat(Math.min(level, 6))} ${promptTagLabel(element.tagName)}\n\n${text}` : ''
    }

    for (const child of Array.from(element.children)) {
      const markdown = elementToMarkdown(child, level + 1)
      if (markdown) blocks.push(markdown)
    }

    const lead = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n')
    if (lead) {
      blocks.unshift(lead)
    }

    const body = blocks.filter(Boolean).join('\n\n').trim()
    return body ? `${'#'.repeat(Math.min(level, 6))} ${promptTagLabel(element.tagName)}\n\n${body}` : ''
  }

  const root = doc.documentElement
  if (!root) return value
  if (root.tagName === 'prompt') {
    return Array.from(root.children)
      .map((child) => elementToMarkdown(child, 2))
      .filter(Boolean)
      .join('\n\n')
  }
  return elementToMarkdown(root, 2)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function omitRecordKeys(
  value: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (keys.includes(key)) continue
    result[key] = entry
  }
  return result
}

function hasRenderableDetail(value: unknown): boolean {
  const normalized = normalizeDetailValue(value)
  if (normalized === null || normalized === undefined) return false
  if (typeof normalized === 'string') return normalized.trim().length > 0
  if (typeof normalized === 'number' || typeof normalized === 'boolean') return true
  if (Array.isArray(normalized)) return normalized.some((item) => hasRenderableDetail(item))
  if (typeof normalized === 'object') {
    return Object.values(normalized).some((item) => hasRenderableDetail(item))
  }
  return true
}

function formatDetailLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function eventName(event: ExecutionGraphNodeData['eventHistory'][number]): string {
  return 'event_name' in event ? event.event_name : event.event_type
}

function eventTimestamp(event: ExecutionGraphNodeData['eventHistory'][number]): string {
  return event.timestamp
}

type DetailSectionTone =
  | 'summary'
  | 'usage'
  | 'meta'
  | 'prompt'
  | 'result'
  | 'routing'
  | 'evaluation'
  | 'report'
  | 'events'
  | 'tools'
  | 'neutral'

type DetailSectionSpec = {
  title: string
  value: unknown
  tone?: DetailSectionTone
  defaultOpen?: boolean
}

function buildDetailSections(node: ViewNodeData): DetailSectionSpec[] {
  const details = node.details ?? {}
  const tokenUsage = nodeTokenUsage(node)

  if (node.kind === 'step') {
    const output = asRecord(normalizeDetailValue(details.output))
    const parsedMessage = normalizeDetailValue(details.message)
    const parsedMessageRecord = asRecord(parsedMessage)
    const candidateResult = asRecord(details.candidate_result)
    const structuredCandidateResult = Object.keys(candidateResult).length > 0
      ? candidateResult
      : asRecord(output.candidate_result)
    const attemptSummary = asText(details.attempt_summary)
      || asText(output.attempt_summary)
      || asText(output.summary)
      || asText(parsedMessageRecord.attempt_summary)
      || asText(parsedMessageRecord.summary)
      || (typeof parsedMessage === 'string' ? parsedMessage : '')
    const outputDetails = Object.keys(output).length > 0
      ? omitRecordKeys(output, ['attempt_summary', 'candidate_result', 'summary', 'message', 'title'])
      : {}
    const outputSectionValue = hasRenderableDetail(outputDetails)
      ? outputDetails
      : (Object.keys(output).length === 0 ? details.output || '' : '')

    return [
      {
        title: 'Evaluation',
        value: {
          verdict: details.eval_verdict || '',
          reviewer: details.eval_reviewer || '',
          reasoning: details.eval_reasoning || '',
          revision_feedback: details.eval_revision_feedback || '',
        },
        tone: 'evaluation',
      },
      {
        title: 'Routing',
        value: {
          target: details.eval_route_target || '',
          reasoning: details.eval_route_reasoning || '',
          phase: details.latest_eval_phase || '',
        },
        tone: 'routing',
      },
      { title: 'Token Usage', value: tokenUsage, tone: 'usage' },
      { title: 'Prompt', value: details.prompt || details.node_prompt || '', tone: 'prompt' },
      { title: 'Attempt Summary', value: attemptSummary, tone: 'result' },
      { title: 'Candidate Result', value: structuredCandidateResult, tone: 'result' },
      { title: 'Output', value: outputSectionValue, tone: 'result' },
      {
        title: 'Node Meta',
        value: {
          step: node.step,
          node_type: node.nodeType,
          node_id: node.nodeId,
          branch: details.branch || '',
          latest_report_type: details.latest_report_type || '',
          latest_report_title: details.latest_report_title || '',
          total_tokens: tokenUsage?.totalTokens || 0,
          input_tokens: tokenUsage?.inputTokens || 0,
          output_tokens: tokenUsage?.outputTokens || 0,
          mtp_count: node.metrics.mtpCount || 0,
          skill_count: node.metrics.skillCount || 0,
          hitl_count: node.metrics.hitlCount || 0,
        },
        tone: 'meta',
      },
      { title: 'Latest Report', value: details.latest_report_content || '', tone: 'report' },
    ]
  }

  if (node.kind === 'turn') {
    return [
      {
        title: 'Turn',
        value: {
          turn_id: details.turn_id || '',
          agent_name: details.agent_name || '',
          synthetic: details.synthetic || false,
          total_tokens: tokenUsage?.totalTokens || 0,
          message_count: node.metrics.messageCount || 0,
          mtp_count: node.metrics.mtpCount || 0,
          tool_count: node.metrics.toolCount || 0,
        },
        tone: 'meta',
      },
      { title: 'Token Usage', value: tokenUsage, tone: 'usage' },
      { title: 'Prompt', value: details.user_prompt || '', tone: 'prompt' },
      { title: 'User', value: details.user_text || '', tone: 'result' },
      { title: 'Assistant', value: details.assistant_text || '', tone: 'result' },
    ]
  }

  if (node.kind === 'mtp_block') {
    const overview = stripToolDigestDetails(details)
    return [
      { title: 'Root Tool', value: details.qualified_name || details.root_tool_id || node.label, tone: 'tools' },
      { title: 'Toolset', value: { namespace: details.namespace || '', toolset: details.toolset || '' }, tone: 'tools' },
      {
        title: 'Overview',
        value: {
          total_calls: node.metrics.totalCalls || 0,
          root_branches: node.metrics.rootCount || 0,
          leaf_calls: node.metrics.leafCount || 0,
          max_depth: node.metrics.maxDepth || 0,
          total_duration_ms: node.metrics.totalDurationMs || 0,
        },
        tone: 'meta',
      },
      { title: 'Metrics', value: node.metrics, tone: 'meta' },
      { title: 'Details', value: overview, tone: 'neutral' },
    ]
  }

  if (node.kind === 'tool') {
    return [
      { title: 'Qualified Name', value: details.qualified_name || details.tool_name || node.label, tone: 'tools' },
      { title: 'Arguments', value: details.kwargs || details.args || '', tone: 'prompt' },
      { title: 'Result', value: details.result || details.output || '', tone: 'result' },
      { title: 'Duration', value: details.duration_ms ? `${details.duration_ms} ms` : '', tone: 'meta' },
      { title: 'Error', value: details.error || '', tone: 'evaluation' },
    ]
  }

  if (node.kind === 'skill_block') {
    return [
      { title: 'Metrics', value: node.metrics, tone: 'meta' },
      { title: 'Skills', value: details.skill_names || [], tone: 'neutral' },
      { title: 'Files', value: details.files || [], tone: 'neutral' },
      { title: 'Missing', value: details.missing || [], tone: 'evaluation' },
    ]
  }

  if (node.kind === 'skill') {
    return [
      { title: 'Skill', value: details.skill_name || node.label, tone: 'neutral' },
      { title: 'Description', value: details.description || '', tone: 'neutral' },
      { title: 'Files', value: details.files || [], tone: 'neutral' },
      { title: 'Missing', value: details.missing || [], tone: 'evaluation' },
      { title: 'Available', value: details.available, tone: 'meta' },
    ]
  }

  if (node.kind === 'hitl') {
    return [
      { title: 'Checkpoint', value: details.report_type || '', tone: 'report' },
      { title: 'Content', value: details.content || '', tone: 'report' },
      { title: 'Response', value: details.response || '', tone: 'report' },
      { title: 'Status', value: node.status, tone: 'meta' },
    ]
  }

  return [{ title: 'Details', value: details, tone: 'neutral' }]
}

function shouldRenderSection(section: DetailSectionSpec): boolean {
  return hasRenderableDetail(section.value)
}

function detailSummaryContent(node: ViewNodeData): string {
  const details = node.details ?? {}

  if (node.kind === 'step') {
    const output = asRecord(normalizeDetailValue(details.output))
    const parsedMessage = normalizeDetailValue(details.message)
    const parsedMessageRecord = asRecord(parsedMessage)

    return asText(details.attempt_summary)
      || asText(output.attempt_summary)
      || asText(output.summary)
      || asText(parsedMessageRecord.attempt_summary)
      || asText(parsedMessageRecord.summary)
      || (typeof parsedMessage === 'string' ? parsedMessage : '')
      || node.summary
      || ''
  }

  if (node.kind === 'turn') {
    return asText(details.assistant_text)
      || asText(details.user_text)
      || node.summary
      || ''
  }

  if (node.kind === 'tool') {
    if (typeof details.result === 'string' && details.result.trim()) {
      return details.result
    }
    if (typeof details.error === 'string' && details.error.trim()) {
      return details.error
    }
  }

  if (node.kind === 'hitl') {
    return asText(details.response)
      || asText(details.content)
      || node.summary
      || ''
  }

  return node.summary || ''
}

function detailSectionPalette(tone: DetailSectionTone, isDark: boolean) {
  switch (tone) {
    case 'summary':
      return {
        border: isDark ? '#7c3aed' : '#8b5cf6',
        background: isDark ? 'rgba(76,29,149,0.10)' : '#faf5ff',
        title: isDark ? '#ddd6fe' : '#6d28d9',
      }
    case 'usage':
      return {
        border: isDark ? '#3b82f6' : '#2563eb',
        background: isDark ? 'rgba(30,64,175,0.12)' : '#eff6ff',
        title: isDark ? '#bfdbfe' : '#1d4ed8',
      }
    case 'meta':
      return {
        border: isDark ? '#64748b' : '#475569',
        background: isDark ? 'rgba(30,41,59,0.28)' : '#f8fafc',
        title: isDark ? '#cbd5e1' : '#334155',
      }
    case 'prompt':
      return {
        border: isDark ? '#0ea5e9' : '#0284c7',
        background: isDark ? 'rgba(8,47,73,0.24)' : '#f0f9ff',
        title: isDark ? '#bae6fd' : '#0369a1',
      }
    case 'result':
      return {
        border: isDark ? '#10b981' : '#059669',
        background: isDark ? 'rgba(6,78,59,0.18)' : '#ecfdf5',
        title: isDark ? '#a7f3d0' : '#047857',
      }
    case 'routing':
      return {
        border: isDark ? '#f59e0b' : '#d97706',
        background: isDark ? 'rgba(120,53,15,0.18)' : '#fffbeb',
        title: isDark ? '#fde68a' : '#b45309',
      }
    case 'evaluation':
      return {
        border: isDark ? '#ef4444' : '#dc2626',
        background: isDark ? 'rgba(127,29,29,0.18)' : '#fef2f2',
        title: isDark ? '#fecaca' : '#b91c1c',
      }
    case 'report':
      return {
        border: isDark ? '#f97316' : '#ea580c',
        background: isDark ? 'rgba(124,45,18,0.18)' : '#fff7ed',
        title: isDark ? '#fdba74' : '#c2410c',
      }
    case 'events':
      return {
        border: isDark ? '#8b5cf6' : '#7c3aed',
        background: isDark ? 'rgba(67,56,202,0.14)' : '#f5f3ff',
        title: isDark ? '#c4b5fd' : '#6d28d9',
      }
    case 'tools':
      return {
        border: isDark ? '#14b8a6' : '#0f766e',
        background: isDark ? 'rgba(19,78,74,0.18)' : '#f0fdfa',
        title: isDark ? '#99f6e4' : '#0f766e',
      }
    default:
      return {
        border: isDark ? '#334155' : '#cbd5e1',
        background: isDark ? 'rgba(15,23,42,0.55)' : '#ffffff',
        title: isDark ? '#cbd5e1' : '#475569',
      }
  }
}

function DetailSection({
  title,
  tone = 'neutral',
  isDark,
  defaultOpen = false,
  children,
}: {
  title: string
  tone?: DetailSectionTone
  isDark: boolean
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const palette = detailSectionPalette(tone, isDark)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        border: `1px solid ${palette.border}`,
        background: palette.background,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        style={{
          cursor: 'pointer',
          width: '100%',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 40,
          borderLeft: `3px solid ${palette.border}`,
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          background: 'transparent',
          color: palette.title,
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          userSelect: 'none',
        }}
      >
        <ChevronRight
          size={13}
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 160ms ease',
          }}
        />
        <span>{title}</span>
      </button>
      {open && (
        <div
          style={{
            padding: '12px 14px 14px',
            borderTop: `1px solid ${isDark ? 'rgba(51,65,85,0.45)' : 'rgba(203,213,225,0.9)'}`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MarkdownBlock({
  content,
  isDark,
}: {
  content: string
  isDark: boolean
}) {
  const markdown = promptXmlToMarkdown(content)

  return (
    <div style={{ fontSize: 12, lineHeight: 1.65, color: isDark ? '#cbd5e1' : '#334155' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '0 0 10px', paddingLeft: 18 }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: '0 0 6px' }}>{children}</li>,
          pre: ({ children }) => (
            <pre style={{
              margin: '0 0 10px',
              padding: 12,
              overflowX: 'auto',
              borderRadius: 10,
              background: isDark ? 'rgba(2,6,23,0.88)' : '#fff',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            }}
            >
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              background: isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0',
              padding: '2px 4px',
              borderRadius: 4,
            }}
            >
              {children}
            </code>
          ),
          h1: ({ children }) => <h1 style={{ margin: '0 0 10px', fontSize: 16 }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{children}</h3>,
          h4: ({ children }) => <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{children}</h4>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

function PrimitivePill({
  value,
  isDark,
}: {
  value: string
  isDark: boolean
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 999,
        background: isDark ? 'rgba(30,41,59,0.86)' : '#e2e8f0',
        color: isDark ? '#e2e8f0' : '#334155',
        fontSize: 12,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {value}
    </span>
  )
}

function isCompactString(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 72 && !trimmed.includes('\n')
}

function isCompactPrimitive(value: unknown): boolean {
  return typeof value === 'number'
    || typeof value === 'boolean'
    || (typeof value === 'string' && isCompactString(value))
}

function isCompactPrimitiveArray(value: unknown): boolean {
  return Array.isArray(value)
    && value.length > 0
    && value.length <= 8
    && value.every((item) => isCompactPrimitive(normalizeDetailValue(item)))
}

function isCompactMetadataObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value).filter(([, item]) => hasRenderableDetail(item))
  if (entries.length === 0 || entries.length > 14) return false
  return entries.every(([, item]) => {
    const normalized = normalizeDetailValue(item)
    return isCompactPrimitive(normalized) || isCompactPrimitiveArray(normalized)
  })
}

function CompactMetaValue({
  value,
  isDark,
}: {
  value: unknown
  isDark: boolean
}) {
  const normalized = normalizeDetailValue(value)

  if (Array.isArray(normalized)) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {normalized.map((item, index) => (
          <span
            key={`${index}:${String(item)}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 6px',
              borderRadius: 999,
              background: isDark ? 'rgba(30,41,59,0.9)' : '#e2e8f0',
              color: isDark ? '#e2e8f0' : '#334155',
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            {String(normalizeDetailValue(item))}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        fontSize: 12,
        lineHeight: 1.45,
        color: isDark ? '#e2e8f0' : '#0f172a',
        fontFamily: typeof normalized === 'number' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : undefined,
        wordBreak: 'break-word',
      }}
    >
      {String(normalized)}
    </div>
  )
}

function CompactMetadataGrid({
  value,
  isDark,
}: {
  value: Record<string, unknown>
  isDark: boolean
}) {
  const entries = Object.entries(value).filter(([, item]) => hasRenderableDetail(item))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(96px, 128px) minmax(0, 1fr)',
        columnGap: 12,
        rowGap: 8,
        alignItems: 'start',
      }}
    >
      {entries.map(([key, item]) => (
        <Fragment key={key}>
          <div
            style={{
              minWidth: 0,
              paddingTop: 2,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isDark ? '#94a3b8' : '#64748b',
            }}
          >
            {formatDetailLabel(key)}
          </div>
          <div
            style={{
              minWidth: 0,
              paddingBottom: 8,
              borderBottom: `1px solid ${isDark ? 'rgba(51,65,85,0.55)' : '#e2e8f0'}`,
            }}
          >
            <CompactMetaValue value={item} isDark={isDark} />
          </div>
        </Fragment>
      ))}
    </div>
  )
}

function StructuredValueView({
  value,
  isDark,
  depth = 0,
}: {
  value: unknown
  isDark: boolean
  depth?: number
}) {
  const normalized = normalizeDetailValue(value)

  if (normalized === null || normalized === undefined) return null

  if (typeof normalized === 'string') {
    if (isCompactString(normalized)) {
      return <CompactMetaValue value={normalized} isDark={isDark} />
    }
    return <MarkdownBlock content={normalized} isDark={isDark} />
  }

  if (typeof normalized === 'number' || typeof normalized === 'boolean') {
    return <PrimitivePill value={String(normalized)} isDark={isDark} />
  }

  if (Array.isArray(normalized)) {
    if (normalized.length === 0) return null
    const primitiveList = normalized.every((item) => {
      const next = normalizeDetailValue(item)
      return typeof next === 'string' || typeof next === 'number' || typeof next === 'boolean'
    })
    if (primitiveList) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {normalized.map((item, index) => (
            <PrimitivePill key={`${index}:${String(item)}`} value={String(normalizeDetailValue(item))} isDark={isDark} />
          ))}
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {normalized.map((item, index) => (
          <div
            key={index}
            style={{
              borderRadius: 14,
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              background: isDark ? 'rgba(15,23,42,0.5)' : '#fff',
              padding: 12,
            }}
          >
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94a3b8' : '#64748b' }}>
              #{index + 1}
            </div>
            <div style={{ marginTop: 8 }}>
              <StructuredValueView value={item} isDark={isDark} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (typeof normalized === 'object') {
    const entries = Object.entries(normalized).filter(([, item]) => hasRenderableDetail(item))
    if (entries.length === 0) return null
    if (isCompactMetadataObject(normalized)) {
      return <CompactMetadataGrid value={normalized} isDark={isDark} />
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([key, item]) => {
          const next = normalizeDetailValue(item)
          const isScalar = typeof next === 'string' || typeof next === 'number' || typeof next === 'boolean'
          return (
            <div
              key={key}
              style={{
                borderRadius: 14,
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                background: depth > 0
                  ? (isDark ? 'rgba(15,23,42,0.42)' : '#fff')
                  : (isDark ? 'rgba(15,23,42,0.55)' : '#fff'),
                padding: 12,
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? '#94a3b8' : '#64748b' }}>
                {formatDetailLabel(key)}
              </div>
              <div style={{ marginTop: isScalar ? 6 : 8 }}>
                <StructuredValueView value={next} isDark={isDark} depth={depth + 1} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155' }}>
      {String(normalized)}
    </div>
  )
}

function ToolStackPanel({
  items,
  isDark,
}: {
  items: ToolDigestItem[]
  isDark: boolean
}) {
  if (items.length === 0) return null

  const groups: Array<{ root: ToolDigestItem; items: ToolDigestItem[] }> = []
  for (const item of items) {
    if (item.depth === 0 || groups.length === 0) {
      groups.push({ root: item, items: [item] })
      continue
    }
    groups[groups.length - 1]?.items.push(item)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map((group) => (
        <div
          key={group.root.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 14,
            border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
            background: isDark ? 'rgba(15,23,42,0.55)' : '#fff',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: toolStatusColor(group.root.status, isDark),
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isDark ? '#f8fafc' : '#0f172a',
                  }}
                >
                  {group.root.title || group.root.label || group.root.qualifiedName}
                </span>
              </div>
              {group.root.qualifiedName && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: isDark ? '#94a3b8' : '#64748b',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.root.qualifiedName}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                {group.items.length} calls
              </span>
              {group.root.durationMs > 0 && (
                <span style={{ fontSize: 11, color: isDark ? '#cbd5e1' : '#334155' }}>
                  {compactDuration(group.root.durationMs)}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.items.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginLeft: item.depth * 16,
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: isDark ? 'rgba(30,41,59,0.72)' : '#f8fafc',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: toolStatusColor(item.status, isDark),
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: isDark ? '#e2e8f0' : '#0f172a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title || item.label || item.qualifiedName}
                  </div>
                  {item.qualifiedName && (
                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 10,
                        color: isDark ? '#94a3b8' : '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    >
                      {item.qualifiedName}
                    </div>
                  )}
                </div>
                {item.childCount > 0 && (
                  <span style={{ fontSize: 10, color: isDark ? '#cbd5e1' : '#475569' }}>
                    +{item.childCount}
                  </span>
                )}
                {item.durationMs > 0 && (
                  <span style={{ fontSize: 10, color: isDark ? '#cbd5e1' : '#475569' }}>
                    {compactDuration(item.durationMs)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DetailPanel({
  node,
  isDark,
  onClose,
  onOpenPanel,
}: {
  node: ViewNodeData | null
  isDark: boolean
  onClose: () => void
  onOpenPanel?: (() => void) | null
}) {
  if (!node) {
    return (
      <div style={{ padding: 20, color: isDark ? '#94a3b8' : '#64748b' }}>
        Select a node to inspect its execution details.
      </div>
    )
  }

  const palette = kindPalette(node.kind, isDark)
  const statusTone = statusBadgeTone(node.status, isDark)
  const tokenUsage = nodeTokenUsage(node)
  const toolTree = node.kind === 'mtp_block' ? asToolDigestItems(node.details.tool_tree) : []
  const sections = buildDetailSections(node).filter((section) => shouldRenderSection(section))
  const summaryContent = detailSummaryContent(node)
  const hasSummary = summaryContent.trim().length > 0
  const hasEvents = node.eventHistory.length > 0
  const hasBodySections = hasSummary || toolTree.length > 0 || sections.length > 0 || hasEvents

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: 18,
          borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
            {node.title || node.label}
          </div>
          {node.title !== node.label && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: isDark ? '#94a3b8' : '#64748b',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              {node.label}
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 999,
                background: statusTone.bg,
                color: statusTone.text,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {node.status}
            </span>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 999,
                background: palette.badge,
                color: palette.text,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {formatBadge(node)}
            </span>
            {tokenUsage && (
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: isDark ? 'rgba(59,130,246,0.16)' : '#dbeafe',
                  color: isDark ? '#bfdbfe' : '#1d4ed8',
                  fontSize: 11,
                  letterSpacing: '0.02em',
                }}
              >
                {formatTokenCount(tokenUsage.totalTokens)} tok
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onOpenPanel && (
            <button
              type="button"
              onClick={onOpenPanel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 10,
                border: `1px solid ${isDark ? '#334155' : '#cbd5e1'}`,
                background: isDark ? 'rgba(15,23,42,0.55)' : '#fff',
                color: isDark ? '#cbd5e1' : '#475569',
                cursor: 'pointer',
              }}
              aria-label="打开详情面板"
              title="打开详情面板"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: isDark ? '#94a3b8' : '#64748b',
              cursor: 'pointer',
            }}
          >
            close
          </button>
        </div>
      </div>

      <div
        style={{
          padding: 18,
          overflowY: 'auto',
          minHeight: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {hasSummary && (
          <DetailSection title="Summary" tone="summary" isDark={isDark} defaultOpen>
            <MarkdownBlock content={summaryContent} isDark={isDark} />
          </DetailSection>
        )}

        {node.kind === 'mtp_block' && toolTree.length > 0 && (
          <DetailSection title="Call Stack" tone="tools" isDark={isDark}>
            <ToolStackPanel items={toolTree} isDark={isDark} />
          </DetailSection>
        )}

        {sections.map((section) => (
          <DetailSection
            key={section.title}
            title={section.title}
            tone={section.tone}
            isDark={isDark}
            defaultOpen={section.defaultOpen}
          >
            <div style={{ minWidth: 0 }}>
              <StructuredValueView value={section.value} isDark={isDark} />
            </div>
          </DetailSection>
        ))}

        {hasEvents && (
          <DetailSection title="Events" tone="events" isDark={isDark}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {node.eventHistory.map((event) => (
                <div
                  key={`${eventTimestamp(event)}:${eventName(event)}`}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
                    background: isDark ? 'rgba(15,23,42,0.55)' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                    {eventName(event)}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                    {eventTimestamp(event)}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>
        )}

        {!hasBodySections && (
          <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
            Details not available yet.
          </div>
        )}
      </div>
    </div>
  )
}

function NodeDetailModal({
  node,
  isDark,
  onClose,
}: {
  node: ViewNodeData | null
  isDark: boolean
  onClose: () => void
}) {
  if (!node) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: isDark ? 'rgba(2,6,23,0.58)' : 'rgba(15,23,42,0.18)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(980px, calc(100vw - 48px))',
          height: 'min(82vh, 900px)',
          borderRadius: 22,
          overflow: 'hidden',
          background: isDark ? '#111827' : '#ffffff',
          border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
          boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <DetailPanel node={node} isDark={isDark} onClose={onClose} />
      </div>
    </div>
  )
}

function TimelinePanel({
  entries,
  isDark,
}: {
  entries: ReturnType<typeof reduceExecutionGraphState>['timeline']
  isDark: boolean
}) {
  if (entries.length === 0) {
    return (
      <div style={{ padding: 20, color: isDark ? '#94a3b8' : '#64748b' }}>
        No execution events yet.
      </div>
    )
  }

  return (
    <div
      style={{
        padding: 18,
        overflowY: 'auto',
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {entries.map((entry) => {
        const tone = statusBadgeTone(entry.status, isDark)
        const Icon = entry.status === 'error'
          ? AlertCircle
          : entry.status === 'completed'
            ? CheckCircle2
            : entry.status === 'pending'
              ? Clock3
              : PlayCircle

        return (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: 12,
              borderRadius: 14,
              border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`,
              background: isDark ? 'rgba(15,23,42,0.55)' : '#fff',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: tone.bg,
                color: tone.text,
                flexShrink: 0,
              }}
            >
              <Icon size={15} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {entry.label}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: isDark ? '#cbd5e1' : '#475569' }}>
                {entry.detail || entry.kind}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: isDark ? '#64748b' : '#94a3b8' }}>
                {entry.timestamp}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LegendChip({
  label,
  kind,
  isDark,
}: {
  label: string
  kind: ExecutionGraphNodeKind
  isDark: boolean
}) {
  const palette = kindPalette(kind, isDark)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 999,
        background: palette.badge,
        color: palette.text,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  )
}

export default function ExecutionGraphView({
  events,
  historyEvents = [],
  isRunning,
  isDark: isDarkProp,
  className,
}: ExecutionGraphViewProps) {
  const isDark = useResolvedTheme(isDarkProp)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [panelNodeId, setPanelNodeId] = useState<string | null>(null)
  const [measuredNodeSizes, setMeasuredNodeSizes] = useState<Record<string, MeasuredNodeSize>>({})
  const hasHistoryGraph = historyEvents.length > 0
  const autoExpandedHistoryKeyRef = useRef<string>('')

  const handleNodeMeasure = useCallback((id: string, size: MeasuredNodeSize) => {
    const width = Math.round(size.width)
    const height = Math.round(size.height)
    if (width <= 0 || height <= 0) return

    setMeasuredNodeSizes((current) => {
      const existing = current[id]
      if (existing && existing.width === width && existing.height === height) {
        return current
      }
      return {
        ...current,
        [id]: { width, height },
      }
    })
  }, [])

  const graphState = useMemo(
    () => (
      hasHistoryGraph
        ? reduceExecutionHistoryGraphState(historyEvents, expandedIds, measuredNodeSizes)
        : reduceExecutionGraphState(events, expandedIds)
    ),
    [events, expandedIds, hasHistoryGraph, historyEvents, measuredNodeSizes],
  )

  const historyGraphAutoExpandKey = useMemo(() => {
    if (!hasHistoryGraph) return ''
    const executionId = graphState.executionId || ''
    const first = historyEvents[0]?.timestamp ?? ''
    const firstEventType = historyEvents[0]?.event_type ?? ''
    return `${executionId}:${first}:${firstEventType}`
  }, [graphState.executionId, hasHistoryGraph, historyEvents])

  useEffect(() => {
    if (!hasHistoryGraph) {
      setMeasuredNodeSizes((current) => (Object.keys(current).length > 0 ? {} : current))
      return
    }
    setMeasuredNodeSizes((current) => (Object.keys(current).length > 0 ? {} : current))
  }, [hasHistoryGraph, historyGraphAutoExpandKey])

  useEffect(() => {
    if (!hasHistoryGraph) {
      autoExpandedHistoryKeyRef.current = ''
      return
    }
    if (autoExpandedHistoryKeyRef.current === historyGraphAutoExpandKey) {
      return
    }

    const defaultExpandedStepIds = graphState.nodes
      .filter((node) => node.data.kind === 'step' && node.data.childCount > 0)
      .map((node) => node.id)

    setExpandedIds(defaultExpandedStepIds)
    autoExpandedHistoryKeyRef.current = historyGraphAutoExpandKey
  }, [graphState.nodes, hasHistoryGraph, historyGraphAutoExpandKey])

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((current) => (
      current.includes(nodeId)
        ? current.filter((id) => id !== nodeId)
        : [...current, nodeId]
    ))
  }, [])

  const nodes = useMemo<ViewNode[]>(
    () => graphState.nodes.map((node) => ({
      ...node,
      type: 'executionNode' as const,
      data: {
        ...node.data,
        isDark,
        onInspect: setPanelNodeId,
        onToggle: toggleExpand,
        onMeasure: handleNodeMeasure,
      },
    })),
    [graphState.nodes, handleNodeMeasure, isDark, toggleExpand],
  )

  const edges = useMemo<Edge[]>(() => graphState.edges, [graphState.edges])

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId)?.data ?? null,
    [nodes, selectedNodeId],
  )
  const panelNode = useMemo(
    () => nodes.find((node) => node.id === panelNodeId)?.data ?? null,
    [nodes, panelNodeId],
  )

  const running = isRunning ?? graphState.isRunning
  const graphPlaceholderLabel = (running || events.length > 0 || historyEvents.length > 0)
    ? 'Building execution graph'
    : 'Waiting for execution graph data'
  const borderColor = isDark ? '#1e293b' : '#e2e8f0'
  const panelBg = isDark ? '#111827' : '#fcfcfb'
  const graphBg = isDark
    ? 'radial-gradient(circle at top left, rgba(148,163,184,0.08) 0%, rgba(148,163,184,0) 34%), linear-gradient(180deg, #0b1220 0%, #111827 100%)'
    : 'radial-gradient(circle at top left, rgba(148,163,184,0.12) 0%, rgba(148,163,184,0) 32%), linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)'
  const overlayBg = isDark ? 'rgba(15,23,42,0.82)' : 'rgba(252,252,251,0.9)'

  return (
    <div
      className={className}
      style={{
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'auto',
        background: graphBg,
      }}
    >
      <div
        style={{
          display: 'flex',
          minWidth: EXECUTION_VIEW_MIN_WIDTH,
          height: '100%',
        }}
      >
        <div
          style={{
            flex: `1 0 ${EXECUTION_GRAPH_MIN_WIDTH}px`,
            minWidth: EXECUTION_GRAPH_MIN_WIDTH,
            height: '100%',
            position: 'relative',
          }}
        >
          {nodes.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LoadingPlaceholder label={graphPlaceholderLabel} isDark={isDark} />
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              nodesDraggable={false}
              nodesConnectable={false}
              minZoom={0.2}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              defaultViewport={{ x: 0, y: 0, zoom: 0.82 }}
            >
              <Background color={isDark ? '#334155' : '#d6d3d1'} gap={24} />
              <Controls showInteractive={false} />
            </ReactFlow>
          )}

          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 16,
                background: overlayBg,
                border: `1px solid ${borderColor}`,
                boxShadow: '0 10px 24px rgba(15,23,42,0.12)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#94a3b8' : '#64748b' }}>
                Execution Graph
              </div>
              <div style={{ marginTop: 6, fontSize: 16, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {graphState.graphName || 'Execution'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, color: isDark ? '#cbd5e1' : '#475569', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: running ? '#2563eb' : '#16a34a',
                      boxShadow: running ? '0 0 0 6px rgba(37,99,235,0.14)' : 'none',
                    }}
                  />
                  {running ? 'running' : 'settled'}
                </span>
                {graphState.hiddenCount > 0 && <span>{graphState.hiddenCount} hidden</span>}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <LegendChip label="Step" kind="step" isDark={isDark} />
                {hasHistoryGraph && <LegendChip label="Turn" kind="turn" isDark={isDark} />}
                <LegendChip label="MTP" kind="mtp_block" isDark={isDark} />
                <LegendChip label="Skill" kind="skill_block" isDark={isDark} />
                <LegendChip label="HITL" kind="hitl" isDark={isDark} />
              </div>
            </div>
          </div>

          <NodeDetailModal node={panelNode} isDark={isDark} onClose={() => setPanelNodeId(null)} />
        </div>

        <div
          style={{
            width: 360,
            minWidth: 360,
            height: '100%',
            borderLeft: `1px solid ${borderColor}`,
            background: panelBg,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 18px',
              borderBottom: `1px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: isDark ? '#94a3b8' : '#64748b' }}>
              {selectedNode ? 'Node Detail' : 'Timeline'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>
              <Clock3 size={14} />
              {graphState.timeline.length} events
            </div>
          </div>

          <div style={{ minHeight: 0, flex: 1 }}>
            {selectedNode ? (
              <DetailPanel
                node={selectedNode}
                isDark={isDark}
                onClose={() => setSelectedNodeId(null)}
                onOpenPanel={() => setPanelNodeId(selectedNode.id)}
              />
            ) : (
              <TimelinePanel entries={graphState.timeline} isDark={isDark} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
