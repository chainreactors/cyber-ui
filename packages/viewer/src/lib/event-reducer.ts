import type { Node, Edge } from '@xyflow/react'
import type { WireEvent } from '../types/protocol'
import { eventType, eventTimestamp, eventAgent, isAgentEvent } from '../types/protocol'
import { layoutDAG } from './graph-layout'
import type { TokenUsageSummary } from './token-usage'
import { mergeTokenUsage, normalizeTokenUsage } from './token-usage'

// --- helpers ---

function parseJsonSafe(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) } catch { return {} }
}

function parseJsonObjectSafe(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

// --- Graph state types ---

export type NodeStatus = 'pending' | 'running' | 'completed' | 'error'

export interface APGNodeData extends Record<string, unknown> {
  label: string
  nodeId: string
  nodeType: string
  status: NodeStatus
  step: number
  tokenUsage?: TokenUsageSummary
  title?: string
  summary?: string
  prompt?: string
  output?: Record<string, unknown>
  errorMessage?: string
}

export interface ChatMessage {
  id: string
  kind: 'user' | 'assistant' | 'tool-call' | 'tool-return'
  agentName: string
  content: string
  toolName?: string
  args?: Record<string, unknown>
  toolCallId?: string
  timestamp: string
  rawContent?: Record<string, unknown>
  _rawJson?: string
}

export interface GraphState {
  nodes: Node<APGNodeData>[]
  edges: Edge[]
  graphName: string
  totalSteps: number
  isRunning: boolean
}

export interface ChatState {
  messages: ChatMessage[]
}

// --- Initial states ---

export const initialGraphState: GraphState = {
  nodes: [], edges: [], graphName: '', totalSteps: 0, isRunning: false,
}

export const initialChatState: ChatState = { messages: [] }

// --- Timeline types ---

export interface TimelineEntry {
  id: string
  label: string
  detail: string
  timestamp: string
  status: 'info' | 'running' | 'success' | 'error'
}

// =====================================================================
// Graph reducer (runtime events only — not AOP)
// =====================================================================

export function reduceGraphState(events: WireEvent[]): GraphState {
  const nodeMap = new Map<string, Node<APGNodeData>>()
  const edgeMap = new Map<string, Edge>()
  const turnToNodeId = new Map<string, string>()
  const turnUsageMap = new Map<string, TokenUsageSummary>()
  let graphName = ''
  let totalSteps = 0
  let isRunning = false
  let prevNodeId: string | null = null
  let activeNodeId: string | null = null
  const selfLoopCounters = new Map<string, number>()

  function appendNodeUsage(nodeId: string | null, usage: TokenUsageSummary | null): void {
    if (!nodeId || !usage) return
    const node = nodeMap.get(nodeId)
    if (!node) return
    node.data = { ...node.data, tokenUsage: mergeTokenUsage(node.data.tokenUsage, usage) ?? undefined }
  }

  function flushPendingTurnUsage(nodeId: string | null): void {
    if (!nodeId) return
    for (const [turnId, mappedNodeId] of turnToNodeId.entries()) {
      if (mappedNodeId !== nodeId) continue
      appendNodeUsage(mappedNodeId, turnUsageMap.get(turnId) ?? null)
      turnToNodeId.delete(turnId)
      turnUsageMap.delete(turnId)
    }
  }

  for (const evt of events) {
    const t = eventType(evt)
    const d = evt.data

    switch (t) {
      case 'ExecutionStartEvent': {
        graphName = (d.graph_name as string) ?? ''
        totalSteps = (d.total_steps as number) ?? 0
        isRunning = true
        break
      }
      case 'NodeStartEvent': {
        const nodeId = d.node_id as string
        const step = (d.step as number) ?? 0
        const isRevisit = nodeMap.has(nodeId)
        if (!isRevisit) {
          nodeMap.set(nodeId, {
            id: nodeId, type: 'apgNode', position: { x: 120, y: step * 140 },
            data: { label: d.node_name as string, nodeId, nodeType: d.node_type as string, status: 'running', step },
          })
        } else {
          const existing = nodeMap.get(nodeId)!
          existing.data = { ...existing.data, status: 'running' }
        }
        if (prevNodeId) {
          const isSelfLoop = prevNodeId === nodeId
          if (isSelfLoop) {
            const count = (selfLoopCounters.get(nodeId) ?? 0) + 1
            selfLoopCounters.set(nodeId, count)
            const edgeId = `e-loop-${nodeId}-${count}`
            edgeMap.set(edgeId, { id: edgeId, source: prevNodeId, target: nodeId, type: 'selfLoop', animated: true, label: `×${count}`, style: { stroke: '#8b5cf6', strokeWidth: 2 } })
          } else {
            const edgeId = `e-${prevNodeId}-${nodeId}`
            if (!edgeMap.has(edgeId)) {
              const isBackEdge = isRevisit
              edgeMap.set(edgeId, { id: edgeId, source: prevNodeId, target: nodeId, type: isBackEdge ? 'backEdge' : 'smoothstep', animated: true, style: { stroke: isBackEdge ? '#8b5cf6' : '#4b5563', strokeWidth: 2, ...(isBackEdge ? { strokeDasharray: '6 3' } : {}) } })
            }
          }
        }
        prevNodeId = nodeId
        activeNodeId = nodeId
        break
      }
      case 'NodeInputEvent': {
        const n = nodeMap.get(d.node_id as string)
        if (n) n.data = { ...n.data, prompt: d.prompt as string }
        break
      }
      case 'NodeOutputEvent': {
        const nid = d.node_id as string
        const n = nodeMap.get(nid)
        flushPendingTurnUsage(nid)
        if (n) {
          const out = d.output as Record<string, unknown> | undefined
          n.data = { ...n.data, status: 'completed', output: out, title: (out?.title as string) || n.data.title, summary: (out?.summary as string) || n.data.summary }
        }
        if (activeNodeId === nid) activeNodeId = null
        break
      }
      case 'ErrorEvent':
      case 'PanicEvent': {
        const nid = d.node_id as string
        const n = nodeMap.get(nid)
        flushPendingTurnUsage(nid)
        if (n) n.data = { ...n.data, status: 'error', errorMessage: d.message as string }
        if (activeNodeId === nid) activeNodeId = null
        break
      }
      // Agent lifecycle events that affect graph node usage
      case 'ConversationTurnStartEvent':
      case 'session.start': {
        const turnId = (d.turn_id as string) ?? ''
        if (turnId && activeNodeId) turnToNodeId.set(turnId, activeNodeId)
        break
      }
      case 'ModelResponseEvent':
      case 'usage': {
        const turnId = (d.turn_id as string) ?? ''
        const usage = normalizeTokenUsage(t === 'usage' ? d : d.usage)
        if (turnId && usage) {
          turnUsageMap.set(turnId, mergeTokenUsage(turnUsageMap.get(turnId), usage) ?? usage)
        } else if (usage) {
          appendNodeUsage(activeNodeId, usage)
        }
        break
      }
      case 'ConversationTurnCompleteEvent':
      case 'session.end': {
        const turnId = (d.turn_id as string) ?? ''
        if (turnId) {
          const usage = normalizeTokenUsage(d.total_usage) ?? turnUsageMap.get(turnId) ?? null
          appendNodeUsage(turnToNodeId.get(turnId) ?? activeNodeId, usage)
          turnToNodeId.delete(turnId)
          turnUsageMap.delete(turnId)
        }
        break
      }
      case 'ExecutionCompleteEvent': {
        for (const nodeId of new Set(turnToNodeId.values())) flushPendingTurnUsage(nodeId)
        flushPendingTurnUsage(activeNodeId)
        isRunning = false
        for (const edge of edgeMap.values()) edge.animated = false
        break
      }
    }
  }

  const allNodes = Array.from(nodeMap.values())
  const allEdges = Array.from(edgeMap.values())
  const positions = layoutDAG(
    allNodes.map((n) => ({ id: n.id, width: 200, height: 60 })),
    allEdges.map((e) => ({ source: e.source, target: e.target })),
  )
  for (const node of allNodes) {
    const pos = positions.get(node.id)
    if (pos) node.position = pos
  }

  return { nodes: allNodes, edges: allEdges, graphName, totalSteps, isRunning }
}

// =====================================================================
// Legacy platform chat reducer. AOP agent output is reduced exclusively by
// reduceAOPToTimeline in aop-reducer.ts.
// =====================================================================

interface MessagePart {
  part_kind: string
  content?: unknown
  tool_name?: string
  tool_call_id?: string
  args?: unknown
}

function extractTextContent(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.text === 'string') return parsed.text
    return null
  } catch { return raw }
}

function extractStreamingText(rawJson: string): string | null {
  try {
    const parsed = JSON.parse(rawJson)
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.text === 'string') return parsed.text
    return null
  } catch { /* fall through */ }
  const match = rawJson.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)("?)/)
  if (match) {
    try {
      if (match[2] === '"') return JSON.parse(`"${match[1]}"`)
      return JSON.parse(`"${match[1].replace(/\\$/, '')}"`)
    } catch { return match[1] }
  }
  return null
}

function xmlPromptToMarkdown(xml: string): string {
  const inner = xml.replace(/^\s*<prompt>\s*/s, '').replace(/\s*<\/prompt>\s*$/s, '')
  const tagLabels: Record<string, string> = {
    'node-name': 'Node', 'goal': 'Goal', 'output': 'Output', 'input': 'Input',
    'branches': 'Branches', 'rules': 'Rules', 'examples': 'Examples',
    'context': 'Context', 'user-intent': 'User Intent', 'history': 'History',
    'guardrail': 'Guardrail', 'dialectics': 'Dialectics',
  }
  const parts: string[] = []
  const re = /<([\w-]+)>\s*([\s\S]*?)\s*<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(inner)) !== null) {
    const label = tagLabels[m[1]] ?? m[1]
    const body = m[2].trim()
    if (!body) continue
    parts.push(/^(from |import |class |Model code|Models:)/m.test(body)
      ? `## ${label}\n\n\`\`\`python\n${body}\n\`\`\``
      : `## ${label}\n\n${body}`)
  }
  return parts.length > 0 ? parts.join('\n\n') : xml
}

function normalizeToolReturnContent(raw: unknown): { text: string; rawContent?: Record<string, unknown> } {
  if (typeof raw === 'string') {
    const parsed = parseJsonObjectSafe(raw)
    return parsed ? { text: JSON.stringify(parsed, null, 2), rawContent: parsed } : { text: raw }
  }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return { text: JSON.stringify(raw, null, 2), rawContent: raw as Record<string, unknown> }
  }
  return { text: raw == null ? '' : JSON.stringify(raw, null, 2) }
}

export function reduceChatState(events: WireEvent[]): ChatState {
  const state: ChatState = { ...initialChatState, messages: [] }
  let msgIdx = 0
  const seenToolCallIds = new Set<string>()
  const toolNames = new Map<string, string>()

  function appendStructuredParts(agentName: string, parts: MessagePart[], timestamp: string): void {
    for (const part of parts) {
      if (part.part_kind === 'tool-call') {
        const tcId = part.tool_call_id ?? ''
        if (seenToolCallIds.has(tcId)) continue
        seenToolCallIds.add(tcId)
        if (tcId && part.tool_name) toolNames.set(tcId, part.tool_name)
        const args: Record<string, unknown> = typeof part.args === 'string' ? parseJsonSafe(part.args) : (part.args as Record<string, unknown>) ?? {}
        state.messages.push({ id: `msg-${msgIdx++}`, kind: 'tool-call', agentName, content: JSON.stringify(args, null, 2), toolName: part.tool_name ?? '', args, toolCallId: tcId, timestamp, rawContent: args })
      } else if (part.part_kind === 'tool-return') {
        const tcId = part.tool_call_id ?? ''
        if (seenToolCallIds.has(tcId)) continue
        seenToolCallIds.add(tcId)
        const { text, rawContent } = normalizeToolReturnContent(part.content)
        state.messages.push({ id: `msg-${msgIdx++}`, kind: 'tool-return', agentName, content: text, toolName: part.tool_name ?? (tcId ? toolNames.get(tcId) ?? '' : ''), toolCallId: tcId, timestamp, rawContent })
      } else if (part.part_kind === 'text' && part.content) {
        const batchText = extractTextContent(String(part.content))
        if (batchText === null) continue
        let replaced = false
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i]
          if (m.kind === 'assistant' && m.agentName === agentName) { m.content = batchText; delete m._rawJson; replaced = true; break }
          if (m.kind === 'user') break
        }
        if (!replaced) state.messages.push({ id: `msg-${msgIdx++}`, kind: 'assistant', agentName, content: batchText, timestamp })
      }
    }
  }

  for (const evt of events) {
    if (!isAgentEvent(evt)) continue
    const t = eventType(evt)
    const d = evt.data
    const ts = eventTimestamp(evt)
    const agent = eventAgent(evt)

    switch (t) {
      // ── User prompt ──
      case 'ConversationTurnStartEvent': {
        const rawPrompt = d.user_prompt as string
        state.messages.push({ id: `msg-${msgIdx++}`, kind: 'user', agentName: agent, content: rawPrompt.includes('<prompt>') ? xmlPromptToMarkdown(rawPrompt) : rawPrompt, timestamp: ts })
        break
      }

      // ── Text output ──
      case 'TextPartEvent': {
        const token = d.content as string
        const last = state.messages[state.messages.length - 1]
        if (last && last.kind === 'assistant' && last.agentName === agent) {
          const rawJson = (last._rawJson ?? '') + token
          last._rawJson = rawJson
          const text = extractStreamingText(rawJson)
          if (text !== null) last.content = text
        } else {
          const text = extractStreamingText(token)
          state.messages.push({ id: `msg-${msgIdx++}`, kind: 'assistant', agentName: agent, content: text ?? '', timestamp: ts, _rawJson: token })
        }
        break
      }

      // ── Tool call ──
      case 'ToolCallPartEvent': {
        const tcId = d.tool_call_id as string
        seenToolCallIds.add(tcId)
        if (tcId && typeof d.tool_name === 'string') toolNames.set(tcId, d.tool_name)
        const args = d.args as Record<string, unknown>
        state.messages.push({ id: `msg-${msgIdx++}`, kind: 'tool-call', agentName: agent, content: JSON.stringify(args, null, 2), toolName: d.tool_name as string, args, toolCallId: tcId, timestamp: ts, rawContent: args })
        break
      }

      // ── Tool result ──
      case 'ToolReturnPartEvent': {
        const tcId = d.tool_call_id as string
        seenToolCallIds.add(tcId)
        const { text, rawContent } = normalizeToolReturnContent(d.content)
        state.messages.push({ id: `msg-${msgIdx++}`, kind: 'tool-return', agentName: agent, content: text, toolName: (d.tool_name as string) || (tcId ? toolNames.get(tcId) ?? '' : ''), toolCallId: tcId, timestamp: ts, rawContent })
        break
      }

      // ── Structured message parts (legacy only) ──
      case 'ModelResponseEvent':
      case 'ModelRequestEvent': {
        const parts = d.parts as MessagePart[] | undefined
        if (parts) appendStructuredParts(agent, parts, ts)
        break
      }
    }
  }

  state.messages = state.messages.filter(m => !(m.kind === 'assistant' && m.content === '' && m._rawJson))
  return state
}

// =====================================================================
// Platform execution timeline reducer.
// =====================================================================

export function reduceTimeline(events: WireEvent[]): TimelineEntry[] {
  const result: TimelineEntry[] = []
  const nodeIdx = new Map<string, number>()

  for (const evt of events) {
    const t = eventType(evt)
    const d = evt.data
    const ts = eventTimestamp(evt)

    switch (t) {
      case 'ExecutionStartEvent':
        result.push({ id: 'tl-exec-start', label: 'Execution Started', detail: `Graph: ${d.graph_name ?? 'unknown'}`, timestamp: ts, status: 'running' })
        break
      case 'NodeStartEvent': {
        const idx = result.length
        nodeIdx.set(d.node_id as string, idx)
        result.push({ id: `tl-node-${d.node_id}`, label: `Step ${d.step}: ${d.node_name}`, detail: `Type: ${d.node_type}`, timestamp: ts, status: 'running' })
        break
      }
      case 'NodeOutputEvent': {
        const idx = nodeIdx.get(d.node_id as string)
        if (idx != null && result[idx]) result[idx] = { ...result[idx], status: 'success' }
        break
      }
      case 'ErrorEvent':
      case 'PanicEvent': {
        const nid = d.node_id as string | undefined
        const idx = nid ? nodeIdx.get(nid) : undefined
        if (idx != null && result[idx]) {
          result[idx] = { ...result[idx], status: 'error', detail: (d.message as string) ?? result[idx].detail }
        } else {
          result.push({ id: `tl-err-${result.length}`, label: `Error: ${d.node_name ?? 'unknown'}`, detail: (d.message as string) ?? '', timestamp: ts, status: 'error' })
        }
        break
      }
      case 'ExecutionCompleteEvent': {
        if (result.length > 0 && result[0].id === 'tl-exec-start') {
          result[0] = { ...result[0], status: d.success ? 'success' : 'error', label: d.success ? 'Execution Complete' : 'Execution Failed', detail: `${d.step_count ?? 0} steps` }
        }
        break
      }
    }
  }
  return result
}
