import type { ComponentType } from 'react'
import type { ExtensionTimelineItem, TimelineItem, ToolCallTimelineItem, MessageTimelineItem, AssistantResponseTimelineItem } from '../../types/timeline'

export interface TimelineItemRendererProps<T extends TimelineItem = TimelineItem> {
  item: T
  context: Record<string, unknown>
}

export interface ExtensionRendererProps extends TimelineItemRendererProps<ExtensionTimelineItem> {}

export interface TimelineRendererConfig {
  renderer: ComponentType<ExtensionRendererProps>
  mark?: {
    label?: string | ((item: ExtensionTimelineItem) => string)
    icon?: ComponentType<{ className?: string }>
    dotClass?: string
  }
}

export interface BuiltinRendererOverride {
  toolCall?: ComponentType<TimelineItemRendererProps<ToolCallTimelineItem>>
  assistantMessage?: ComponentType<TimelineItemRendererProps<MessageTimelineItem>>
  assistantResponse?: ComponentType<TimelineItemRendererProps<AssistantResponseTimelineItem>>
}

const extensionRegistry = new Map<string, TimelineRendererConfig>()

export function registerTimelineRenderer(
  extensionType: string,
  config: TimelineRendererConfig,
): void {
  extensionRegistry.set(extensionType, config)
}

export function resolveTimelineRenderer(
  extensionType: string,
): TimelineRendererConfig | undefined {
  return extensionRegistry.get(extensionType)
}

export function clearTimelineRenderers(): void {
  extensionRegistry.clear()
}
