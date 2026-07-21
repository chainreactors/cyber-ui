// LEGACY APG tier: no in-repo consumers and no Go producer — AOP
// (lib/aop-reducer.ts) is the only live message implementation.
// Kept intact pending a consumer-side refactor to AOP.

import { MarkerType, type Edge, type Node } from '@xyflow/react'

import type { ExecutionGraphState } from './execution-graph'
import type { APGEvent } from '../types/protocol'
import type {
  ExecutionAccentKind,
  ExecutionEventRecord,
  ExecutionGraphNodeData,
  ExecutionGraphNodeMetrics,
  ExecutionGraphNodeKind,
  ExecutionNodeStatus,
  ExecutionTimelineEntry,
} from '../types/execution-graph'
import type { TokenUsageSummary } from './token-usage'
import {
  formatTokenUsageLong,
  formatTokenUsageShort,
  mergeTokenUsage,
  normalizeTokenUsage,
} from './token-usage'

type NodeEventRecord = ExecutionEventRecord | APGEvent

type EntityRecord = {
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
  childIds: string[]
  childIdSet: Set<string>
  details: Record<string, unknown>
  eventHistory: NodeEventRecord[]
  metrics: ExecutionGraphNodeMetrics
  order: number
  badge: string
}

type StepWindow = {
  entityId: string
  nodeKey: string
  startIndex: number
  endIndex: number | null
}

type TurnWindow = {
  entityId: string
  turnId: string
  stepId: string
  startIndex: number
  endIndex: number | null
}

type ToolCallRecord = {
  callId: string
  parentCallId: string | null
  callDepth: number
  namespace: string
  toolset: string
  toolName: string
  qualifiedName: string
  infraType: string
  cwd: string
  args: unknown[]
  kwargs: Record<string, unknown>
  result: unknown
  error: string
  durationMs: number
  startedAt: string
  finishedAt: string
  status: ExecutionNodeStatus
  order: number
  stepEntityId: string | null
  turnEntityId: string | null
  eventHistory: APGEvent[]
}

type NodeLayoutSize = {
  width: number
  height: number
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
}

function parseJsonString(value: string): unknown {
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function normalizeOutputPayload(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === 'string') {
    const parsed = parseJsonString(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  }
  return {}
}

function outputAttemptSummary(output: Record<string, unknown>): string {
  const explicit = asString(output.attempt_summary) || asString(output.summary)
  if (explicit) return explicit

  const message = asString(output.message)
  if (!message) return ''
  const parsed = normalizeOutputPayload(message)
  return asString(parsed.attempt_summary) || asString(parsed.summary) || message
}

function outputCandidateResult(output: Record<string, unknown>): Record<string, unknown> {
  const candidate = asObject(output.candidate_result)
  if (Object.keys(candidate).length > 0) return candidate

  const data = asObject(output.data)
  if (Object.keys(data).length > 0) return data

  const message = asString(output.message)
  const parsed = normalizeOutputPayload(message)
  const parsedCandidate = asObject(parsed.candidate_result)
  if (Object.keys(parsedCandidate).length > 0) return parsedCandidate

  return {}
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order)
}

function sortNodeEvents(events: NodeEventRecord[]): NodeEventRecord[] {
  return [...events].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
}

function normalizeExecutionStatus(value: string, phase: string): ExecutionNodeStatus {
  if (value === 'error') return 'error'
  if (value === 'pending') return 'pending'
  if (value === 'completed') return 'completed'
  if (value === 'running' || phase === 'started') return 'running'
  if (phase === 'requested') return 'pending'
  return 'completed'
}

function aggregateStatus(statuses: ExecutionNodeStatus[]): ExecutionNodeStatus {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('pending')) return 'pending'
  if (statuses.includes('running')) return 'running'
  return 'completed'
}

function joinSummary(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ')
}

function tokenUsageForEntity(entity: EntityRecord): TokenUsageSummary | null {
  return normalizeTokenUsage(entity.details.token_usage)
    ?? (entity.metrics.tokenUsage as TokenUsageSummary | undefined)
    ?? null
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return ''
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`
}

function visibleUserMessage(prompt: string): string {
  const startTag = '<user-message>'
  const endTag = '</user-message>'
  const start = prompt.indexOf(startTag)
  const end = prompt.indexOf(endTag)
  if (start !== -1 && end !== -1 && end > start) {
    return prompt.slice(start + startTag.length, end).trim()
  }

  const userIntent = markdownSection(prompt, 'user-intent')
    || xmlSection(prompt, 'user-intent')
    || xmlSection(prompt, 'goal')
  if (userIntent) return userIntent

  const trimmed = prompt.trim()
  if (isInternalPrompt(trimmed)) return 'Internal execution prompt'
  return trimmed
}

function markdownSection(content: string, section: string): string {
  const pattern = new RegExp(`(?:^|\\n)#\\s+${escapeRegex(section)}\\s*\\n([\\s\\S]*?)(?=\\n#\\s+|$)`, 'i')
  const match = content.match(pattern)
  return match?.[1]?.trim() ?? ''
}

function xmlSection(content: string, tag: string): string {
  const pattern = new RegExp(`<${escapeRegex(tag)}>\\s*([\\s\\S]*?)\\s*<\\/${escapeRegex(tag)}>`, 'i')
  const match = content.match(pattern)
  return match?.[1]?.trim() ?? ''
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isInternalPrompt(content: string): boolean {
  if (!content) return true
  if (/^Summarize the node output\b/i.test(content)) return true
  if (/^##\s+Evaluation\b/i.test(content)) return true
  if (content.includes('# skills') && content.includes('# node') && content.includes('# turn-context')) return true
  return false
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  const texts: string[] = []
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) continue
    const record = part as Record<string, unknown>
    if (record.part_kind !== 'text') continue
    if (typeof record.content === 'string' && record.content) {
      texts.push(record.content)
    }
  }
  return texts.join('')
}

function extractUserPromptFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  const texts: string[] = []
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) continue
    const record = part as Record<string, unknown>
    if (record.part_kind !== 'user-prompt') continue
    if (typeof record.content === 'string' && record.content) {
      texts.push(record.content)
    }
  }
  return texts.join('')
}

function asExecutionEventRecord(event: APGEvent): ExecutionEventRecord | null {
  if (event.event_type !== 'ExecutionGraphEvent') return null
  const data = asObject(event.data)
  return {
    timestamp: asString(data.timestamp) || event.timestamp,
    execution_id: asString(data.execution_id),
    session_id: asString(data.session_id) || asString(event.session_id),
    event_name: asString(data.event_name),
    kind: asString(data.kind),
    phase: asString(data.phase),
    entity_id: asString(data.entity_id),
    parent_id: asString(data.parent_id) || null,
    node_id: asString(data.node_id) || null,
    label: asString(data.label),
    status: asString(data.status),
    data: asObject(data.data),
  }
}

function baseEntity(
  order: number,
  kind: ExecutionGraphNodeKind,
  accentKind: ExecutionAccentKind,
  id: string,
  label: string,
): EntityRecord {
  return {
    id,
    parentId: null,
    kind,
    accentKind,
    stepId: null,
    label,
    title: label,
    summary: '',
    status: 'completed',
    nodeId: null,
    nodeType: '',
    step: 0,
    childIds: [],
    childIdSet: new Set<string>(),
    details: {},
    eventHistory: [],
    metrics: {},
    order,
    badge: kind.replace('_', ' '),
  }
}

function ensureEntity(
  entities: Map<string, EntityRecord>,
  id: string,
  create: () => EntityRecord,
): EntityRecord {
  const existing = entities.get(id)
  if (existing) return existing
  const next = create()
  entities.set(id, next)
  return next
}

function linkEntity(parent: EntityRecord | null, child: EntityRecord): void {
  if (parent === null) return
  child.parentId = parent.id
  child.stepId = child.stepId || parent.stepId || (parent.kind === 'step' ? parent.id : null)
  if (parent.childIdSet.has(child.id)) return
  parent.childIdSet.add(child.id)
  parent.childIds.push(child.id)
}

function latestStepForNode(stepWindows: StepWindow[], nodeKey: string, openOnly = false): StepWindow | null {
  for (let index = stepWindows.length - 1; index >= 0; index -= 1) {
    const step = stepWindows[index]
    if (nodeKey && step.nodeKey !== nodeKey) continue
    if (openOnly && step.endIndex !== null) continue
    return step
  }
  return null
}

function latestTurnForStep(turnWindows: TurnWindow[], stepId: string): TurnWindow | null {
  for (let index = turnWindows.length - 1; index >= 0; index -= 1) {
    const turn = turnWindows[index]
    if (turn.stepId === stepId) return turn
  }
  return null
}

function collectChildTools(entity: EntityRecord, entities: Map<string, EntityRecord>): EntityRecord[] {
  return sortByOrder(
    entity.childIds
      .map((childId) => entities.get(childId))
      .filter((child): child is EntityRecord => Boolean(child && child.kind === 'tool')),
  )
}

function collectDescendantTools(entity: EntityRecord, entities: Map<string, EntityRecord>): EntityRecord[] {
  const result: EntityRecord[] = []
  const queue = [...entity.childIds]
  while (queue.length > 0) {
    const nextId = queue.shift()
    if (!nextId) continue
    const next = entities.get(nextId)
    if (!next || next.kind !== 'tool') continue
    result.push(next)
    queue.push(...next.childIds)
  }
  return sortByOrder(result)
}

function buildToolDigest(
  block: EntityRecord,
  entities: Map<string, EntityRecord>,
): {
  preview: Array<Record<string, unknown>>
  tree: Array<Record<string, unknown>>
  rootCount: number
  leafCount: number
} {
  const roots = collectChildTools(block, entities)
  const tree: Array<Record<string, unknown>> = []
  let leafCount = 0

  function visit(tool: EntityRecord, depth: number): void {
    const children = collectChildTools(tool, entities)
    if (children.length === 0) leafCount += 1
    tree.push({
      id: tool.id,
      title: tool.title,
      label: tool.label,
      qualified_name: asString(tool.details.qualified_name) || asString(tool.details.tool_name),
      status: tool.status,
      duration_ms: asNumber(tool.details.duration_ms),
      depth,
      child_count: children.length,
    })
    for (const child of children) {
      visit(child, depth + 1)
    }
  }

  for (const root of roots) {
    visit(root, 0)
  }

  return {
    preview: tree.slice(0, 4),
    tree,
    rootCount: roots.length,
    leafCount,
  }
}

function toolSummary(entity: EntityRecord): string {
  return joinSummary([
    asString(entity.details.summary),
    asNumber(entity.details.duration_ms) > 0 ? formatDuration(asNumber(entity.details.duration_ms)) : '',
    entity.childIds.length > 0 ? `${entity.childIds.length} nested` : '',
  ]) || 'tool call'
}

function mtpBlockSummary(metrics: ExecutionGraphNodeMetrics, details: Record<string, unknown>): string {
  return joinSummary([
    metrics.totalCalls ? `${metrics.totalCalls} calls` : '',
    metrics.rootCount ? `${metrics.rootCount} branches` : '',
    metrics.maxDepth ? `depth ${metrics.maxDepth}` : '',
    metrics.totalDurationMs ? formatDuration(asNumber(metrics.totalDurationMs)) : '',
    metrics.errorCount ? `${metrics.errorCount} errors` : '',
    joinSummary([asString(details.namespace), asString(details.toolset)]),
  ]) || 'mtp block'
}

function stepSummary(entity: EntityRecord): string {
  const tokenUsage = tokenUsageForEntity(entity)
  return joinSummary([
    entity.nodeType,
    entity.metrics.turnCount ? `${entity.metrics.turnCount} turns` : '',
    entity.metrics.mtpCount ? `${entity.metrics.mtpCount} mtp` : '',
    entity.metrics.toolCount ? `${entity.metrics.toolCount} tools` : '',
    tokenUsage ? formatTokenUsageShort(tokenUsage) : '',
    entity.metrics.skillCount ? `${entity.metrics.skillCount} skills` : '',
    entity.metrics.hitlCount ? `${entity.metrics.hitlCount} hitl` : '',
    typeof entity.details.eval_route_target === 'string' && entity.details.eval_route_target ? `→ ${entity.details.eval_route_target}` : '',
  ]) || 'execution step'
}

function turnSummary(entity: EntityRecord): string {
  const userText = asString(entity.details.user_text)
  const preview = userText ? `${userText.slice(0, 72)}${userText.length > 72 ? '...' : ''}` : ''
  const tokenUsage = tokenUsageForEntity(entity)
  return joinSummary([
    asString(entity.details.agent_name),
    tokenUsage ? formatTokenUsageShort(tokenUsage) : '',
    entity.metrics.mtpCount ? `${entity.metrics.mtpCount} mtp` : '',
    entity.metrics.toolCount ? `${entity.metrics.toolCount} tools` : '',
    entity.metrics.messageCount ? `${entity.metrics.messageCount} msgs` : '',
    preview,
  ]) || 'conversation turn'
}

function skillSummary(entity: EntityRecord): string {
  return joinSummary([
    asString(entity.details.description),
    asStringArray(entity.details.files).length > 0 ? `${asStringArray(entity.details.files).length} files` : '',
    asStringArray(entity.details.missing).length > 0 ? `${asStringArray(entity.details.missing).length} missing` : '',
  ]) || 'context skill'
}

function skillBlockSummary(entity: EntityRecord): string {
  return joinSummary([
    entity.metrics.skillCount ? `${entity.metrics.skillCount} skills` : '',
    entity.metrics.fileCount ? `${entity.metrics.fileCount} files` : '',
    entity.metrics.missingCount ? `${entity.metrics.missingCount} missing` : '',
  ]) || 'context injection'
}

function hitlSummary(entity: EntityRecord): string {
  return joinSummary([
    asString(entity.details.report_type) || 'checkpoint',
    asString(entity.details.title),
    entity.metrics.isResolved ? 'resolved' : entity.status,
  ]) || 'hitl checkpoint'
}

function historyNodeWidth(kind: ExecutionGraphNodeKind): number {
  if (kind === 'step') return 344
  if (kind === 'turn') return 316
  if (kind === 'mtp_block') return 328
  if (kind === 'hitl') return 308
  if (kind === 'skill_block') return 286
  return 252
}

function historyNodeBaseHeight(kind: ExecutionGraphNodeKind): number {
  if (kind === 'step') return 138
  if (kind === 'turn') return 126
  if (kind === 'mtp_block') return 188
  return 118
}

function estimateWrappedLines(text: string, charsPerLine: number, maxLines: number): number {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return 0
  return Math.min(Math.ceil(normalized.length / charsPerLine), maxLines)
}

function historyPreviewText(entity: EntityRecord): { primary: string; secondary: string } {
  if (entity.kind === 'step') {
    return {
      primary: asString(entity.details.attempt_summary) || entity.summary,
      secondary: asString(entity.details.eval_route_target) || entity.nodeType,
    }
  }
  if (entity.kind === 'turn') {
    return {
      primary: asString(entity.details.user_text) || entity.summary,
      secondary: asString(entity.details.assistant_text) || asString(entity.details.agent_name),
    }
  }
  if (entity.kind === 'mtp_block') {
    return {
      primary: asString(entity.details.qualified_name) || entity.summary,
      secondary: '',
    }
  }
  if (entity.kind === 'hitl') {
    return {
      primary: asString(entity.details.report_type) || entity.summary,
      secondary: asString(entity.details.response) || asString(entity.details.content),
    }
  }
  return {
    primary: entity.summary,
    secondary: '',
  }
}

function historyMetricChipCount(entity: EntityRecord): number {
  let count = 0
  if ((entity.kind === 'step' || entity.kind === 'turn') && tokenUsageForEntity(entity)) count += 1

  if (entity.kind === 'step') {
    if (entity.metrics.turnCount) count += 1
    if (entity.metrics.toolCount) count += 1
    if (entity.metrics.skillCount) count += 1
  } else if (entity.kind === 'turn') {
    if (entity.metrics.messageCount) count += 1
    if (entity.metrics.toolCount) count += 1
    if (entity.metrics.mtpCount) count += 1
  } else if (entity.kind === 'mtp_block') {
    if (entity.metrics.totalCalls) count += 1
    if (entity.metrics.maxDepth) count += 1
  }

  return Math.min(count, 4)
}

function estimatedHistoryNodeHeight(entity: EntityRecord): number {
  const baseHeight = historyNodeBaseHeight(entity.kind)
  const { primary, secondary } = historyPreviewText(entity)
  const title = entity.title || entity.label
  const titleLines = estimateWrappedLines(title, entity.kind === 'step' ? 24 : 28, entity.kind === 'step' ? 2 : 1)
  const primaryLines = estimateWrappedLines(primary, entity.kind === 'turn' ? 48 : 44, entity.kind === 'step' ? 4 : 3)
  const secondaryLines = estimateWrappedLines(secondary, entity.kind === 'turn' ? 50 : 46, 2)
  const chipRows = Math.ceil(historyMetricChipCount(entity) / 2)

  return baseHeight
    + Math.max(0, titleLines - 1) * 18
    + Math.max(0, primaryLines - (entity.kind === 'step' ? 2 : 1)) * 18
    + Math.max(0, secondaryLines - 1) * 16
    + Math.max(0, chipRows - 1) * 22
}

function historyNodeSize(entity: EntityRecord, nodeLayoutSizes: Record<string, NodeLayoutSize>): NodeLayoutSize {
  const measured = nodeLayoutSizes[entity.id]
  if (
    measured
    && Number.isFinite(measured.width)
    && Number.isFinite(measured.height)
    && measured.width > 0
    && measured.height > 0
  ) {
    return measured
  }

  return {
    width: historyNodeWidth(entity.kind),
    height: estimatedHistoryNodeHeight(entity),
  }
}

function historyNodeColumn(entity: EntityRecord): number {
  if (entity.kind === 'step') return 0
  if (entity.kind === 'turn' || entity.kind === 'hitl' || entity.kind === 'skill_block') return 1
  if (entity.kind === 'mtp_block' || entity.kind === 'skill') return 2
  if (entity.kind === 'tool') return 3 + Math.max(0, asNumber(entity.details.call_depth))
  return 0
}

function layoutExecutionHistoryTree(
  visibleEntities: EntityRecord[],
  nodeLayoutSizes: Record<string, NodeLayoutSize> = {},
): Map<string, { x: number; y: number }> {
  const entityById = new Map(visibleEntities.map((entity) => [entity.id, entity]))
  const positions = new Map<string, { x: number; y: number }>()
  const subtreeHeightCache = new Map<string, number>()
  const columnWidth = new Map<number, number>()
  const columnX = new Map<number, number>()
  const sizeCache = new Map<string, NodeLayoutSize>()
  const horizontalGap = 120
  const verticalGap = 40
  const stepGap = 96

  function sizeOf(entity: EntityRecord): NodeLayoutSize {
    const cached = sizeCache.get(entity.id)
    if (cached) return cached
    const size = historyNodeSize(entity, nodeLayoutSizes)
    sizeCache.set(entity.id, size)
    return size
  }

  for (const entity of visibleEntities) {
    const column = historyNodeColumn(entity)
    columnWidth.set(column, Math.max(columnWidth.get(column) ?? 0, sizeOf(entity).width))
  }

  let nextX = 0
  for (const column of [...columnWidth.keys()].sort((left, right) => left - right)) {
    columnX.set(column, nextX)
    nextX += (columnWidth.get(column) ?? 320) + horizontalGap
  }

  function childrenOf(entity: EntityRecord): EntityRecord[] {
    return sortByOrder(
      entity.childIds
        .map((childId) => entityById.get(childId))
        .filter((child): child is EntityRecord => Boolean(child)),
    )
  }

  function subtreeHeight(entityId: string): number {
    const cached = subtreeHeightCache.get(entityId)
    if (cached !== undefined) return cached
    const entity = entityById.get(entityId)
    if (!entity) return 0
    const children = childrenOf(entity)
    const ownHeight = sizeOf(entity).height
    if (children.length === 0) {
      subtreeHeightCache.set(entityId, ownHeight)
      return ownHeight
    }
    const stackedChildrenHeight = children.reduce((sum, child, index) => (
      sum + subtreeHeight(child.id) + (index > 0 ? verticalGap : 0)
    ), 0)
    const totalHeight = Math.max(ownHeight, stackedChildrenHeight)
    subtreeHeightCache.set(entityId, totalHeight)
    return totalHeight
  }

  function placeEntity(entity: EntityRecord, topY: number) {
    const totalHeight = subtreeHeight(entity.id)
    const ownHeight = sizeOf(entity).height
    positions.set(entity.id, {
      x: columnX.get(historyNodeColumn(entity)) ?? 0,
      y: topY + Math.max((totalHeight - ownHeight) / 2, 0),
    })

    const children = childrenOf(entity)
    if (children.length === 0) return

    const stackedChildrenHeight = children.reduce((sum, child, index) => (
      sum + subtreeHeight(child.id) + (index > 0 ? verticalGap : 0)
    ), 0)
    let childTop = topY + Math.max((totalHeight - stackedChildrenHeight) / 2, 0)
    for (const child of children) {
      placeEntity(child, childTop)
      childTop += subtreeHeight(child.id) + verticalGap
    }
  }

  let nextY = 0
  const roots = sortByOrder(visibleEntities.filter((entity) => entity.kind === 'step'))
  for (const root of roots) {
    const totalHeight = subtreeHeight(root.id)
    placeEntity(root, nextY)
    nextY += totalHeight + stepGap
  }

  return positions
}

function eventTitle(event: APGEvent): string {
  if (event.event_type === 'NodeStartEvent') {
    const data = asObject(event.data)
    return asString(data.node_name) || asString(data.node_id) || 'Node start'
  }
  if (event.event_type === 'NodeOutputEvent') {
    const data = asObject(event.data)
    return asString(data.node_id) || 'Node output'
  }
  if (event.event_type === 'ConversationTurnStartEvent') {
    const data = asObject(event.data)
    return asString(data.agent_name) || 'Turn started'
  }
  if (event.event_type === 'ConversationTurnCompleteEvent') {
    const data = asObject(event.data)
    return asString(data.agent_name) || 'Turn completed'
  }
  if (event.event_type === 'MtpToolCallStartEvent' || event.event_type === 'MtpToolCallCompleteEvent') {
    const data = asObject(event.data)
    return asString(data.qualified_name) || asString(data.tool_name) || 'MTP tool'
  }
  if (event.event_type === 'TaskReportEvent') {
    const data = asObject(event.data)
    return asString(data.title) || 'Task report'
  }
  const executionEvent = asExecutionEventRecord(event)
  if (executionEvent) {
    return executionEvent.label || executionEvent.entity_id || executionEvent.event_name
  }
  return event.event_type
}

function eventDetail(event: APGEvent): string {
  if (event.event_type === 'NodeStartEvent') {
    const data = asObject(event.data)
    return joinSummary([asString(data.node_type), asNumber(data.step) > 0 ? `step ${asNumber(data.step)}` : '']) || 'node started'
  }
  if (event.event_type === 'ConversationTurnStartEvent') {
    const data = asObject(event.data)
    return visibleUserMessage(asString(data.user_prompt))
  }
  if (event.event_type === 'ConversationTurnCompleteEvent') {
    const data = asObject(event.data)
    const tokenUsage = normalizeTokenUsage(data.total_usage)
    return joinSummary([
      asString(data.agent_name) || 'turn completed',
      tokenUsage ? formatTokenUsageLong(tokenUsage) : '',
    ]) || 'turn completed'
  }
  if (event.event_type === 'MtpToolCallStartEvent') {
    return 'tool call started'
  }
  if (event.event_type === 'MtpToolCallCompleteEvent') {
    const data = asObject(event.data)
    return asString(data.error) || formatDuration(asNumber(data.duration_ms)) || 'tool call completed'
  }
  const executionEvent = asExecutionEventRecord(event)
  if (executionEvent) {
    return joinSummary([
      executionEvent.kind,
      executionEvent.phase,
      asString(executionEvent.data.reasoning),
      asString(executionEvent.data.report_type),
    ]) || executionEvent.event_name
  }
  return ''
}

export function reduceExecutionHistoryTimeline(historyEvents: APGEvent[]): ExecutionTimelineEntry[] {
  const timeline: ExecutionTimelineEntry[] = []
  for (const event of historyEvents) {
    if (
      event.event_type === 'TextPartEvent'
      || event.event_type === 'ModelRequestEvent'
      || event.event_type === 'ModelResponseEvent'
      || event.event_type === 'SystemPromptPartEvent'
      || event.event_type === 'UserPromptPartEvent'
      || event.event_type === 'MessageStartEvent'
      || event.event_type === 'ModelResponseCompleteEvent'
    ) {
      continue
    }

    const executionEvent = asExecutionEventRecord(event)
    if (executionEvent?.kind === 'tool') continue

    let status: ExecutionNodeStatus = 'completed'
    if (event.event_type === 'NodeStartEvent' || event.event_type === 'ConversationTurnStartEvent' || event.event_type === 'MtpToolCallStartEvent') {
      status = 'running'
    } else if (event.event_type === 'ErrorEvent' || event.event_type === 'PanicEvent') {
      status = 'error'
    } else if (event.event_type === 'ExecutionCompleteEvent') {
      status = asBoolean(asObject(event.data).success) ? 'completed' : 'error'
    } else if (executionEvent) {
      status = normalizeExecutionStatus(executionEvent.status, executionEvent.phase)
    }

    timeline.push({
      id: `${event.timestamp}:${event.event_type}:${timeline.length}`,
      label: eventTitle(event),
      detail: eventDetail(event),
      timestamp: event.timestamp,
      status,
      kind: executionEvent?.kind || event.event_type,
    })
  }
  return timeline
}

export function reduceExecutionHistoryGraphState(
  historyEvents: APGEvent[],
  expandedIds: Iterable<string> = [],
  nodeLayoutSizes: Record<string, NodeLayoutSize> = {},
): ExecutionGraphState {
  const timeline = reduceExecutionHistoryTimeline(historyEvents)
  if (historyEvents.length === 0) {
    return {
      executionId: '',
      graphName: '',
      isRunning: false,
      nodes: [],
      edges: [],
      timeline,
      hiddenCount: 0,
    }
  }

  const entities = new Map<string, EntityRecord>()
  const expanded = new Set(expandedIds)
  const orderRef = { current: 0 }
  const stepWindows: StepWindow[] = []
  const turnWindows: TurnWindow[] = []
  const turnByTurnId = new Map<string, TurnWindow>()
  const toolCalls = new Map<string, ToolCallRecord>()
  const syntheticTurns = new Map<string, string>()

  let executionId = ''
  let graphName = ''
  let isRunning = false
  let currentStepId: string | null = null
  let currentTurnId: string | null = null

  function createStep(nodeKey: string, data: Record<string, unknown>, index: number): StepWindow {
    const stepIndex = stepWindows.length + 1
    const stepId = `step:${stepIndex}:${nodeKey || stepIndex}`
    const entity = ensureEntity(entities, stepId, () => {
      const next = baseEntity(orderRef.current++, 'step', 'step', stepId, asString(data.node_name) || nodeKey || `Step ${stepIndex}`)
      next.badge = 'step'
      next.stepId = stepId
      next.nodeId = asString(data.node_id) || nodeKey || null
      next.nodeType = asString(data.node_type)
      next.step = asNumber(data.step) || stepIndex
      next.status = 'running'
      next.details = { ...data }
      next.eventHistory = []
      return next
    })
    entity.label = asString(data.node_name) || entity.label || nodeKey || `Step ${stepIndex}`
    entity.title = entity.label
    entity.nodeId = asString(data.node_id) || entity.nodeId
    entity.nodeType = asString(data.node_type) || entity.nodeType
    entity.step = asNumber(data.step) || entity.step || stepIndex
    entity.status = 'running'
    entity.details = { ...entity.details, ...data }
    const window = { entityId: stepId, nodeKey, startIndex: index, endIndex: null }
    stepWindows.push(window)
    currentStepId = stepId
    return window
  }

  function resolveStep(nodeKey: string, data: Record<string, unknown>, index: number, openOnly = false): StepWindow {
    return latestStepForNode(stepWindows, nodeKey, openOnly)
      ?? latestStepForNode(stepWindows, nodeKey)
      ?? createStep(nodeKey, data, index)
  }

  function ensureTurn(stepEntity: EntityRecord, data: Record<string, unknown>, event: APGEvent, index: number, synthetic = false): TurnWindow {
    const turnId = asString(data.turn_id) || `${stepEntity.id}:turn:${turnWindows.length + 1}`
    const existing = turnByTurnId.get(turnId)
    if (existing) {
      const entity = entities.get(existing.entityId)
      if (entity && !entity.eventHistory.includes(event)) {
        entity.eventHistory.push(event)
        entity.details = { ...entity.details, ...data }
      }
      return existing
    }

    const turnIndex = turnWindows.length + 1
    const entityId = `turn:${turnIndex}:${turnId}`
    const entity = ensureEntity(entities, entityId, () => {
      const next = baseEntity(orderRef.current++, 'turn', 'turn', entityId, `Turn ${turnIndex}`)
      next.badge = 'turn'
      next.stepId = stepEntity.id
      next.nodeId = stepEntity.nodeId
      next.nodeType = stepEntity.nodeType
      next.step = stepEntity.step
      next.status = synthetic ? 'completed' : 'running'
      next.title = `Turn ${turnIndex}`
      next.details = {
        ...data,
        synthetic,
      }
      next.eventHistory = []
      return next
    })
    linkEntity(stepEntity, entity)
    const window = {
      entityId,
      turnId,
      stepId: stepEntity.id,
      startIndex: index,
      endIndex: synthetic ? index : null,
    }
    turnWindows.push(window)
    turnByTurnId.set(turnId, window)
    if (synthetic) {
      syntheticTurns.set(stepEntity.id, entityId)
    }
    return window
  }

  function ensureSyntheticTurn(stepEntity: EntityRecord): EntityRecord {
    const existingId = syntheticTurns.get(stepEntity.id)
    if (existingId) {
      return entities.get(existingId) as EntityRecord
    }
    const turn = ensureTurn(stepEntity, { synthetic: true }, {
      event_type: 'ConversationTurnCompleteEvent',
      session_id: '',
      timestamp: stepEntity.eventHistory[0]?.timestamp || '',
      data: { synthetic: true },
    }, stepWindows.find((item) => item.entityId === stepEntity.id)?.startIndex ?? 0, true)
    return entities.get(turn.entityId) as EntityRecord
  }

  function ensureSkillBlock(stepEntity: EntityRecord): EntityRecord {
    const blockId = `${stepEntity.id}::skills`
    const block = ensureEntity(entities, blockId, () => {
      const next = baseEntity(orderRef.current++, 'skill_block', 'skill', blockId, 'skills')
      next.badge = 'skills'
      next.stepId = stepEntity.id
      next.nodeId = stepEntity.nodeId
      next.nodeType = stepEntity.nodeType
      next.step = stepEntity.step
      next.title = 'Context Skills'
      return next
    })
    linkEntity(stepEntity, block)
    return block
  }

  for (const [index, event] of historyEvents.entries()) {
    const data = asObject(event.data)
    if (event.event_type === 'ExecutionStartEvent') {
      executionId = executionId || asString(data.execution_id)
      graphName = asString(data.graph_name) || graphName
      isRunning = true
      continue
    }

    if (event.event_type === 'ExecutionCompleteEvent') {
      isRunning = false
      continue
    }

    if (event.event_type === 'NodeStartEvent') {
      const nodeKey = asString(data.node_id) || asString(data.node_name) || `node:${index}`
      const step = resolveStep(nodeKey, data, index, true)
      const entity = entities.get(step.entityId) as EntityRecord
      entity.label = asString(data.node_name) || entity.label || nodeKey
      entity.title = entity.label
      entity.nodeId = asString(data.node_id) || entity.nodeId
      entity.nodeType = asString(data.node_type) || entity.nodeType
      entity.step = asNumber(data.step) || entity.step
      entity.status = 'running'
      entity.details = { ...entity.details, ...data }
      entity.eventHistory.push(event)
      currentStepId = step.entityId
      continue
    }

    if (event.event_type === 'NodeInputEvent') {
      const nodeKey = asString(data.node_id) || asString(data.node_name)
      const step = resolveStep(nodeKey, data, index, true)
      const entity = entities.get(step.entityId) as EntityRecord
      entity.details = { ...entity.details, ...data }
      entity.eventHistory.push(event)
      currentStepId = step.entityId
      continue
    }

    if (event.event_type === 'NodeOutputEvent') {
      const nodeKey = asString(data.node_id) || asString(data.node_name)
      const step = resolveStep(nodeKey, data, index, true)
      step.endIndex = index
      const entity = entities.get(step.entityId) as EntityRecord
      const rawOutput = data.output
      const output = normalizeOutputPayload(rawOutput)
      const attemptSummary = outputAttemptSummary(output)
      const candidateResult = outputCandidateResult(output)
      const outputMessage = asString(output.message) || asString(rawOutput)
      const details: Record<string, unknown> = {
        ...entity.details,
        ...data,
        output: Object.keys(output).length > 0 ? output : rawOutput,
        raw_output: rawOutput,
      }
      if (attemptSummary) {
        details.attempt_summary = attemptSummary
      }
      if (outputMessage) {
        details.message = outputMessage
      }
      if (Object.keys(candidateResult).length > 0) {
        details.candidate_result = candidateResult
      }
      entity.status = 'completed'
      entity.title = asString(output.title) || entity.title
      entity.summary = asString(output.summary) || attemptSummary || outputMessage || entity.summary
      entity.details = details
      entity.eventHistory.push(event)
      currentStepId = currentStepId === step.entityId ? null : currentStepId
      continue
    }

    if (event.event_type === 'ErrorEvent' || event.event_type === 'PanicEvent') {
      const nodeKey = asString(data.node_id) || asString(data.node_name)
      const step = resolveStep(nodeKey, data, index, true)
      step.endIndex = index
      const entity = entities.get(step.entityId) as EntityRecord
      entity.status = 'error'
      entity.details = { ...entity.details, ...data }
      entity.summary = asString(data.message) || entity.summary
      entity.eventHistory.push(event)
      currentStepId = currentStepId === step.entityId ? null : currentStepId
      continue
    }

    if (event.event_type === 'ConversationTurnStartEvent') {
      const activeStep = currentStepId ? entities.get(currentStepId) : null
      const fallbackStep = activeStep?.kind === 'step'
        ? activeStep
        : stepWindows.length > 0
          ? entities.get(stepWindows[stepWindows.length - 1].entityId)
          : null
      if (!fallbackStep || fallbackStep.kind !== 'step') continue
      const turn = ensureTurn(fallbackStep, data, event, index)
      const entity = entities.get(turn.entityId) as EntityRecord
      entity.status = 'running'
      entity.title = `Turn ${turnWindows.length}`
      entity.details = {
        ...entity.details,
        turn_id: asString(data.turn_id),
        agent_name: asString(data.agent_name),
        user_prompt: asString(data.user_prompt),
        user_text: visibleUserMessage(asString(data.user_prompt)),
      }
      entity.eventHistory.push(event)
      currentTurnId = turn.entityId
      continue
    }

    if (
      event.event_type === 'TextPartEvent'
      || event.event_type === 'ModelRequestEvent'
      || event.event_type === 'ModelResponseEvent'
      || event.event_type === 'ModelResponseCompleteEvent'
      || event.event_type === 'ConversationTurnCompleteEvent'
    ) {
      const turnId = asString(data.turn_id)
      const turnWindow = turnByTurnId.get(turnId)
      if (!turnWindow) continue
      const entity = entities.get(turnWindow.entityId)
      if (!entity || entity.kind !== 'turn') continue
      entity.eventHistory.push(event)
      if (event.event_type === 'TextPartEvent') {
        const assistantParts = asStringArray(entity.details.assistant_parts)
        assistantParts.push(asString(data.content))
        entity.details = {
          ...entity.details,
          assistant_parts: assistantParts,
        }
      } else if (event.event_type === 'ModelRequestEvent') {
        const userText = extractUserPromptFromParts(data.parts)
        entity.details = {
          ...entity.details,
          user_text: userText || asString(entity.details.user_text),
        }
      } else if (event.event_type === 'ModelResponseEvent') {
        const responseUsage = normalizeTokenUsage(data.usage)
        entity.details = {
          ...entity.details,
          assistant_text: extractTextFromParts(data.parts),
          response_usage: mergeTokenUsage(
            normalizeTokenUsage(entity.details.response_usage),
            responseUsage,
          ) ?? undefined,
        }
      } else if (event.event_type === 'ModelResponseCompleteEvent') {
        const responseUsage = normalizeTokenUsage(data.usage)
        entity.details = {
          ...entity.details,
          response_usage: mergeTokenUsage(
            normalizeTokenUsage(entity.details.response_usage),
            responseUsage,
          ) ?? undefined,
        }
      } else {
        const turnUsage = normalizeTokenUsage(data.total_usage)
          ?? normalizeTokenUsage(entity.details.response_usage)
        turnWindow.endIndex = index
        entity.status = 'completed'
        entity.details = {
          ...entity.details,
          completed: true,
          message_total: asNumber(data.total_messages),
          token_usage: turnUsage ?? undefined,
        }
        if (currentTurnId === entity.id) currentTurnId = null
      }
      continue
    }

    if (event.event_type === 'MtpToolCallStartEvent' || event.event_type === 'MtpToolCallCompleteEvent') {
      const callId = asString(data.call_id)
      if (!callId) continue
      const activeStep = currentStepId ? entities.get(currentStepId) : null
      const turnEntity = currentTurnId
        ? entities.get(currentTurnId)
        : activeStep && activeStep.kind === 'step'
          ? entities.get(latestTurnForStep(turnWindows, activeStep.id)?.entityId || '')
          : null
      const record = toolCalls.get(callId) ?? {
        callId,
        parentCallId: null,
        callDepth: 0,
        namespace: '',
        toolset: '',
        toolName: '',
        qualifiedName: '',
        infraType: '',
        cwd: '',
        args: [],
        kwargs: {},
        result: null,
        error: '',
        durationMs: 0,
        startedAt: '',
        finishedAt: '',
        status: 'running' as ExecutionNodeStatus,
        order: toolCalls.size,
        stepEntityId: activeStep && activeStep.kind === 'step' ? activeStep.id : turnEntity?.stepId ?? null,
        turnEntityId: turnEntity?.id ?? null,
        eventHistory: [],
      }
      record.parentCallId = asString(data.parent_call_id) || null
      record.callDepth = asNumber(data.call_depth)
      record.namespace = asString(data.namespace)
      record.toolset = asString(data.toolset)
      record.toolName = asString(data.tool_name)
      record.qualifiedName = asString(data.qualified_name)
      record.infraType = asString(data.infra_type)
      record.cwd = asString(data.cwd)
      record.args = asArray(data.args)
      record.kwargs = asObject(data.kwargs)
      record.stepEntityId = record.stepEntityId || (activeStep && activeStep.kind === 'step' ? activeStep.id : null)
      record.turnEntityId = record.turnEntityId || turnEntity?.id || null
      record.eventHistory.push(event)
      if (event.event_type === 'MtpToolCallStartEvent') {
        record.startedAt = event.timestamp
        record.status = 'running'
      } else {
        record.result = data.result
        record.error = asString(data.error)
        record.durationMs = asNumber(data.duration_ms)
        record.finishedAt = event.timestamp
        record.status = record.error ? 'error' : 'completed'
      }
      toolCalls.set(callId, record)
      continue
    }

    if (event.event_type === 'TaskReportEvent') {
      const stepEntity = currentStepId ? entities.get(currentStepId) : null
      if (stepEntity && stepEntity.kind === 'step') {
        stepEntity.details = {
          ...stepEntity.details,
          latest_report_title: asString(data.title),
          latest_report_type: asString(data.report_type),
          latest_report_content: asString(data.content),
        }
        stepEntity.eventHistory.push(event)
      }
      continue
    }

    const executionEvent = asExecutionEventRecord(event)
    if (!executionEvent) continue

    executionId = executionEvent.execution_id || executionId
    if (executionEvent.kind === 'execution') {
      graphName = asString(executionEvent.data.graph_name) || executionEvent.label || graphName
      isRunning = normalizeExecutionStatus(executionEvent.status, executionEvent.phase) === 'running'
      continue
    }

    const nodeKey = executionEvent.node_id || executionEvent.entity_id || ''
    const step = nodeKey
      ? resolveStep(nodeKey, { node_id: nodeKey, node_name: executionEvent.label, node_type: asString(executionEvent.data.node_type), step: asNumber(executionEvent.data.step) }, index)
      : (stepWindows[stepWindows.length - 1] ?? null)
    const stepEntity = step ? entities.get(step.entityId) : null
    if (!stepEntity || stepEntity.kind !== 'step') continue

    if (executionEvent.kind === 'node') {
      stepEntity.status = normalizeExecutionStatus(executionEvent.status, executionEvent.phase)
      stepEntity.title = executionEvent.label || stepEntity.title
      stepEntity.label = executionEvent.label || stepEntity.label
      stepEntity.nodeId = executionEvent.node_id || stepEntity.nodeId
      stepEntity.nodeType = asString(executionEvent.data.node_type) || stepEntity.nodeType
      stepEntity.step = asNumber(executionEvent.data.step) || stepEntity.step
      stepEntity.details = { ...stepEntity.details, ...executionEvent.data }
      stepEntity.eventHistory.push(event)
      if (executionEvent.phase === 'completed' && step.endIndex === null) {
        step.endIndex = index
      }
      continue
    }

    if (executionEvent.kind === 'eval') {
      stepEntity.details = {
        ...stepEntity.details,
        latest_eval_phase: executionEvent.phase,
      }
      if (executionEvent.phase === 'completed' || executionEvent.phase === 'routed') {
        stepEntity.details = {
          ...stepEntity.details,
          eval_route_target: asString(executionEvent.data.route_target) || asString(executionEvent.data.to),
          eval_reasoning: asString(executionEvent.data.reasoning),
          eval_reviewer: asString(executionEvent.data.reviewer),
        }
      }
      stepEntity.eventHistory.push(event)
      continue
    }

    if (executionEvent.kind === 'skill') {
      const skillId = `skill:${stepEntity.id}:${executionEvent.entity_id}`
      const skill = ensureEntity(entities, skillId, () => {
        const next = baseEntity(orderRef.current++, 'skill', 'skill', skillId, executionEvent.label || executionEvent.entity_id)
        next.badge = 'skill'
        next.stepId = stepEntity.id
        next.nodeId = stepEntity.nodeId
        next.nodeType = stepEntity.nodeType
        next.step = stepEntity.step
        return next
      })
      skill.status = normalizeExecutionStatus(executionEvent.status, executionEvent.phase)
      skill.label = executionEvent.label || skill.label
      skill.title = asString(executionEvent.data.title) || skill.label
      skill.details = { ...skill.details, ...executionEvent.data }
      skill.eventHistory.push(event)
      linkEntity(ensureSkillBlock(stepEntity), skill)
      continue
    }

    if (executionEvent.kind === 'hitl') {
      const hitlId = `hitl:${stepEntity.id}:${executionEvent.entity_id}`
      const hitl = ensureEntity(entities, hitlId, () => {
        const next = baseEntity(orderRef.current++, 'hitl', 'hitl', hitlId, executionEvent.label || executionEvent.entity_id)
        next.badge = 'hitl'
        next.stepId = stepEntity.id
        next.nodeId = stepEntity.nodeId
        next.nodeType = stepEntity.nodeType
        next.step = stepEntity.step
        return next
      })
      hitl.status = normalizeExecutionStatus(executionEvent.status, executionEvent.phase)
      hitl.label = executionEvent.label || hitl.label
      hitl.title = asString(executionEvent.data.title) || hitl.label
      hitl.details = { ...hitl.details, ...executionEvent.data }
      hitl.eventHistory.push(event)
      linkEntity(stepEntity, hitl)
      continue
    }
  }

  const toolGroups = new Map<string, ToolCallRecord[]>()
  for (const call of sortByOrder([...toolCalls.values()])) {
    let turnEntity = call.turnEntityId ? entities.get(call.turnEntityId) : null
    const stepEntity = call.stepEntityId ? entities.get(call.stepEntityId) : null
    if ((!turnEntity || turnEntity.kind !== 'turn') && stepEntity && stepEntity.kind === 'step') {
      turnEntity = ensureSyntheticTurn(stepEntity)
      call.turnEntityId = turnEntity.id
    }
    if (!turnEntity || turnEntity.kind !== 'turn') continue
    const list = toolGroups.get(turnEntity.id) ?? []
    list.push(call)
    toolGroups.set(turnEntity.id, list)
  }

  for (const [turnId, calls] of toolGroups.entries()) {
    const turnEntity = entities.get(turnId)
    if (!turnEntity || turnEntity.kind !== 'turn') continue
    const toolsById = new Map<string, EntityRecord>()

    for (const call of calls) {
      const toolId = `tool:${call.callId}`
      const tool = ensureEntity(entities, toolId, () => {
        const next = baseEntity(orderRef.current++, 'tool', 'tool', toolId, call.qualifiedName || call.toolName || call.callId)
        next.badge = 'tool'
        next.stepId = turnEntity.stepId
        next.nodeId = turnEntity.nodeId
        next.nodeType = turnEntity.nodeType
        next.step = turnEntity.step
        return next
      })
      tool.status = call.status
      tool.label = call.qualifiedName || call.toolName || tool.label
      tool.title = call.qualifiedName || call.toolName || tool.title
      tool.details = {
        ...tool.details,
        call_id: call.callId,
        parent_call_id: call.parentCallId,
        call_depth: call.callDepth,
        namespace: call.namespace,
        toolset: call.toolset,
        tool_name: call.toolName,
        qualified_name: call.qualifiedName,
        infra_type: call.infraType,
        cwd: call.cwd,
        args: call.args,
        kwargs: call.kwargs,
        result: call.result,
        error: call.error,
        duration_ms: call.durationMs,
        started_at: call.startedAt,
        finished_at: call.finishedAt,
      }
      tool.eventHistory = sortNodeEvents([...tool.eventHistory, ...call.eventHistory])
      toolsById.set(call.callId, tool)
    }

    for (const call of calls) {
      const tool = toolsById.get(call.callId)
      if (!tool) continue
      const parentTool = call.parentCallId ? toolsById.get(call.parentCallId) : null
      if (parentTool) {
        linkEntity(parentTool, tool)
        continue
      }
      const blockId = `${turnEntity.id}::mtp:${call.callId}`
      const block = ensureEntity(entities, blockId, () => {
        const next = baseEntity(orderRef.current++, 'mtp_block', 'mtp', blockId, call.qualifiedName || call.toolName || 'mtp')
        next.badge = 'mtp'
        next.stepId = turnEntity.stepId
        next.nodeId = turnEntity.nodeId
        next.nodeType = turnEntity.nodeType
        next.step = turnEntity.step
        next.title = call.qualifiedName || call.toolName || 'MTP'
        next.details = {
          root_tool_id: tool.id,
          qualified_name: call.qualifiedName,
          namespace: call.namespace,
          toolset: call.toolset,
          title: call.qualifiedName || call.toolName,
        }
        return next
      })
      linkEntity(turnEntity, block)
      linkEntity(block, tool)
    }
  }

  for (const entity of sortByOrder([...entities.values()])) {
    if (entity.kind === 'tool') {
      entity.summary = toolSummary(entity)
      entity.metrics = {
        totalDurationMs: asNumber(entity.details.duration_ms),
        totalCalls: 1 + entity.childIds.length,
        errorCount: entity.status === 'error' ? 1 : 0,
        maxDepth: asNumber(entity.details.call_depth),
      }
      continue
    }

    if (entity.kind === 'mtp_block') {
      const tools = collectDescendantTools(entity, entities)
      const digest = buildToolDigest(entity, entities)
      const totalDurationMs = tools.reduce((sum, tool) => sum + asNumber(tool.details.duration_ms), 0)
      const errorCount = tools.filter((tool) => tool.status === 'error').length
      const maxDepth = tools.reduce((depth, tool) => Math.max(depth, asNumber(tool.details.call_depth)), 0)
      entity.eventHistory = sortNodeEvents(tools.flatMap((tool) => tool.eventHistory))
      entity.status = tools.length > 0 ? aggregateStatus(tools.map((tool) => tool.status)) : entity.status
      entity.metrics = {
        totalCalls: tools.length,
        totalDurationMs,
        errorCount,
        maxDepth,
        rootCount: digest.rootCount,
        leafCount: digest.leafCount,
      }
      entity.details = {
        ...entity.details,
        tool_ids: tools.map((tool) => tool.id),
        total_calls: tools.length,
        total_duration_ms: totalDurationMs,
        error_count: errorCount,
        max_depth: maxDepth,
        root_count: digest.rootCount,
        leaf_count: digest.leafCount,
        tool_preview: digest.preview,
        tool_tree: digest.tree,
        tool_overflow_count: Math.max(digest.tree.length - digest.preview.length, 0),
      }
      entity.summary = mtpBlockSummary(entity.metrics, entity.details)
      continue
    }

    if (entity.kind === 'turn') {
      const mtpBlocks = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child && child.kind === 'mtp_block'))
      const toolCount = mtpBlocks.reduce((sum, block) => sum + asNumber(block.metrics.totalCalls), 0)
      const assistantText = asString(entity.details.assistant_text)
        || asStringArray(entity.details.assistant_parts).join('')
      const tokenUsage = normalizeTokenUsage(entity.details.token_usage)
        ?? normalizeTokenUsage(entity.details.response_usage)
      entity.details = {
        ...entity.details,
        assistant_text: assistantText,
        token_usage: tokenUsage ?? undefined,
      }
      entity.status = entity.status === 'completed' ? 'completed' : aggregateStatus([
        entity.status,
        ...mtpBlocks.map((block) => block.status),
      ])
      entity.metrics = {
        mtpCount: mtpBlocks.length,
        toolCount,
        messageCount: (asString(entity.details.user_text) ? 1 : 0) + (assistantText ? 1 : 0),
        ...(tokenUsage
          ? {
              inputTokens: tokenUsage.inputTokens,
              outputTokens: tokenUsage.outputTokens,
              totalTokens: tokenUsage.totalTokens,
              cachedInputTokens: tokenUsage.cachedInputTokens,
              cacheReadInputTokens: tokenUsage.cacheReadInputTokens,
              cacheCreationInputTokens: tokenUsage.cacheCreationInputTokens,
              tokenUsage,
            }
          : {}),
      }
      entity.summary = turnSummary(entity)
      continue
    }

    if (entity.kind === 'skill') {
      entity.summary = skillSummary(entity)
      entity.metrics = {
        fileCount: asStringArray(entity.details.files).length,
        missingCount: asStringArray(entity.details.missing).length,
      }
      continue
    }

    if (entity.kind === 'skill_block') {
      const skills = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child && child.kind === 'skill'))
      entity.eventHistory = sortNodeEvents(skills.flatMap((skill) => skill.eventHistory))
      entity.status = skills.length > 0 ? aggregateStatus(skills.map((skill) => skill.status)) : entity.status
      entity.metrics = {
        skillCount: skills.length,
        fileCount: uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.files))).length,
        missingCount: uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.missing))).length,
      }
      entity.summary = skillBlockSummary(entity)
      entity.details = {
        ...entity.details,
        skill_names: skills.map((skill) => skill.title || skill.label),
        files: uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.files))),
        missing: uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.missing))),
      }
      continue
    }

    if (entity.kind === 'hitl') {
      entity.metrics = {
        isResolved: entity.status === 'completed',
        reportType: asString(entity.details.report_type),
      }
      entity.summary = hitlSummary(entity)
      continue
    }

    if (entity.kind === 'step') {
      const turns = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child && child.kind === 'turn'))
      const skillBlocks = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child && child.kind === 'skill_block'))
      const hitls = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child && child.kind === 'hitl'))
      const mtpCount = turns.reduce((sum, turn) => sum + asNumber(turn.metrics.mtpCount), 0)
      const toolCount = turns.reduce((sum, turn) => sum + asNumber(turn.metrics.toolCount), 0)
      const skillCount = skillBlocks.reduce((sum, block) => sum + asNumber(block.metrics.skillCount), 0)
      const tokenUsage = mergeTokenUsage(...turns.map((turn) => tokenUsageForEntity(turn)))
      entity.status = aggregateStatus([
        entity.status,
        ...turns.map((turn) => turn.status),
        ...skillBlocks.map((block) => block.status),
        ...hitls.map((hitl) => hitl.status),
      ])
      entity.details = {
        ...entity.details,
        token_usage: tokenUsage ?? undefined,
      }
      entity.metrics = {
        turnCount: turns.length,
        mtpCount,
        toolCount,
        skillCount,
        hitlCount: hitls.length,
        ...(tokenUsage
          ? {
              inputTokens: tokenUsage.inputTokens,
              outputTokens: tokenUsage.outputTokens,
              totalTokens: tokenUsage.totalTokens,
              cachedInputTokens: tokenUsage.cachedInputTokens,
              cacheReadInputTokens: tokenUsage.cacheReadInputTokens,
              cacheCreationInputTokens: tokenUsage.cacheCreationInputTokens,
              tokenUsage,
            }
          : {}),
      }
      entity.summary = entity.summary || stepSummary(entity)
      entity.eventHistory = sortNodeEvents(entity.eventHistory)
    }
  }

  const visibilityMemo = new Map<string, boolean>()
  const visibleNodes: Node<ExecutionGraphNodeData>[] = []
  const visibleNodeIds = new Set<string>()

  function isVisible(entity: EntityRecord): boolean {
    const cached = visibilityMemo.get(entity.id)
    if (cached !== undefined) return cached
    if (entity.kind === 'step') {
      visibilityMemo.set(entity.id, true)
      return true
    }
    if (!entity.parentId) {
      visibilityMemo.set(entity.id, false)
      return false
    }
    const parent = entities.get(entity.parentId)
    if (!parent || !isVisible(parent)) {
      visibilityMemo.set(entity.id, false)
      return false
    }
    const visible = expanded.has(parent.id)
    visibilityMemo.set(entity.id, visible)
    return visible
  }

  for (const entity of sortByOrder([...entities.values()])) {
    if (!isVisible(entity)) continue
    const collapsible = entity.childIds.length > 0
    const collapsed = collapsible && !expanded.has(entity.id)
    visibleNodeIds.add(entity.id)
    const estimatedSize = historyNodeSize(entity, nodeLayoutSizes)
    visibleNodes.push({
      id: entity.id,
      type: 'executionNode',
      position: { x: 0, y: 0 },
      measured: { width: estimatedSize.width, height: estimatedSize.height },
      data: {
        id: entity.id,
        parentId: entity.parentId,
        kind: entity.kind,
        accentKind: entity.accentKind,
        stepId: entity.stepId,
        label: entity.label,
        title: entity.title,
        summary: entity.summary,
        status: entity.status,
        nodeId: entity.nodeId,
        nodeType: entity.nodeType,
        step: entity.step,
        childCount: entity.childIds.length,
        collapsed,
        collapsible,
        badge: entity.badge,
        details: entity.details,
        eventHistory: entity.eventHistory,
        metrics: entity.metrics,
      },
    })
  }

  const edges: Edge[] = []
  const steps = stepWindows
    .map((window) => entities.get(window.entityId))
    .filter((entity): entity is EntityRecord => Boolean(entity && entity.kind === 'step'))

  for (let index = 0; index < steps.length - 1; index += 1) {
    const source = steps[index]
    const target = steps[index + 1]
    if (!visibleNodeIds.has(source.id) || !visibleNodeIds.has(target.id)) continue
    edges.push({
      id: `flow:${source.id}:${target.id}`,
      source: source.id,
      target: target.id,
      sourceHandle: 'bottom',
      targetHandle: 'top',
      type: 'smoothstep',
      animated: isRunning,
      style: { stroke: '#475569', strokeWidth: 2.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
    })
  }

  for (const entity of sortByOrder([...entities.values()])) {
    if (!entity.parentId) continue
    if (!visibleNodeIds.has(entity.id) || !visibleNodeIds.has(entity.parentId)) continue
    const stroke = entity.accentKind === 'turn'
      ? '#7c3aed'
      : entity.accentKind === 'mtp'
        ? '#2563eb'
        : entity.accentKind === 'tool'
          ? '#64748b'
          : entity.accentKind === 'skill'
            ? '#0f766e'
            : entity.accentKind === 'hitl'
              ? '#b45309'
              : '#4338ca'
    edges.push({
      id: `hier:${entity.parentId}:${entity.id}`,
      source: entity.parentId,
      target: entity.id,
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'smoothstep',
      style: {
        stroke,
        strokeWidth: entity.kind === 'turn' ? 1.8 : 1.6,
        strokeDasharray: entity.kind === 'turn' || entity.kind === 'mtp_block' ? '6 5' : undefined,
        opacity: 0.9,
      },
    })
  }

  const positionedEntities = sortByOrder(
    visibleNodes
      .map((node) => entities.get(node.id))
      .filter((entity): entity is EntityRecord => Boolean(entity)),
  )
  const positions = layoutExecutionHistoryTree(positionedEntities, nodeLayoutSizes)

  for (const node of visibleNodes) {
    const position = positions.get(node.id)
    if (position) node.position = position
  }

  return {
    executionId,
    graphName,
    isRunning,
    nodes: visibleNodes,
    edges,
    timeline,
    hiddenCount: Math.max(entities.size - visibleNodes.length, 0),
  }
}
