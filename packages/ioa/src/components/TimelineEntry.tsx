import { type ReactNode } from 'react'
import { cn } from '@aspect/theme'
import { Badge } from '@aspect/ui'
import { formatTimelineTimestamp, fullTimelineTimestamp } from '../format-helpers'
import { isInteractiveTarget, shortId } from './forum-utils'

export type TimelineEntryTone = 'primary' | 'warning' | 'success' | 'info' | 'accent' | 'neutral'

export interface TimelineEntryProps {
  tone: TimelineEntryTone
  icon: ReactNode
  title: string
  badge: string
  badgeVariant?: 'warning' | 'success' | 'outline' | 'secondary' | 'destructive'
  createdAt?: string
  sender?: string
  statusBadge?: string
  last: boolean
  active: boolean
  messageId: string
  dimmed?: boolean
  children: ReactNode
  onSelectMessage: (messageId: string) => void
  onRegisterMessage: (messageId: string, element: HTMLElement | null) => void
}

function SenderTimestampRail({ createdAt, sender }: { createdAt?: string; sender?: string }) {
  const label = formatTimelineTimestamp(createdAt)
  const title = createdAt ? fullTimelineTimestamp(createdAt) : label
  const senderLabel = sender ? shortId(sender) : ''
  return (
    <div className="flex w-[88px] shrink-0 flex-col items-end gap-0.5 pt-2">
      {senderLabel && (
        <span className="max-w-full truncate text-[10px] font-medium leading-none text-muted-foreground" title={sender}>
          {senderLabel}
        </span>
      )}
      <time
        dateTime={createdAt || undefined}
        title={title}
        className="text-[11px] leading-none text-muted-foreground/65 tabular-nums"
      >
        {label}
      </time>
    </div>
  )
}

export function TimelineEntry({
  tone,
  icon,
  title,
  badge,
  badgeVariant = 'outline',
  createdAt,
  sender,
  statusBadge,
  last,
  active,
  messageId,
  dimmed,
  children,
  onSelectMessage,
  onRegisterMessage,
}: TimelineEntryProps) {
  return (
    <article
      ref={element => onRegisterMessage(messageId, element)}
      data-forum-message-id={messageId}
      className={cn(
        'relative grid grid-cols-[88px_34px_minmax(0,1fr)] gap-2 py-1.5 sm:gap-3',
        dimmed && 'opacity-65',
      )}
    >
      <SenderTimestampRail createdAt={createdAt} sender={sender} />
      <div className="relative flex justify-center">
        <span className={cn(
          'relative z-[1] inline-flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] bg-background',
          tone === 'primary' && 'border-primary/40 text-primary',
          tone === 'warning' && 'border-warning/45 text-warning',
          tone === 'success' && 'border-success/45 text-success',
          tone === 'info' && 'border-info/40 text-info',
          tone === 'accent' && 'border-indigo-500/40 text-indigo-500',
          tone === 'neutral' && 'border-border text-muted-foreground',
        )}>
          {icon}
        </span>
        {!last && <span className="absolute bottom-[-10px] top-[38px] w-0.5 rounded-full bg-border" />}
      </div>
      <div
        className={cn(
          'min-w-0 cursor-pointer overflow-hidden rounded-lg border bg-card transition-colors',
          active ? 'border-primary/50 ring-2 ring-primary/15' : 'border-border',
        )}
        onClick={event => {
          if (isInteractiveTarget(event.target)) return
          onSelectMessage(messageId)
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
          <strong className="min-w-0 flex-1 break-words text-sm font-semibold text-foreground">{title}</strong>
          <Badge
            variant={badgeVariant}
            className="shrink-0 rounded-md px-1.5 py-px text-[10px]"
          >
            {badge}
          </Badge>
          {statusBadge && (
            <Badge
              variant={statusBadge === 'pending' ? 'warning' : 'success'}
              className="shrink-0 rounded-md px-1.5 py-px text-[10px]"
            >
              {statusBadge}
            </Badge>
          )}
        </div>
        <div className="p-4 text-sm leading-relaxed text-foreground">
          {children}
        </div>
      </div>
    </article>
  )
}
