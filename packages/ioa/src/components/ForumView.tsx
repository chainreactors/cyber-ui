import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ForumThread, ForumParticipant, Checkpoint, CheckpointReply, IoaMessageRecord, TaskFocusTarget } from '../types'
import { normalizeSearchLabel, parseSearchQuery } from '../search-query'
import { removeRecordKey, searchableThreadText, threadLabels } from './forum-utils'
import { ThreadList } from './ThreadList'
import { ThreadView } from './ThreadView'

/**
 * Props-driven ForumView.
 *
 * All data is supplied via props -- this component has NO connection to any
 * external store, service layer, or data-fetching logic.  The consumer is
 * responsible for loading forum data and wiring up the action callbacks.
 */
export interface ForumViewProps {
  /** Pre-loaded forum threads. */
  threads: ForumThread[]

  /** Participant lookup map (sender-id -> participant). */
  participants?: Map<string, ForumParticipant>

  /** Whether the consumer is currently loading data. */
  loading?: boolean

  /** Error message from the consumer's data layer. */
  error?: string

  /** Controlled selected thread id.  When omitted the component manages its
   *  own selection state internally. */
  selectedThreadId?: string

  /** Called when the user selects or deselects a thread. */
  onSelectThread?: (threadId: string) => void

  /** Called when the user replies to a message inside a thread. */
  onReplyToMessage?: (message: IoaMessageRecord, content: string) => Promise<void>

  /** Called when the user replies to the thread as a whole. */
  onReplyToThread?: (threadId: string, content: string) => Promise<void>

  /** Called when the user submits feedback on a checkpoint. */
  onCheckpointReply?: (entityId: string, reply: CheckpointReply) => Promise<void>

  /** Map of checkpoint entity-ids to Checkpoint objects for the current thread. */
  checkpoints?: Map<string, Checkpoint>

  /** Called when the user clicks "Open task" on a thread/message. */
  onOpenTask?: (id: string, focus?: TaskFocusTarget) => void

  /** Called when the user clicks the reload/refresh button. */
  onReload?: () => void

  /** External search query (controlled).  Omit to use internal query state. */
  query?: string

  /** Called when the internal search query changes (only relevant when `query` is not supplied). */
  onQueryChange?: (query: string) => void

  /** Use compact header layout. */
  compactHeader?: boolean

  /** Additional CSS class. */
  className?: string
}

export function ForumView({
  threads,
  participants = new Map(),
  loading = false,
  error = '',
  selectedThreadId: selectedThreadIdProp,
  onSelectThread: onSelectThreadProp,
  onReplyToMessage,
  onReplyToThread,
  onCheckpointReply,
  checkpoints: checkpointsProp,
  onOpenTask,
  onReload,
  query: queryProp,
  onQueryChange: onQueryChangeProp,
  compactHeader = false,
}: ForumViewProps) {
  // ── Internal state (used when props are not controlled) ──

  const [localQuery, setLocalQuery] = useState('')
  const [localSelectedThreadId, setLocalSelectedThreadId] = useState('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [submitErrors, setSubmitErrors] = useState<Record<string, string>>({})
  const [replySubmittingId, setReplySubmittingId] = useState('')
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({})

  const query = queryProp ?? localQuery
  const setQuery = onQueryChangeProp ?? setLocalQuery

  const controlledThread = selectedThreadIdProp !== undefined
  const selectedThreadId = selectedThreadIdProp ?? localSelectedThreadId
  const setSelectedThreadId = useCallback((threadId: string) => {
    if (!controlledThread) setLocalSelectedThreadId(threadId)
    onSelectThreadProp?.(threadId)
  }, [controlledThread, onSelectThreadProp])

  // ── Filtering via search ──

  const pendingThreads = useMemo(() => threads.filter(t => t.pendingCount > 0), [threads])

  const visibleThreads = useMemo(() => {
    const parsed = parseSearchQuery(query)
    return threads.filter(thread => {
      if (parsed.is.includes('pending') && thread.pendingCount === 0) return false
      if (parsed.type.length > 0 && !parsed.type.includes(thread.contentType.toLowerCase())) return false
      if (parsed.labels.length > 0) {
        const labelValues = new Set(threadLabels(thread).map(normalizeSearchLabel))
        if (!parsed.labels.every(label => labelValues.has(label))) return false
      }
      if (parsed.terms.length === 0) return true
      return parsed.terms.every(term => searchableThreadText(thread).includes(term))
    })
  }, [threads, query])

  // Clear selection if the selected thread disappears from data
  useEffect(() => {
    if (loading || threads.length === 0 || !selectedThreadId || threads.some(t => t.id === selectedThreadId)) return
    setSelectedThreadId('')
  }, [threads, threads.length, loading, selectedThreadId, setSelectedThreadId])

  // ── Selected thread ──

  const selectedThread = threads.find(t => t.id === selectedThreadId) ?? null

  // ── Checkpoint context (for renderers) ──

  const checkpoints = checkpointsProp ?? new Map<string, Checkpoint>()

  const handleCheckpointReply = useCallback(async (entityId: string, reply: CheckpointReply) => {
    if (!onCheckpointReply) return
    setSubmittingId(entityId)
    setSubmitErrors(prev => removeRecordKey(prev, entityId))
    try {
      await onCheckpointReply(entityId, reply)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reply failed'
      setSubmitErrors(prev => ({ ...prev, [entityId]: message }))
      throw err
    } finally {
      setSubmittingId(null)
    }
  }, [onCheckpointReply])

  // ── Message reply ──

  const handleMessageReply = useCallback(async (message: IoaMessageRecord, content: string) => {
    if (!onReplyToMessage || !message.id) return
    setReplySubmittingId(message.id)
    setReplyErrors(prev => removeRecordKey(prev, message.id!))
    try {
      await onReplyToMessage(message, content)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reply failed'
      setReplyErrors(prev => ({ ...prev, [message.id!]: msg }))
      throw err
    } finally {
      setReplySubmittingId('')
    }
  }, [onReplyToMessage])

  // ── Thread reply ──

  const handleThreadReply = useCallback(async (content: string) => {
    if (!onReplyToThread || !selectedThread?.id) return
    const key = `thread:${selectedThread.id}`
    setReplySubmittingId(key)
    setReplyErrors(prev => removeRecordKey(prev, key))
    try {
      await onReplyToThread(selectedThread.id, content)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reply failed'
      setReplyErrors(prev => ({ ...prev, [key]: msg }))
      throw err
    } finally {
      setReplySubmittingId('')
    }
  }, [onReplyToThread, selectedThread])

  const extra = useMemo(() => ({
    checkpoints,
    submittingId,
    submitErrors,
    onCheckpointReply: handleCheckpointReply,
  }), [checkpoints, submittingId, submitErrors, handleCheckpointReply])

  // ── Render ──

  if (selectedThread) {
    return (
      <ThreadView
        thread={selectedThread}
        participants={participants}
        extra={extra}
        onOpenTask={onOpenTask}
        onReplyToMessage={onReplyToMessage ? handleMessageReply : undefined}
        onReplyToThread={onReplyToThread ? handleThreadReply : undefined}
        replySubmittingId={replySubmittingId}
        replyErrors={replyErrors}
        onBack={() => setSelectedThreadId('')}
      />
    )
  }

  return (
    <ThreadList
      threads={visibleThreads}
      counts={{
        total: threads.length,
        pending: pendingThreads.length,
      }}
      loading={loading}
      error={error}
      query={query}
      onQueryChange={setQuery}
      onSelectThread={setSelectedThreadId}
      onOpenTask={onOpenTask ? (id) => onOpenTask(id) : undefined}
      onReload={onReload ?? (() => {})}
      compactHeader={compactHeader}
    />
  )
}
