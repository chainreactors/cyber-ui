// ── IOA message primitives ──

export interface IoaRef {
  messages?: string[]
  nodes?: string[]
}

export interface IoaMessage {
  content?: unknown
  id?: string
  meta?: Record<string, unknown>
  refs?: IoaRef
  sender?: string
}

export interface IoaMessageRecord extends IoaMessage {
  created_at?: string
  content_type?: string
  space_id?: string
}

// ── Identity resolution ──

export interface ForumParticipant {
  nodeId: string
  nodeName: string
  actorType?: 'human' | 'task' | 'system' | 'peer'
  taskId?: string
  taskName?: string
}

// ── Thread ──

export interface ForumThread {
  id: string
  spaceId: string
  spaceName: string
  root: IoaMessageRecord
  messages: IoaMessageRecord[]
  title: string
  contentType: ForumContentType
  sender?: ForumParticipant
  targets: ForumParticipant[]
  createdAt?: string
  latestAt?: string
  messageCount: number
  pendingCount: number
}

export interface SpaceInfo {
  id?: string
  name?: string
  message_count?: number
  tags?: string[]
}

export interface ForumData {
  threads: ForumThread[]
  participants: Map<string, ForumParticipant>
  spaces: SpaceInfo[]
}

// ── Content types (L2 protocol schemas) ──

export type ForumContentType = string

export interface HandoffContent {
  type: 'handoff'
  title?: string
  message?: string
  content?: string
  text?: string
}

export interface CheckpointSubmittedContent {
  type: 'checkpoint'
  id: string
  kind?: string
  title?: string
  content?: string
  options?: string[]
}

export interface CheckpointFeedbackContent {
  type?: 'feedback'
  feedback?: string
  option?: string
  actor?: {
    type?: string
    id?: string
    name?: string
  }
}

export interface TeamMessageContent {
  type: 'team'
  team?: string
  text: string
}

export interface SwarmMessageContent {
  content: string
  targets?: string[]
  task?: boolean
}

export type ForumMessageContent =
  | HandoffContent
  | CheckpointSubmittedContent
  | CheckpointFeedbackContent
  | TeamMessageContent
  | SwarmMessageContent
  | Record<string, unknown>

// ── Type guards ──

export function isHandoffContent(content: unknown): content is HandoffContent {
  return isObject(content) && content.type === 'handoff'
}

export function isCheckpointContent(content: unknown): content is CheckpointSubmittedContent {
  return isObject(content) && content.type === 'checkpoint' && typeof content.id === 'string'
}

export function isFeedbackContent(content: unknown): content is CheckpointFeedbackContent {
  if (!isObject(content)) return false
  if (content.type === 'feedback') return true
  return !content.type && isObject(content.actor)
}

export function isTeamMessageContent(content: unknown): content is TeamMessageContent {
  return isObject(content) && content.type === 'team'
}

export function isSwarmContent(content: unknown): content is SwarmMessageContent {
  if (!isObject(content)) return false
  return typeof content.content === 'string' && content.content !== '' && !content.type
}

export function detectContentType(content: unknown, contentType?: string): ForumContentType {
  if (contentType) return contentType
  if (isHandoffContent(content)) return 'handoff'
  if (isCheckpointContent(content)) return 'checkpoint'
  if (isFeedbackContent(content)) return 'feedback'
  if (isTeamMessageContent(content)) return 'team'
  if (isSwarmContent(content)) return 'swarm'
  if (isObject(content) && typeof content.type === 'string') return content.type
  return 'unknown'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// ── Node name parsing ──

const TASK_NODE_PREFIX = 'aide.task.'
const HUMAN_NODE_PREFIX = 'aide.human.'

export function parseTaskNodeName(nodeName: string): { workspace: string; taskId: string } | null {
  if (!nodeName.startsWith(TASK_NODE_PREFIX)) return null
  const rest = nodeName.slice(TASK_NODE_PREFIX.length)
  const dotIndex = rest.indexOf('.')
  if (dotIndex < 0) return null
  return { workspace: rest.slice(0, dotIndex), taskId: rest.slice(dotIndex + 1) }
}

export function isHumanNodeName(nodeName: string): boolean {
  return nodeName.startsWith(HUMAN_NODE_PREFIX)
}

// ── Checkpoint types ──

export type CheckpointKind = 'plan' | 'report' | 'checkpoint'
export type CheckpointStatus = 'pending' | 'responded'

export interface Checkpoint {
  entityId: string
  taskId: string
  sessionId: string
  kind: CheckpointKind
  title: string
  content: string
  options: string[]
  labels: string[]
  status: CheckpointStatus
  feedback: string
  createdAt: string
  sourceNodeId?: string
  executionId?: string
  step?: number
}

export interface CheckpointReply {
  option: string
  text: string
}

// ── UI-only types ──

export interface TaskFocusTarget {
  view?: 'chat' | 'timeline' | 'graph'
  sessionId?: string
  timelineItemId?: string
}
