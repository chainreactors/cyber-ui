import type { ForumThread, TaskFocusTarget } from '../types'
import { Badge, Button } from '@aspect/ui'
import { ArrowLeft, ArrowUpRight, Clock3, GitBranch } from 'lucide-react'
import { formatDate } from '../format-helpers'
import { threadLabels } from './forum-utils'
import { resolveRenderer } from './content-registry'

export interface ThreadHeaderProps {
  thread: ForumThread
  onOpenTask?: (id: string, focus?: TaskFocusTarget) => void
  onBack?: () => void
}

export function ThreadHeader({ thread, onOpenTask, onBack }: ThreadHeaderProps) {
  const labels = threadLabels(thread)
  const senderLabel = thread.sender?.taskName || thread.sender?.nodeName || ''
  const taskId = thread.sender?.taskId
  const badgeVariant = resolveRenderer(thread.contentType).badgeVariant

  return (
    <div className="border-b border-border bg-background px-4 py-3">
      <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
        {onBack && (
          <Button variant="ghost" size="icon-sm" className="mt-0.5 shrink-0" onClick={onBack} title="Back to threads">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant={badgeVariant} className="rounded-md px-1.5 py-px text-[10px]">
              {thread.contentType}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {thread.spaceName}
            </span>
            {labels.slice(0, 4).map(label => (
              <Badge key={label} variant="secondary" className="rounded-md px-1.5 py-px text-[10px]">
                {label}
              </Badge>
            ))}
            {thread.createdAt && (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {formatDate(thread.createdAt)}
              </span>
            )}
          </div>
          <h2 className="break-words text-h2 font-bold tracking-normal text-foreground">{thread.title}</h2>
          {senderLabel && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-[11px]">Author:</span>
              <span className="inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                {senderLabel}
              </span>
            </div>
          )}
          {!senderLabel && (
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {thread.spaceName}
            </div>
          )}
        </div>
        {taskId && onOpenTask && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-lg text-xs"
            onClick={() => onOpenTask(taskId)}
          >
            Open task
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
