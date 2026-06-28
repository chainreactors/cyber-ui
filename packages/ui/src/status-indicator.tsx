import { cn } from '@aspect/theme'
import { Badge } from './badge'

export type StatusKind = 'idle' | 'running' | 'success' | 'error' | 'pending' | 'warning' | 'info'

export interface StatusIndicatorProps {
  status: StatusKind
  label?: string
  showDot?: boolean
  className?: string
}

const dotColors: Record<StatusKind, string> = {
  idle: 'bg-muted-foreground',
  running: 'bg-info animate-pulse',
  success: 'bg-success',
  error: 'bg-destructive',
  pending: 'bg-warning animate-pulse',
  warning: 'bg-warning',
  info: 'bg-info',
}

const badgeStyles: Record<StatusKind, string> = {
  idle: 'bg-muted text-muted-foreground border-muted-foreground/15',
  running: 'bg-info/15 text-info border-info/15',
  success: 'bg-success/15 text-success border-success/15',
  error: 'bg-destructive/15 text-destructive border-destructive/15',
  pending: 'bg-warning/15 text-warning border-warning/15',
  warning: 'bg-warning/15 text-warning border-warning/15',
  info: 'bg-info/15 text-info border-info/15',
}

export function StatusIndicator({ status, label, showDot = true, className }: StatusIndicatorProps) {
  const displayLabel = label || status

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full px-2 py-0 text-[10px] font-semibold capitalize',
        badgeStyles[status],
        className,
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColors[status])} />
      )}
      {displayLabel}
    </Badge>
  )
}

export function StatusDot({ status, className }: { status: StatusKind; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dotColors[status], className)}
      aria-label={status}
    />
  )
}
