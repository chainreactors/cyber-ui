import type { ComponentType } from 'react'

export interface TimelineItemBase {
  id: string
  timestamp: number
  actorName?: string
}

export interface MessageTimelineItem extends TimelineItemBase {
  kind: 'message'
  role: 'user' | 'assistant' | 'system' | 'thinking'
  content: string
  streaming?: boolean
  metadata?: Record<string, unknown>
}

export interface ToolCallEntry {
  id: string
  toolName: string
  toolArgs: string
  result?: string
  pending: boolean
}

export interface AssistantResponseTimelineItem extends TimelineItemBase {
  kind: 'assistant_response'
  thinking?: string
  tools: ToolCallEntry[]
  response?: { content: string; metadata?: Record<string, unknown> }
  streaming: boolean
}

export interface ToolCallTimelineItem extends TimelineItemBase {
  kind: 'tool_call'
  toolCall: ToolCallEntry
}

export interface DividerTimelineItem extends TimelineItemBase {
  kind: 'divider'
  label: string
  variant?: 'info' | 'warning' | 'success'
}

export interface ExtensionTimelineItem extends TimelineItemBase {
  kind: 'extension'
  extensionType: string
  data: Record<string, unknown>
}

export type TimelineItem =
  | MessageTimelineItem
  | AssistantResponseTimelineItem
  | ToolCallTimelineItem
  | DividerTimelineItem
  | ExtensionTimelineItem
