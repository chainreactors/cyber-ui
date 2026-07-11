import type { ForumThread, ForumParticipant, IoaMessageRecord } from '../types'
import { detectContentType } from '../types'
import { resolveRenderer } from './content-registry'
import './renderers'
import { TimelineEntry } from './TimelineEntry'
import { MessageContent } from './MessageContent'
import { Badge, Button } from '@cyber/ui'
import { Bot, CornerDownRight } from 'lucide-react'
import { contentBody, messageRefIds, messageTitle } from './forum-utils'
import { ReplyComposer } from './ReplyComposer'

export interface TimelineProps {
  thread: ForumThread
  participants: Map<string, ForumParticipant>
  selectedMessageId: string
  extra: Record<string, unknown>
  onSelectMessage: (messageId: string) => void
  onRegisterMessage: (messageId: string, element: HTMLElement | null) => void
  onReplyToMessage?: (message: IoaMessageRecord, content: string) => Promise<void>
  replySubmittingId?: string
  replyErrors?: Record<string, string>
}

function resolveSenderLabel(senderId: string | undefined, participants: Map<string, ForumParticipant>): string {
  if (!senderId) return ''
  const p = participants.get(senderId)
  return p?.taskName || p?.nodeName || senderId
}

function titleForMessage(message: IoaMessageRecord): string {
  const content = message.content as Record<string, unknown> | undefined
  if (!content) return message.sender || 'Message'
  return messageTitle(content) || contentBody(content).split(/\r?\n/).map(l => l.trim()).find(Boolean) || message.sender || 'Message'
}

function MessageRefSummary({
  message,
  thread,
  onSelectMessage,
}: {
  message: IoaMessageRecord
  thread: ForumThread
  onSelectMessage: (messageId: string) => void
}) {
  const outgoingIds = messageRefIds(message)
  const messageById = new Map(thread.messages.map(m => [m.id!, m]))
  const outgoing = outgoingIds.map(id => messageById.get(id)).filter((m): m is IoaMessageRecord => Boolean(m))
  const incoming = thread.messages.filter(m => messageRefIds(m).includes(message.id!))
  const externalCount = outgoingIds.length - outgoing.length

  if (outgoingIds.length === 0 && incoming.length === 0) return null

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-[11px] text-muted-foreground">
      <Badge variant="outline" className="rounded-md px-1.5 py-px text-[10px]">
        {outgoingIds.length} refs
      </Badge>
      {outgoing.length > 0 && <span>references</span>}
      {outgoing.slice(0, 3).map(refMsg => (
        <button
          key={refMsg.id}
          type="button"
          className="max-w-[180px] truncate rounded-md border border-border bg-card px-1.5 py-0.5 text-left text-[11px] text-foreground hover:bg-muted"
          title={titleForMessage(refMsg)}
          onClick={(event) => {
            event.stopPropagation()
            onSelectMessage(refMsg.id!)
          }}
        >
          {titleForMessage(refMsg)}
        </button>
      ))}
      {outgoing.length > 3 && <span>+{outgoing.length - 3}</span>}
      {incoming.length > 0 && <span>referenced by {incoming.length}</span>}
      {externalCount > 0 && <span>{externalCount} external</span>}
    </div>
  )
}

export function Timeline({
  thread,
  participants,
  selectedMessageId,
  extra,
  onSelectMessage,
  onRegisterMessage,
  onReplyToMessage,
  replySubmittingId = '',
  replyErrors = {},
}: TimelineProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5">
      <div className="space-y-1">
        {thread.messages.map((message, index) => {
          const last = index === thread.messages.length - 1
          const ct = detectContentType(message.content, message.content_type)
          const config = resolveRenderer(ct)
          const isRoot = index === 0
          const Icon = config.icon ?? Bot
          const Renderer = config.renderer
          const senderParticipant = message.sender ? participants.get(message.sender) : undefined
          const canReplyToSender = Boolean(senderParticipant?.taskId)
          const replyTargetLabel = senderParticipant?.taskName || senderParticipant?.nodeName || 'sender'

          return (
            <TimelineEntry
              key={message.id}
              tone={isRoot ? 'primary' : config.tone}
              icon={<Icon className="h-4 w-4" />}
              title={titleForMessage(message)}
              badge={ct}
              badgeVariant={config.badgeVariant}
              createdAt={message.created_at}
              sender={resolveSenderLabel(message.sender, participants)}
              last={last}
              active={selectedMessageId === message.id}
              messageId={message.id!}
              onSelectMessage={onSelectMessage}
              onRegisterMessage={onRegisterMessage}
            >
              <div className="space-y-3">
                {Renderer ? (
                  <Renderer message={message} participants={participants} extra={extra} />
                ) : (
                  <MessageContent content={message.content} meta={message.meta} />
                )}
                <MessageRefSummary message={message} thread={thread} onSelectMessage={onSelectMessage} />
                {onReplyToMessage && canReplyToSender && selectedMessageId !== message.id && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 rounded-md px-2.5 text-xs"
                      aria-label={`Reply to ${replyTargetLabel}`}
                      title={`Reply to ${replyTargetLabel}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectMessage(message.id!)
                      }}
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                      Reply
                    </Button>
                  </div>
                )}
                {selectedMessageId === message.id && onReplyToMessage && canReplyToSender && (
                  <ReplyComposer
                    item={{ message: { id: message.id!, sender: resolveSenderLabel(message.sender, participants) } }}
                    label={`Reply to ${replyTargetLabel}`}
                    submitting={replySubmittingId === message.id}
                    error={replyErrors[message.id!] || ''}
                    onSubmit={(content) => onReplyToMessage(message, content)}
                  />
                )}
              </div>
            </TimelineEntry>
          )
        })}
      </div>
    </div>
  )
}
