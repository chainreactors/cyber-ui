// npm library entry — re-exports public API
//
// AOP (agent-protocol) is the only live message implementation: agent output
// flows through reduceAOPToTimeline / AOPChatPanel / ChatPanel. Exports marked
// "LEGACY APG" below have no in-repo consumers and no Go producer; they are
// kept intact pending a consumer-side refactor to AOP.

// Layer 0 — Pure functions (no React dependency)
// LEGACY APG — see header note
export {
  reduceGraphState,
  reduceChatState,
  reduceTimeline,
} from './lib/event-reducer'
export {
  reduceExecutionGraphState,
  reduceExecutionTimeline,
} from './lib/execution-graph'
// LEGACY APG — see header note
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
// AOP — canonical reducer
export { reduceAOPToTimeline } from './lib/aop-reducer'

// Layer 0.5 — Timeline renderer registry
export {
  registerTimelineRenderer,
  resolveTimelineRenderer,
  clearTimelineRenderers,
} from './components/chat/timeline-registry'

// Layer 1 — Presentational components (props-first, no provider dependency)
// LEGACY APG — see header note
export { default as LiveGraphView } from './components/graph/LiveGraphView'
export { default as LiveChatPanel } from './components/chat/LiveChatPanel'
export { default as ExecutionTimeline } from './components/graph/ExecutionTimeline'
export { default as StaticGraphView } from './components/graph/StaticGraphView'
export { default as NodeDetailPanel } from './components/graph/NodeDetailPanel'
export { default as MessageBubble, StreamingCursor } from './components/chat/MessageBubble'
export { AgentVoiceCard } from './components/chat/AgentVoiceCard'
export { default as ToolCallDisplay, CodeCallDisplay, BlockingOutputDisplay, OutputSection } from './components/chat/ToolCallDisplay'
export { default as ChatThinking, ThinkingDots } from './components/chat/ChatThinking'
export { default as AssistantResponse } from './components/chat/AssistantResponse'
export { default as ChatInput } from './components/chat/ChatInput'
// AOP — canonical chat panel
export { ChatPanel } from './components/chat/ChatPanel'
export { AOPChatPanel } from './components/chat/AOPChatPanel'
// LEGACY APG — see header note
export { default as LiveAPGNode } from './components/graph/LiveAPGNode'
export { MarkdownContent } from '@cyber/markdown'
export { default as PromptContent } from './components/shared/PromptContent'

// Layer 2 — Connected components (convenience, require providers)
// LEGACY APG — see header note
export { ConnectedGraphView } from './components/graph/LiveGraphView'
export { ConnectedChatPanel } from './components/chat/LiveChatPanel'
export { ConnectedTimeline } from './components/graph/ExecutionTimeline'

// Layer 2 — Providers & hooks
// LEGACY APG — see header note
export { APGWebSocketProvider, StaticEventProvider, useAPGEvents } from './providers/APGWebSocketProvider'
export { ThemeProvider, useTheme } from './providers/ThemeProvider'
// LEGACY APG — see header note
export { useGraphState } from './providers/useGraphState'
export { useChatState } from './providers/useChatState'
export { ChatSessionProvider, useChatSessionContext } from './providers/ChatSessionProvider'

// Layer 3 — Full dashboard
// LEGACY APG — see header note
export { default as APGViewer } from './components/APGViewer'

// Execution graph API — for embedding in CTEM and other hosts
// LEGACY APG — see header note
export { default as ExecutionGraphView } from './components/ExecutionGraphView'
export type { ExecutionGraphViewProps } from './components/ExecutionGraphView'
export type { TokenUsageSummary } from './lib/token-usage'

// Types — components
export type { MessageBubbleProps, MessageBubbleVariant } from './components/chat/MessageBubble'
export type { AgentVoiceCardProps } from './components/chat/AgentVoiceCard'
export type { ChatThinkingProps } from './components/chat/ChatThinking'
export type { AssistantResponseProps } from './components/chat/AssistantResponse'
export type { ToolCallDisplayProps, CodeCallDisplayProps, BlockingOutputDisplayProps } from './components/chat/ToolCallDisplay'
export type { LiveChatPanelProps } from './components/chat/LiveChatPanel'
export type { ChatInputProps, CommandHint, ChatAttachment, AttachmentMode, Mentionable, MentionPopupApi } from './components/chat/ChatInput'
export type { ChatPanelProps, ChatPanelTimelineProps, ChatPanelInputProps, ChatPanelHeaderProps } from './components/chat/ChatPanel'
export type { ChatSessionState, ChatSessionActions, ChatSessionContextValue } from './providers/ChatSessionProvider'
export type {
  TimelineItemRendererProps,
  ExtensionRendererProps,
  TimelineRendererConfig,
  BuiltinRendererOverride,
} from './components/chat/timeline-registry'

// Types — protocol & data
export type { APGEvent, WireEvent } from './types/protocol'
export type { ReduceAOPOptions } from './lib/aop-reducer'
export type { AOPChatPanelProps } from './components/chat/AOPChatPanel'
export type {
  AOPEvent,
  AOPEventType,
  AOPData,
  SessionStartData,
  SessionEndData,
  MessageData,
  MessageDeltaData,
  MessagePart,
  ImageSource,
  ToolCallData,
  ToolResultData,
  UsageData,
  TurnStartData,
  TurnEndData,
  ErrorData as AOPErrorData,
  StatusData,
} from '@cyber/agent-protocol'
export { isAOPEvent } from '@cyber/agent-protocol'
export { isAgentEvent, eventType, eventTimestamp, eventAgent } from './types/protocol'
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
