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

// Layer 1 — Presentational components (props-first, no provider dependency)
export { default as LiveGraphView } from './components/graph/LiveGraphView'
export { default as LiveChatPanel } from './components/chat/LiveChatPanel'
export { default as ExecutionTimeline } from './components/graph/ExecutionTimeline'
export { default as StaticGraphView } from './components/graph/StaticGraphView'
export { default as NodeDetailPanel } from './components/graph/NodeDetailPanel'
export { default as MessageBubble } from './components/chat/MessageBubble'
export { default as ToolCallDisplay } from './components/chat/ToolCallDisplay'
export { default as ChatInput } from './components/chat/ChatInput'
export { default as LiveAPGNode } from './components/graph/LiveAPGNode'
export { MarkdownContent } from '@aspect/markdown'
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

// Layer 3 — Full dashboard
export { default as APGViewer } from './components/APGViewer'

// Execution graph API — for embedding in CTEM and other hosts
export { default as ExecutionGraphView } from './components/ExecutionGraphView'
export type { ExecutionGraphViewProps } from './components/ExecutionGraphView'
export type { TokenUsageSummary } from './lib/token-usage'

// Types
export type { APGEvent } from './types/protocol'
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
