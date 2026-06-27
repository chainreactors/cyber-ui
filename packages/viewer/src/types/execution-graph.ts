import type { APGEvent } from './protocol'
import type { TokenUsageSummary } from '../lib/token-usage'

export interface ExecutionEventRecord {
  timestamp: string
  execution_id: string
  session_id: string
  event_name: string
  kind: string
  phase: string
  entity_id: string
  parent_id?: string | null
  node_id?: string | null
  label: string
  status: string
  data: Record<string, unknown>
}

export type ExecutionNodeStatus = 'pending' | 'running' | 'completed' | 'error'

export type ExecutionGraphNodeKind =
  | 'step'
  | 'turn'
  | 'mtp_block'
  | 'tool'
  | 'skill_block'
  | 'skill'
  | 'hitl'

export type ExecutionAccentKind = 'step' | 'turn' | 'mtp' | 'tool' | 'skill' | 'hitl'

export interface ExecutionGraphNodeMetrics extends Record<string, unknown> {
  turnCount?: number
  messageCount?: number
  mtpCount?: number
  toolCount?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  cachedInputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
  tokenUsage?: TokenUsageSummary
  totalCalls?: number
  totalDurationMs?: number
  errorCount?: number
  maxDepth?: number
  rootCount?: number
  leafCount?: number
  skillCount?: number
  hitlCount?: number
  missingCount?: number
  fileCount?: number
  isResolved?: boolean
  reportType?: string
}

export interface ExecutionGraphNodeData extends Record<string, unknown> {
  id: string
  parentId: string | null
  kind: ExecutionGraphNodeKind
  accentKind: ExecutionAccentKind
  stepId: string | null
  label: string
  title: string
  summary: string
  status: ExecutionNodeStatus
  nodeId: string | null
  nodeType: string
  step: number
  childCount: number
  collapsed: boolean
  collapsible: boolean
  badge: string
  details: Record<string, unknown>
  eventHistory: Array<ExecutionEventRecord | APGEvent>
  metrics: ExecutionGraphNodeMetrics
}

export interface ExecutionTimelineEntry {
  id: string
  label: string
  detail: string
  timestamp: string
  status: ExecutionNodeStatus
  kind: string
}
