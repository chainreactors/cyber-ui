// npm library entry — re-exports public API

// Layer 0 — Pure functions (no React dependency)
export {
  reduceGraphState,
  reduceChatState,
  reduceTimeline,
} from './lib/event-reducer'
export {
  reduceExecutionGraphState,
  reduceExecutionTimeline,
} from './lib/execution-graph'
export {
  reduceExecutionHistoryGraphState,
  reduceExecutionHistoryTimeline,
} from './lib/execution-history-graph'

// Layer 0.5 — Utility functions
export {
  stripAnsiControl,
  formatArgs,
  summarizeArgs,
} from './lib/tool-utils'
export { chatMessagesToTimeline } from './lib/timeline-adapter'

// Layer 0.5 — Timeline renderer registry
export {
  registerTimelineRenderer,
  resolveTimelineRenderer,
  clearTimelineRenderers,
} from './components/chat/timeline-registry'

// Layer 1 — Presentational components (props-first, no provider dependency)
export { default as LiveGraphView } from './components/graph/LiveGraphView'
export { default as LiveChatPanel } from './components/chat/LiveChatPanel'
export { default as ExecutionTimeline } from './components/graph/ExecutionTimeline'
export { default as StaticGraphView } from './components/graph/StaticGraphView'
export { default as NodeDetailPanel } from './components/graph/NodeDetailPanel'
export { default as MessageBubble, StreamingCursor } from './components/chat/MessageBubble'
export { default as ToolCallDisplay, CodeCallDisplay, BlockingOutputDisplay, OutputSection } from './components/chat/ToolCallDisplay'
export { default as ChatThinking, ThinkingDots } from './components/chat/ChatThinking'
export { default as AssistantResponse } from './components/chat/AssistantResponse'
export { default as ChatInput } from './components/chat/ChatInput'
export { ChatPanel } from './components/chat/ChatPanel'
export { default as LiveAPGNode } from './components/graph/LiveAPGNode'
export { MarkdownContent } from '@cyber/markdown'
export { default as PromptContent } from './components/shared/PromptContent'

// Layer 2 — Connected components (convenience, require providers)
export { ConnectedGraphView } from './components/graph/LiveGraphView'
export { ConnectedChatPanel } from './components/chat/LiveChatPanel'
export { ConnectedTimeline } from './components/graph/ExecutionTimeline'

// Layer 2 — Providers & hooks
export { APGWebSocketProvider, StaticEventProvider, useAPGEvents } from './providers/APGWebSocketProvider'
export { ThemeProvider, useTheme } from './providers/ThemeProvider'
export { useGraphState } from './providers/useGraphState'
export { useChatState } from './providers/useChatState'
export { ChatSessionProvider, useChatSessionContext } from './providers/ChatSessionProvider'

// Layer 3 — Full dashboard
export { default as APGViewer } from './components/APGViewer'

// Execution graph API — for embedding in CTEM and other hosts
export { default as ExecutionGraphView } from './components/ExecutionGraphView'
export type { ExecutionGraphViewProps } from './components/ExecutionGraphView'
export type { TokenUsageSummary } from './lib/token-usage'

// Types — components
export type { MessageBubbleProps } from './components/chat/MessageBubble'
export type { ChatThinkingProps } from './components/chat/ChatThinking'
export type { AssistantResponseProps } from './components/chat/AssistantResponse'
export type { ToolCallDisplayProps, CodeCallDisplayProps, BlockingOutputDisplayProps } from './components/chat/ToolCallDisplay'
export type { LiveChatPanelProps } from './components/chat/LiveChatPanel'
export type { ChatInputProps, CommandHint, ChatAttachment, AttachmentMode, InputDecorator } from './components/chat/ChatInput'
export type { ChatPanelProps, ChatPanelTimelineProps, ChatPanelInputProps, ChatPanelHeaderProps } from './components/chat/ChatPanel'
export type { ChatSessionState, ChatSessionActions, ChatSessionContextValue } from './providers/ChatSessionProvider'
export type {
  TimelineItemRendererProps,
  ExtensionRendererProps,
  TimelineRendererConfig,
  BuiltinRendererOverride,
} from './components/chat/timeline-registry'

// Types — protocol & data
export type { APGEvent } from './types/protocol'
export type {
  TimelineItem,
  TimelineItemBase,
  MessageTimelineItem,
  AssistantResponseTimelineItem,
  ToolCallTimelineItem,
  ToolCallEntry,
  DividerTimelineItem,
  ExtensionTimelineItem,
} from './types/timeline'
export type {
  ExecutionAccentKind,
  ExecutionEventRecord,
  ExecutionGraphNodeData,
  ExecutionGraphNodeKind,
  ExecutionGraphNodeMetrics,
  ExecutionNodeStatus,
  ExecutionTimelineEntry,
} from './types/execution-graph'
export type {
  APGNodeData,
  NodeStatus,
  ChatMessage,
  GraphState,
  ChatState,
  TimelineEntry,
} from './lib/event-reducer'
export type { NodeTheme } from './lib/node-themes'
export type { StaticNodeData } from './components/graph/StaticAPGNode'
