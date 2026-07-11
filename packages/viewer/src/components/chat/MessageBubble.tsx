import { useState, type ReactNode } from 'react'
import { Bot, ChevronDown, ChevronRight, User } from 'lucide-react'
import { cn } from '@cyber/theme'

export interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  actorName?: string | null
  content?: ReactNode
  timestamp?: string
  streaming?: boolean
  defaultExpanded?: boolean
  className?: string
  children?: ReactNode
}

export default function MessageBubble({
  role,
  actorName,
  content,
  timestamp,
  streaming,
  defaultExpanded = true,
  className,
  children,
}: MessageBubbleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : ''
  const body = children ?? content

  if (role === 'system') {
    return (
      <div
        className={cn(
          'w-full rounded-md border border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground',
          className,
        )}
      >
        {body || <span className="italic">Empty message</span>}
      </div>
    )
  }

  const isUser = role === 'user'
  const label = isUser ? 'You' : actorName || 'Assistant'
  const Icon = isUser ? User : Bot
  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <div className={cn('flex w-full gap-3', isUser && 'flex-row-reverse', className)}>
      {/* avatar */}
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
          isUser
            ? 'bg-primary/15 text-primary'
            : 'bg-purple-400/20 text-purple-600 dark:text-purple-300',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* bubble */}
      <div className={cn('min-w-0 space-y-1', isUser ? 'flex max-w-[min(82%,52rem)] flex-col items-end' : 'flex-1')}>
        {/* header */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'flex items-center gap-2 text-[10px] text-muted-foreground',
            isUser && 'flex-row-reverse',
          )}
        >
          <span className="font-medium">{label}</span>
          {time && <span className="font-mono">{time}</span>}
          <Chevron className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
        </button>

        {/* body */}
        {expanded && (
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm leading-relaxed',
              isUser
                ? 'bg-primary/10 text-foreground'
                : 'border border-border bg-card text-foreground',
              streaming && 'border-primary/40',
            )}
          >
            {body || (!streaming && <span className="text-muted-foreground italic">Empty message</span>)}
            {streaming && <StreamingCursor />}
          </div>
        )}
      </div>
    </div>
  )
}

export function StreamingCursor() {
  return (
    <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-primary align-text-bottom" />
  )
}
