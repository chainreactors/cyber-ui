import type { ForumThread, TaskFocusTarget } from '../types'
import { cn } from '@aspect/theme'
import { Badge, Button } from '@aspect/ui'
import { ArrowUpRight, MessageSquare } from 'lucide-react'
import { formatDate } from '../format-helpers'
import { threadLabels } from './forum-utils'
import { resolveRenderer } from './content-registry'

export interface ThreadListItemProps {
  thread: ForumThread
  onClick: () => void
  onOpenTask?: (id: string, focus?: TaskFocusTarget) => void
}

function statusDotColor(thread: ForumThread): string {
  return resolveRenderer(thread.contentType).dotColor
}

function contentTypeBadgeVariant(thread: ForumThread): 'warning' | 'outline' | 'secondary' | 'success' | 'destructive' {
  return resolveRenderer(thread.contentType).badgeVariant
}

export function ThreadListItem({ thread, onClick, onOpenTask }: ThreadListItemProps) {
  const labels = threadLabels(thread)
  const taskId = thread.sender?.taskId
  const canOpenTask = Boolean(taskId && onOpenTask)
  const senderLabel = thread.sender?.taskName || thread.sender?.nodeName || ''

  return (
    <div
      className="group flex w-full border-b border-border/70 bg-card transition-colors last:border-b-0 hover:bg-muted/35"
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
      >
        <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', statusDotColor(thread))} />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="break-words text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
              {thread.title}
            </span>
            <Badge variant={contentTypeBadgeVariant(thread)} className="rounded-md px-1.5 py-px text-[10px]">
              {thread.contentType}
            </Badge>
            {labels.slice(0, 3).map(label => (
              <Badge key={label} variant="secondary" className="rounded-md px-1.5 py-px text-[10px]">
                {label}
              </Badge>
            ))}
          </span>
          <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/70">
            {senderLabel && <span className="truncate">{senderLabel}</span>}
            {!senderLabel && <span className="truncate">{thread.spaceName}</span>}
            {thread.latestAt && <span>{formatDate(thread.latestAt)}</span>}
          </span>
        </span>
      </button>
      <div className="hidden shrink-0 items-center gap-4 border-l border-border/60 px-4 py-3 text-[11px] text-muted-foreground md:flex">
        <span className="inline-flex min-w-[44px] flex-col items-center">
          <MessageSquare className="mb-1 h-3.5 w-3.5" />
          {thread.messageCount}
        </span>
        {canOpenTask && (
          <Button
            variant="outline"
            size="icon-sm"
            title="Open in task"
            onClick={() => onOpenTask?.(taskId ?? '')}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
