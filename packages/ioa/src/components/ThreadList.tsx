import type { ForumThread, TaskFocusTarget } from '../types'
import { cn } from '@aspect/theme'
import { ScrollArea, Button, EmptyState, SkeletonList, Input } from '@aspect/ui'
import { AlertCircle, Inbox, RefreshCw, Search } from 'lucide-react'
import { friendlyForumError } from './forum-utils'
import { ThreadListItem } from './ThreadListItem'

export interface ThreadListProps {
  threads: ForumThread[]
  counts?: {
    total: number
    pending: number
  }
  loading: boolean
  error: string
  query: string
  onQueryChange: (query: string) => void
  onSelectThread: (id: string) => void
  onOpenTask?: (id: string, focus?: TaskFocusTarget) => void
  onReload: () => void
  compactHeader?: boolean
}

function Notice({ message }: { message: string }) {
  const friendly = friendlyForumError(message)
  return (
    <div className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-3 text-xs text-warning">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">{friendly.title}</div>
          <div className="mt-1 leading-relaxed text-warning/90">{friendly.description}</div>
          {friendly.raw && <div className="mt-1 break-words text-warning/70">{friendly.raw}</div>}
        </div>
      </div>
    </div>
  )
}

export function ThreadList({
  threads,
  counts: countsProp,
  loading,
  error,
  query,
  onQueryChange,
  onSelectThread,
  onOpenTask,
  onReload,
  compactHeader = false,
}: ThreadListProps) {
  const counts = countsProp ?? {
    total: threads.length,
    pending: threads.filter(t => t.pendingCount > 0).length,
  }

  if (compactHeader) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <section className="shrink-0 border-b border-border/70 bg-background px-3 py-2 sm:px-4">
          <div className="mx-auto flex max-w-6xl items-center gap-2">
            <div className="min-w-0 truncate text-xs text-muted-foreground">
              {counts.total} threads
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="icon-sm" onClick={onReload} title="Refresh">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </section>
        <ThreadListContent threads={threads} loading={loading} error={error} onSelectThread={onSelectThread} onOpenTask={onOpenTask} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <section className="shrink-0 border-b border-border bg-background px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">IOA topics</div>
              <h2 className="mt-1 truncate text-h2 font-bold tracking-normal text-foreground">Forum Threads</h2>
              <div className="mt-1 text-xs text-muted-foreground">
                {counts.total} threads
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={query}
                onChange={event => onQueryChange(event.target.value)}
                placeholder="Search threads · type:checkpoint · label:security"
                className="h-9 rounded-lg pl-8 text-xs"
              />
            </div>
            <Button variant="outline" size="icon-sm" onClick={onReload} title="Refresh">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </section>
      <ThreadListContent threads={threads} loading={loading} error={error} onSelectThread={onSelectThread} onOpenTask={onOpenTask} />
    </div>
  )
}

function ThreadListContent({
  threads,
  loading,
  error,
  onSelectThread,
  onOpenTask,
}: {
  threads: ForumThread[]
  loading: boolean
  error: string
  onSelectThread: (id: string) => void
  onOpenTask?: (id: string) => void
}) {
  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto max-w-6xl px-4 py-4">
        {loading && threads.length === 0 && <SkeletonList count={6} />}
        {error && <Notice message={error} />}
        {!loading && threads.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="No threads"
            description="No threads match the current search."
            compact
          />
        )}
        {threads.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {threads.map(thread => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                onClick={() => onSelectThread(thread.id)}
                onOpenTask={onOpenTask}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
