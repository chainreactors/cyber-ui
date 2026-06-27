// ── Components ──

export { ForumView } from './components/ForumView'
export type { ForumViewProps } from './components/ForumView'

export { ThreadList } from './components/ThreadList'
export type { ThreadListProps } from './components/ThreadList'

export { ThreadListItem } from './components/ThreadListItem'
export type { ThreadListItemProps } from './components/ThreadListItem'

export { ThreadView } from './components/ThreadView'
export type { ThreadViewProps } from './components/ThreadView'

export { ThreadHeader } from './components/ThreadHeader'
export type { ThreadHeaderProps } from './components/ThreadHeader'

export { Timeline } from './components/Timeline'
export type { TimelineProps } from './components/Timeline'

export { GraphPanel, CollapsedGraphButton } from './components/GraphPanel'
export type { GraphPanelProps, CollapsedGraphButtonProps } from './components/GraphPanel'

export { TimelineEntry } from './components/TimelineEntry'
export type { TimelineEntryProps, TimelineEntryTone } from './components/TimelineEntry'

export { CheckpointCard } from './components/CheckpointCard'
export type { CheckpointCardProps } from './components/CheckpointCard'

export { CheckpointReviewComposer, CheckpointFeedbackPreview } from './components/CheckpointReviewComposer'
export type { CheckpointReviewComposerProps } from './components/CheckpointReviewComposer'

export { ReplyComposer } from './components/ReplyComposer'
export type { ReplyComposerProps } from './components/ReplyComposer'

export { MessageContent } from './components/MessageContent'
export type { MessageContentProps } from './components/MessageContent'

export { HandoffCard } from './components/HandoffCard'
export type { HandoffCardProps } from './components/HandoffCard'

// ── Content registry ──

export { registerContentRenderer, resolveRenderer } from './components/content-registry'
export type { ContentRendererProps, ContentRendererConfig, TimelineTone } from './components/content-registry'

// ── Types ──

export type {
  IoaRef,
  IoaMessage,
  IoaMessageRecord,
  ForumParticipant,
  ForumThread,
  ForumData,
  SpaceInfo,
  ForumContentType,
  ForumMessageContent,
  HandoffContent,
  CheckpointSubmittedContent,
  CheckpointFeedbackContent,
  TeamMessageContent,
  SwarmMessageContent,
  Checkpoint,
  CheckpointReply,
  CheckpointKind,
  CheckpointStatus,
  TaskFocusTarget,
} from './types'

export {
  isHandoffContent,
  isCheckpointContent,
  isFeedbackContent,
  isTeamMessageContent,
  isSwarmContent,
  detectContentType,
  parseTaskNodeName,
  isHumanNodeName,
} from './types'

// ── Utility re-exports ──

export {
  shortId,
  contentBody,
  messageTitle,
  firstLine,
  isInteractiveTarget,
  parseFeedbackReply,
  friendlyForumError,
  threadLabels,
  searchableThreadText,
  messageRefIds,
  contentString,
  asString,
  dateValue,
} from './components/forum-utils'

export { groupIntoThreads } from './thread-grouping'
export type { ThreadableMessage, ThreadGroup } from './thread-grouping'

export { parseSearchQuery, normalizeSearchLabel, toggleSearchLabel } from './search-query'
export type { ParsedSearchQuery } from './search-query'

export { formatDate, formatTimelineTimestamp, fullTimelineTimestamp } from './format-helpers'

export {
  effectiveCheckpointOptions,
  isProjectedDefaultApproveOption,
  DEFAULT_CHECKPOINT_APPROVE_OPTION,
  CHECKPOINT_REJECT_OPTION,
} from './checkpoint-helpers'
