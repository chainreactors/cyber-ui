import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ForumThread, ForumParticipant, IoaMessageRecord, TaskFocusTarget } from '../types'
import { cn } from '@aspect/theme'
import { ScrollArea, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@aspect/ui'
import { GitBranch } from 'lucide-react'
import { ThreadHeader } from './ThreadHeader'
import { Timeline } from './Timeline'
import { GraphPanel, CollapsedGraphButton } from './GraphPanel'
import { messageRefIds } from './forum-utils'
import { ReplyComposer } from './ReplyComposer'

export interface ThreadViewProps {
  thread: ForumThread
  participants: Map<string, ForumParticipant>
  extra: Record<string, unknown>
  onOpenTask?: (id: string, focus?: TaskFocusTarget) => void
  onReplyToMessage?: (message: IoaMessageRecord, content: string) => Promise<void>
  onReplyToThread?: (content: string) => Promise<void>
  replySubmittingId?: string
  replyErrors?: Record<string, string>
  onBack: () => void
}

export function ThreadView({
  thread,
  participants,
  extra,
  onOpenTask,
  onReplyToMessage,
  onReplyToThread,
  replySubmittingId = '',
  replyErrors = {},
  onBack,
}: ThreadViewProps) {
  const [selectedMessageId, setSelectedMessageId] = useState(thread.root.id ?? '')
  const [graphOpen, setGraphOpen] = useState(false)
  const [graphCollapsed, setGraphCollapsed] = useState(true)
  const messageElementsRef = useRef(new Map<string, HTMLElement>())

  const edgeCount = useMemo(() => {
    const messageIds = new Set(thread.messages.map(m => m.id!))
    let count = 0
    for (const m of thread.messages) {
      for (const refId of messageRefIds(m)) {
        if (messageIds.has(refId)) count++
      }
    }
    return count
  }, [thread.messages])

  const threadTaskSenders = useMemo(() => {
    const senderIds = new Set<string>()
    for (const message of thread.messages) {
      if (!message.sender) continue
      const participant = participants.get(message.sender)
      if (participant?.taskId) senderIds.add(message.sender)
    }
    return [...senderIds]
      .map(senderId => participants.get(senderId))
      .filter((participant): participant is ForumParticipant => Boolean(participant?.taskId))
  }, [participants, thread.messages])

  useEffect(() => {
    messageElementsRef.current.clear()
    setSelectedMessageId(thread.root.id ?? '')
    setGraphOpen(false)
    setGraphCollapsed(true)
  }, [thread.id, thread.root.id])

  const registerMessageElement = useCallback((messageId: string, element: HTMLElement | null) => {
    if (element) {
      messageElementsRef.current.set(messageId, element)
    } else {
      messageElementsRef.current.delete(messageId)
    }
  }, [])

  const focusMessage = useCallback((messageId: string) => {
    setSelectedMessageId(messageId)
    window.requestAnimationFrame(() => {
      messageElementsRef.current.get(messageId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <div className={cn(
          'grid min-h-0 flex-1 overflow-hidden',
          graphCollapsed ? 'lg:grid-cols-[minmax(0,1fr)_56px]' : 'lg:grid-cols-[minmax(0,1fr)_380px]',
        )}>
          <ScrollArea className="min-h-0">
            <ThreadHeader thread={thread} onOpenTask={onOpenTask} onBack={onBack} />
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/15 px-4 py-2 lg:hidden">
              <div className="min-w-0 truncate text-xs text-muted-foreground">
                {thread.messageCount} messages · {edgeCount} refs
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs" onClick={() => setGraphOpen(true)}>
                <GitBranch className="h-3.5 w-3.5" />
                Graph
              </Button>
            </div>
            <Timeline
              thread={thread}
              participants={participants}
              selectedMessageId={selectedMessageId}
              extra={extra}
              onSelectMessage={focusMessage}
              onRegisterMessage={registerMessageElement}
              onReplyToMessage={onReplyToMessage}
              replySubmittingId={replySubmittingId}
              replyErrors={replyErrors}
            />
            {onReplyToThread && thread.root.id && (
              <div className="mx-auto w-full max-w-6xl px-4 pb-7">
                <ReplyComposer
                  item={{ message: { id: thread.root.id, sender: 'thread' } }}
                  label={`Reply to ${threadTaskSenders.length} thread sender${threadTaskSenders.length === 1 ? '' : 's'}`}
                  submitting={replySubmittingId === `thread:${thread.id}`}
                  error={replyErrors[`thread:${thread.id}`] || ''}
                  onSubmit={onReplyToThread}
                />
              </div>
            )}
          </ScrollArea>
          <aside className={cn('hidden min-h-0 border-l border-border bg-card/30 lg:block', graphCollapsed ? 'p-2' : 'p-3')}>
            {graphCollapsed ? (
              <CollapsedGraphButton
                thread={thread}
                onExpand={() => setGraphCollapsed(false)}
              />
            ) : (
              <GraphPanel
                thread={thread}
                selectedMessageId={selectedMessageId}
                onSelectMessage={focusMessage}
                mode="side"
                onCollapse={() => setGraphCollapsed(true)}
              />
            )}
          </aside>
        </div>
        <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
          <DialogContent className="h-[82vh] max-h-[82vh] w-[94vw] max-w-[94vw] gap-0 overflow-hidden p-0">
            <DialogHeader className="border-b border-border px-4 py-3">
              <DialogTitle className="text-sm">Message Graph</DialogTitle>
              <DialogDescription>{thread.messageCount} messages · {edgeCount} refs</DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 p-3">
              <GraphPanel
                thread={thread}
                selectedMessageId={selectedMessageId}
                onSelectMessage={(messageId) => {
                  setGraphOpen(false)
                  focusMessage(messageId)
                }}
                mode="dialog"
              />
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  )
}
