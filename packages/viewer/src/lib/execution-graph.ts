import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { layoutDAG } from './graph-layout'
import type {
  ExecutionAccentKind,
  ExecutionEventRecord,
  ExecutionGraphNodeData,
  ExecutionGraphNodeKind,
  ExecutionGraphNodeMetrics,
  ExecutionNodeStatus,
  ExecutionTimelineEntry,
} from '../types/execution-graph'

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
  eventHistory: ExecutionEventRecord[]
  metrics: ExecutionGraphNodeMetrics
  order: number
  badge: string
  toolParentId: string | null
}

export interface ExecutionGraphState {
  executionId: string
  graphName: string
  isRunning: boolean
  nodes: Node<ExecutionGraphNodeData>[]
  edges: Edge[]
  timeline: ExecutionTimelineEntry[]
  hiddenCount: number
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : []
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function normalizeStatus(value: string, phase: string): ExecutionNodeStatus {
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

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order)
}

function sortEvents(events: ExecutionEventRecord[]): ExecutionEventRecord[] {
  return [...events].sort((left, right) => (
    left.timestamp === right.timestamp
      ? left.event_name.localeCompare(right.event_name)
      : left.timestamp.localeCompare(right.timestamp)
  ))
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) return ''
  if (durationMs < 1000) return `${durationMs} ms`
  return `${(durationMs / 1000).toFixed(durationMs >= 10_000 ? 0 : 1)} s`
}

function joinSummary(parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join(' · ')
}

function eventTitle(event: ExecutionEventRecord): string {
  return asString(event.data.title) || event.label || event.entity_id
}

function eventSummary(event: ExecutionEventRecord): string {
  const explicit = asString(event.data.summary)
  if (explicit) return explicit
  if (event.kind === 'node') {
    return joinSummary([asString(event.data.node_type), event.phase])
  }
  if (event.kind === 'eval') {
    return joinSummary([
      event.phase,
      asString(event.data.route_target) || asString(event.data.to),
      asString(event.data.reasoning),
    ]) || 'evaluation'
  }
  if (event.kind === 'tool') {
    return joinSummary([asString(event.data.qualified_name) || asString(event.data.tool_name), event.phase])
  }
  if (event.kind === 'skill') {
    return joinSummary([asString(event.data.skill_name), event.phase])
  }
  if (event.kind === 'hitl') {
    return joinSummary([asString(event.data.report_type), event.phase])
  }
  return asString(event.data.graph_name) || event.phase || event.kind
}

function selectExecution(events: ExecutionEventRecord[]): ExecutionEventRecord[] {
  if (events.length === 0) return []
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event.kind === 'execution' && event.phase === 'started' && event.execution_id) {
      return events.filter((item) => item.execution_id === event.execution_id)
    }
  }
  const executionId = events[events.length - 1]?.execution_id
  return executionId
    ? events.filter((item) => item.execution_id === executionId)
    : events
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
    toolParentId: null,
  }
}

function ensureStepEntity(
  entities: Map<string, EntityRecord>,
  orderRef: { current: number },
  stepId: string,
): EntityRecord {
  return ensureEntity(entities, stepId, () => {
    const entity = baseEntity(orderRef.current++, 'step', 'step', stepId, stepId)
    entity.nodeId = stepId
    entity.badge = 'step'
    entity.stepId = stepId
    return entity
  })
}

function resolveRootToolId(tool: EntityRecord, entities: Map<string, EntityRecord>): string {
  let current = tool
  const seen = new Set<string>()
  while (current.toolParentId && !seen.has(current.toolParentId)) {
    seen.add(current.toolParentId)
    const parent = entities.get(current.toolParentId)
    if (!parent || parent.kind !== 'tool') break
    current = parent
  }
  return current.id
}

function collectDescendantTools(block: EntityRecord, entities: Map<string, EntityRecord>): EntityRecord[] {
  const result: EntityRecord[] = []
  const queue = [...block.childIds]
  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) continue
    const current = entities.get(currentId)
    if (!current || current.kind !== 'tool') continue
    result.push(current)
    queue.push(...current.childIds)
  }
  return sortByOrder(result)
}

function collectChildTools(entity: EntityRecord, entities: Map<string, EntityRecord>): EntityRecord[] {
  return sortByOrder(
    entity.childIds
      .map((childId) => entities.get(childId))
      .filter((child): child is EntityRecord => Boolean(child && child.kind === 'tool')),
  )
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
      title: tool.title || tool.label,
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

function stepSummary(
  entity: EntityRecord,
  entities: Map<string, EntityRecord>,
  hitlCounts: Map<string, number>,
): string {
  const blockChildren = entity.childIds
    .map((childId) => entities.get(childId))
    .filter((child): child is EntityRecord => Boolean(child))

  const mtpCount = blockChildren.filter((child) => child.kind === 'mtp_block').length
  const skillCount = blockChildren
    .filter((child) => child.kind === 'skill_block')
    .reduce((sum, block) => sum + block.childIds.length, 0)
  const hitlCount = hitlCounts.get(entity.id) ?? 0
  const routeTarget = asString(entity.details.eval_route_target)

  return joinSummary([
    entity.nodeType,
    routeTarget ? `→ ${routeTarget}` : '',
    mtpCount > 0 ? `${mtpCount} mtp` : '',
    skillCount > 0 ? `${skillCount} skill${skillCount > 1 ? 's' : ''}` : '',
    hitlCount > 0 ? `${hitlCount} hitl` : '',
  ]) || 'Execution step'
}

function toolSummary(entity: EntityRecord): string {
  const durationMs = asNumber(entity.details.duration_ms)
  const nestedCount = entity.childIds.length
  return joinSummary([
    asString(entity.details.summary),
    durationMs > 0 ? formatDuration(durationMs) : '',
    nestedCount > 0 ? `${nestedCount} nested` : '',
  ]) || 'tool call'
}

function mtpBlockSummary(metrics: ExecutionGraphNodeMetrics, details: Record<string, unknown>): string {
  const totalCalls = asNumber(metrics.totalCalls)
  const errorCount = asNumber(metrics.errorCount)
  const totalDurationMs = asNumber(metrics.totalDurationMs)
  const rootCount = asNumber(metrics.rootCount)
  const maxDepth = asNumber(metrics.maxDepth)
  const namespace = asString(details.namespace)
  const toolset = asString(details.toolset)

  return joinSummary([
    totalCalls > 0 ? `${totalCalls} call${totalCalls > 1 ? 's' : ''}` : '',
    totalDurationMs > 0 ? formatDuration(totalDurationMs) : '',
    rootCount > 1 ? `${rootCount} branches` : '',
    maxDepth > 0 ? `depth ${maxDepth}` : '',
    errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : '',
    namespace && toolset ? `${namespace}/${toolset}` : namespace || toolset,
  ]) || 'mtp block'
}

function skillSummary(entity: EntityRecord): string {
  const explicit = asString(entity.details.summary)
  if (explicit) return explicit

  const missing = asStringArray(entity.details.missing)
  const description = asString(entity.details.description)
  return joinSummary([
    description,
    missing.length > 0 ? `${missing.length} missing dependency${missing.length > 1 ? 'ies' : 'y'}` : '',
  ]) || 'context skill'
}

function skillBlockSummary(metrics: ExecutionGraphNodeMetrics): string {
  const skillCount = asNumber(metrics.skillCount)
  const missingCount = asNumber(metrics.missingCount)
  const fileCount = asNumber(metrics.fileCount)

  return joinSummary([
    skillCount > 0 ? `${skillCount} skill${skillCount > 1 ? 's' : ''}` : '',
    missingCount > 0 ? `${missingCount} missing` : '',
    fileCount > 0 ? `${fileCount} file${fileCount > 1 ? 's' : ''}` : '',
  ]) || 'context injection'
}

function hitlSummary(entity: EntityRecord): string {
  const explicit = asString(entity.details.summary)
  if (explicit) return explicit
  const response = asString(entity.details.response)
  return joinSummary([
    asString(entity.details.report_type) || 'checkpoint',
    response ? 'resolved' : entity.status,
  ]) || 'hitl checkpoint'
}

function updateTitlesAndSummaries(
  entities: Map<string, EntityRecord>,
  hitlCounts: Map<string, number>,
): void {
  for (const entity of sortByOrder([...entities.values()])) {
    if (entity.kind === 'tool') {
      entity.title = asString(entity.details.title) || entity.label
      entity.summary = toolSummary(entity)
      entity.metrics = {
        totalDurationMs: asNumber(entity.details.duration_ms),
        totalCalls: 1 + entity.childIds.length,
        errorCount: entity.status === 'error' ? 1 : 0,
        maxDepth: asNumber(entity.details.call_depth),
      }
      continue
    }

    if (entity.kind === 'skill') {
      entity.title = asString(entity.details.title) || asString(entity.details.skill_name) || entity.label
      entity.summary = skillSummary(entity)
      entity.metrics = {
        missingCount: asStringArray(entity.details.missing).length,
        fileCount: asStringArray(entity.details.files).length,
      }
      continue
    }

    if (entity.kind === 'hitl') {
      entity.title = asString(entity.details.title) || entity.label
      entity.summary = hitlSummary(entity)
      entity.metrics = {
        isResolved: asString(entity.details.response).length > 0,
        reportType: asString(entity.details.report_type),
      }
      entity.badge = 'hitl'
      continue
    }

    if (entity.kind === 'mtp_block') {
      const toolEntities = collectDescendantTools(entity, entities)
      const toolDigest = buildToolDigest(entity, entities)
      const rootTool = entities.get(asString(entity.details.root_tool_id))
      const totalDurationMs = toolEntities.reduce((sum, tool) => sum + asNumber(tool.details.duration_ms), 0)
      const errorCount = toolEntities.filter((tool) => tool.status === 'error').length
      const maxDepth = toolEntities.reduce((depth, tool) => Math.max(depth, asNumber(tool.details.call_depth)), 0)

      entity.title = asString(entity.details.title) || rootTool?.title || entity.title
      entity.label = asString(entity.details.qualified_name) || rootTool?.label || entity.label
      entity.eventHistory = sortEvents(toolEntities.flatMap((tool) => tool.eventHistory))
      entity.status = toolEntities.length > 0
        ? aggregateStatus(toolEntities.map((tool) => tool.status))
        : entity.status
      entity.metrics = {
        totalCalls: toolEntities.length,
        totalDurationMs,
        errorCount,
        maxDepth,
        rootCount: toolDigest.rootCount,
        leafCount: toolDigest.leafCount,
      }
      entity.details = {
        ...entity.details,
        tool_ids: toolEntities.map((tool) => tool.id),
        total_calls: toolEntities.length,
        total_duration_ms: totalDurationMs,
        error_count: errorCount,
        max_depth: maxDepth,
        root_count: toolDigest.rootCount,
        leaf_count: toolDigest.leafCount,
        tool_preview: toolDigest.preview,
        tool_tree: toolDigest.tree,
        tool_overflow_count: Math.max(toolDigest.tree.length - toolDigest.preview.length, 0),
      }
      entity.summary = asString(entity.details.summary) || mtpBlockSummary(entity.metrics, entity.details)
      continue
    }

    if (entity.kind === 'skill_block') {
      const skills = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child && child.kind === 'skill'))
      const missingCount = skills.reduce((sum, skill) => sum + asStringArray(skill.details.missing).length, 0)
      const fileCount = uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.files))).length

      entity.eventHistory = sortEvents(skills.flatMap((skill) => skill.eventHistory))
      entity.status = skills.length > 0
        ? aggregateStatus(skills.map((skill) => skill.status))
        : entity.status
      entity.metrics = {
        skillCount: skills.length,
        missingCount,
        fileCount,
      }
      entity.details = {
        ...entity.details,
        skill_names: skills.map((skill) => skill.title || skill.label),
        missing: uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.missing))),
        files: uniqueStrings(skills.flatMap((skill) => asStringArray(skill.details.files))),
      }
      entity.title = 'Context Skills'
      entity.summary = skillBlockSummary(entity.metrics)
      continue
    }

    if (entity.kind === 'step') {
      const relatedHitlStatuses = [...entities.values()]
        .filter((item) => item.kind === 'hitl' && item.stepId === entity.id)
        .map((item) => item.status)
      const childStatuses = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child))
        .map((child) => child.status)

      if (childStatuses.length > 0 || relatedHitlStatuses.length > 0) {
        entity.status = aggregateStatus([entity.status, ...childStatuses, ...relatedHitlStatuses])
      }

      const blockChildren = entity.childIds
        .map((childId) => entities.get(childId))
        .filter((child): child is EntityRecord => Boolean(child))
      const mtpCount = blockChildren.filter((child) => child.kind === 'mtp_block').length
      const skillCount = blockChildren
        .filter((child) => child.kind === 'skill_block')
        .reduce((sum, block) => sum + block.childIds.length, 0)
      const hitlCount = hitlCounts.get(entity.id) ?? 0

      entity.title = asString(entity.details.title) || entity.label
      entity.summary = asString(entity.details.summary) || stepSummary(entity, entities, hitlCounts)
      entity.badge = 'step'
      entity.metrics = {
        mtpCount,
        skillCount,
        hitlCount,
      }
    }
  }
}

export function reduceExecutionTimeline(events: ExecutionEventRecord[]): ExecutionTimelineEntry[] {
  return selectExecution(events).map((event) => ({
    id: `${event.timestamp}:${event.entity_id}:${event.event_name}`,
    label: eventTitle(event),
    detail: eventSummary(event),
    timestamp: event.timestamp,
    status: normalizeStatus(event.status, event.phase),
    kind: event.kind,
  }))
}

export function reduceExecutionGraphState(
  events: ExecutionEventRecord[],
  expandedIds: Iterable<string> = [],
): ExecutionGraphState {
  const executionEvents = selectExecution(events)
  const timeline = reduceExecutionTimeline(executionEvents)

  if (executionEvents.length === 0) {
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
  let executionId = executionEvents[0]?.execution_id ?? ''
  let graphName = ''
  let isRunning = false

  for (const event of executionEvents) {
    executionId = event.execution_id || executionId
    const status = normalizeStatus(event.status, event.phase)

    if (event.kind === 'execution') {
      graphName = asString(event.data.graph_name) || event.label || graphName
      isRunning = status === 'running'
      continue
    }

    if (event.kind === 'node') {
      const stepEntity = ensureStepEntity(entities, orderRef, event.entity_id)
      stepEntity.label = event.label || stepEntity.label
      stepEntity.title = asString(event.data.title) || stepEntity.title || stepEntity.label
      stepEntity.summary = asString(event.data.summary) || stepEntity.summary
      stepEntity.status = status
      stepEntity.nodeId = event.entity_id
      stepEntity.nodeType = asString(event.data.node_type) || stepEntity.nodeType
      stepEntity.step = asNumber(event.data.step) || stepEntity.step
      stepEntity.stepId = event.entity_id
      stepEntity.details = { ...stepEntity.details, ...asObject(event.data) }
      stepEntity.eventHistory.push(event)
      continue
    }

    if (event.kind === 'eval') {
      const stepId = event.node_id || ''
      if (!stepId) continue

      const stepEntity = ensureStepEntity(entities, orderRef, stepId)
      stepEntity.nodeId = stepId
      stepEntity.stepId = stepId
      stepEntity.details = {
        ...stepEntity.details,
        latest_eval_phase: event.phase,
      }
      if (event.phase === 'completed' || event.phase === 'routed') {
        stepEntity.details = {
          ...stepEntity.details,
          eval_route_target: asString(event.data.route_target) || asString(event.data.to),
          eval_reasoning: asString(event.data.reasoning),
          eval_reviewer: asString(event.data.reviewer),
        }
      }
      stepEntity.eventHistory.push(event)
      continue
    }

    const stepId = event.node_id || (event.parent_id && entities.get(event.parent_id)?.kind === 'step' ? event.parent_id : '') || ''
    const stepEntity = stepId ? ensureStepEntity(entities, orderRef, stepId) : null
    if (event.kind === 'tool') {
      const tool = ensureEntity(entities, event.entity_id, () => {
        const entity = baseEntity(orderRef.current++, 'tool', 'tool', event.entity_id, event.label || event.entity_id)
        entity.badge = 'tool'
        entity.stepId = stepEntity?.id ?? null
        return entity
      })
      tool.label = event.label || tool.label
      tool.title = asString(event.data.title) || tool.title || tool.label
      tool.summary = asString(event.data.summary) || tool.summary
      tool.status = status
      tool.nodeId = stepEntity?.id ?? tool.nodeId
      tool.step = stepEntity?.step ?? tool.step
      tool.stepId = stepEntity?.id ?? tool.stepId
      tool.toolParentId = event.parent_id && event.parent_id !== stepEntity?.id ? event.parent_id : null
      tool.details = { ...tool.details, ...asObject(event.data) }
      tool.eventHistory.push(event)
      continue
    }

    if (event.kind === 'skill' && stepEntity) {
      const skill = ensureEntity(entities, event.entity_id, () => {
        const entity = baseEntity(orderRef.current++, 'skill', 'skill', event.entity_id, event.label || event.entity_id)
        entity.badge = 'skill'
        entity.stepId = stepEntity.id
        entity.nodeId = stepEntity.id
        entity.step = stepEntity.step
        return entity
      })
      skill.label = event.label || skill.label
      skill.title = asString(event.data.title) || skill.title || skill.label
      skill.summary = asString(event.data.summary) || skill.summary
      skill.status = status
      skill.stepId = stepEntity.id
      skill.nodeId = stepEntity.id
      skill.step = stepEntity.step
      skill.details = { ...skill.details, ...asObject(event.data) }
      skill.eventHistory.push(event)
      continue
    }

    if (event.kind === 'hitl' && stepEntity) {
      const hitl = ensureEntity(entities, event.entity_id, () => {
        const entity = baseEntity(orderRef.current++, 'hitl', 'hitl', event.entity_id, event.label || event.entity_id)
        entity.badge = 'hitl'
        entity.stepId = stepEntity.id
        entity.nodeId = stepEntity.id
        entity.step = stepEntity.step
        return entity
      })
      hitl.label = event.label || hitl.label
      hitl.title = asString(event.data.title) || hitl.title || hitl.label
      hitl.summary = asString(event.data.summary) || hitl.summary
      hitl.status = status
      hitl.stepId = stepEntity.id
      hitl.nodeId = stepEntity.id
      hitl.step = stepEntity.step
      hitl.details = { ...hitl.details, ...asObject(event.data) }
      hitl.eventHistory.push(event)
      linkEntity(stepEntity, hitl)
    }
  }

  const tools = sortByOrder([...entities.values()].filter((entity) => entity.kind === 'tool'))
  for (const tool of tools) {
    const stepEntity = tool.stepId ? entities.get(tool.stepId) : null
    if (!stepEntity || stepEntity.kind !== 'step') continue

    const rootToolId = resolveRootToolId(tool, entities)
    const rootTool = entities.get(rootToolId)
    if (!rootTool || rootTool.kind !== 'tool') continue

    const blockId = `${stepEntity.id}::mtp:${rootToolId}`
    const block = ensureEntity(entities, blockId, () => {
      const entity = baseEntity(orderRef.current++, 'mtp_block', 'mtp', blockId, rootTool.label)
      entity.stepId = stepEntity.id
      entity.nodeId = stepEntity.id
      entity.step = stepEntity.step
      entity.badge = 'mtp'
      entity.title = asString(rootTool.details.title) || rootTool.title || rootTool.label
      entity.details = {
        root_tool_id: rootTool.id,
        qualified_name: asString(rootTool.details.qualified_name),
        namespace: asString(rootTool.details.namespace),
        toolset: asString(rootTool.details.toolset),
        title: asString(rootTool.details.title) || rootTool.title || rootTool.label,
        summary: asString(rootTool.details.summary),
      }
      return entity
    })

    linkEntity(stepEntity, block)

    const parentTool = tool.toolParentId ? entities.get(tool.toolParentId) : null
    if (parentTool && parentTool.kind === 'tool') {
      linkEntity(parentTool, tool)
    } else {
      linkEntity(block, tool)
    }
  }

  const skills = sortByOrder([...entities.values()].filter((entity) => entity.kind === 'skill'))
  for (const skill of skills) {
    const stepEntity = skill.stepId ? entities.get(skill.stepId) : null
    if (!stepEntity || stepEntity.kind !== 'step') continue

    const blockId = `${stepEntity.id}::skills`
    const block = ensureEntity(entities, blockId, () => {
      const entity = baseEntity(orderRef.current++, 'skill_block', 'skill', blockId, 'skills')
      entity.stepId = stepEntity.id
      entity.nodeId = stepEntity.id
      entity.step = stepEntity.step
      entity.badge = 'skills'
      entity.title = 'Context Skills'
      return entity
    })

    linkEntity(stepEntity, block)
    linkEntity(block, skill)
  }

  const hitlCounts = new Map<string, number>()
  for (const hitl of [...entities.values()].filter((entity) => entity.kind === 'hitl')) {
    if (!hitl.stepId) continue
    hitlCounts.set(hitl.stepId, (hitlCounts.get(hitl.stepId) ?? 0) + 1)
  }

  updateTitlesAndSummaries(entities, hitlCounts)

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

    if (entity.kind === 'tool') {
      visibilityMemo.set(entity.id, false)
      return false
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

    const collapsible = entity.kind === 'step'
      ? entity.childIds.length > 0
      : entity.kind === 'skill_block'
        ? entity.childIds.length > 0
        : false

    const collapsed = collapsible && !expanded.has(entity.id)
    visibleNodeIds.add(entity.id)

    const estimatedWidth = entity.kind === 'step'
      ? 344
      : entity.kind === 'hitl'
        ? 312
        : entity.kind === 'mtp_block'
          ? 332
          : entity.kind === 'skill_block'
            ? 286
            : 252
    const estimatedHeight = entity.kind === 'step'
      ? 132
      : entity.kind === 'mtp_block'
        ? 188
        : 120

    visibleNodes.push({
      id: entity.id,
      type: 'executionNode',
      position: { x: 0, y: 0 },
      measured: { width: estimatedWidth, height: estimatedHeight },
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
  const steps = [...entities.values()]
    .filter((entity): entity is EntityRecord => entity.kind === 'step')
    .sort((left, right) => {
      const leftStep = left.step > 0 ? left.step : Number.MAX_SAFE_INTEGER
      const rightStep = right.step > 0 ? right.step : Number.MAX_SAFE_INTEGER
      return leftStep === rightStep ? left.order - right.order : leftStep - rightStep
    })
  const backbone = steps.map((entity) => entity.id)

  for (let index = 0; index < backbone.length - 1; index += 1) {
    const source = backbone[index]
    const target = backbone[index + 1]
    if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) continue

    edges.push({
      id: `flow:${source}:${target}`,
      source,
      target,
      type: 'smoothstep',
      animated: isRunning,
      style: { stroke: '#475569', strokeWidth: 2.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
    })
  }

  const layoutConstraintEdges: Array<{ source: string; target: string }> = []
  for (let index = 0; index < backbone.length - 1; index += 1) {
    const source = backbone[index]
    const target = backbone[index + 1]
    if (!visibleNodeIds.has(source) || !visibleNodeIds.has(target)) continue

    const sourceEntity = entities.get(source)
    if (!sourceEntity || sourceEntity.kind !== 'step') continue

    for (const entity of sortByOrder([...entities.values()])) {
      if (!visibleNodeIds.has(entity.id)) continue
      if (entity.stepId !== sourceEntity.id) continue
      if (entity.kind === 'step') continue

      layoutConstraintEdges.push({ source: entity.id, target })
    }
  }

  for (const entity of sortByOrder([...entities.values()])) {
    if (!entity.parentId) continue
    if (!visibleNodeIds.has(entity.id) || !visibleNodeIds.has(entity.parentId)) continue

    const parent = entities.get(entity.parentId)
    if (!parent) continue

    const stroke = entity.accentKind === 'skill'
      ? '#0f766e'
      : entity.accentKind === 'hitl'
        ? '#b45309'
        : entity.accentKind === 'mtp'
          ? '#2563eb'
          : entity.accentKind === 'tool'
            ? '#64748b'
            : '#4338ca'

    const dashed = parent.kind === 'step'
    edges.push({
      id: `hier:${entity.parentId}:${entity.id}`,
      source: entity.parentId,
      target: entity.id,
      type: 'smoothstep',
      style: {
        stroke,
        strokeWidth: dashed ? 1.5 : 1.8,
        strokeDasharray: dashed ? '6 5' : undefined,
        opacity: dashed ? 0.7 : 0.92,
      },
    })
  }

  const positions = layoutDAG(
    visibleNodes.map((node) => ({
      id: node.id,
      width: node.data.kind === 'step'
        ? 344
        : node.data.kind === 'hitl'
          ? 312
          : node.data.kind === 'mtp_block'
          ? 332
          : node.data.kind === 'skill_block'
            ? 286
            : 252,
      height: node.data.kind === 'step'
        ? 132
        : node.data.kind === 'mtp_block'
          ? 188
          : 120,
    })),
    [
      ...edges.map((edge) => ({ source: edge.source, target: edge.target })),
      ...layoutConstraintEdges,
    ],
    { horizontalGap: 104, verticalGap: 132 },
  )

  for (const node of visibleNodes) {
    const position = positions.get(node.id)
    if (position) {
      node.position = position
    }
  }

  return {
    executionId,
    graphName,
    isRunning,
    nodes: visibleNodes,
    edges,
    timeline,
    hiddenCount: [...entities.values()].filter((entity) => entity.kind !== 'tool').length - visibleNodes.length,
  }
}
