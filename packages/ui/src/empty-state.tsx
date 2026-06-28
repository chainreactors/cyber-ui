import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@aspect/theme'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
  className?: string
  children?: ReactNode
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      compact ? 'py-6 px-4 gap-2' : 'py-12 px-6 gap-3',
      className
    )}>
      <div className={cn(
        'rounded-full bg-muted flex items-center justify-center',
        compact ? 'h-10 w-10' : 'h-14 w-14'
      )}>
        <Icon className={cn(
          'text-muted-foreground',
          compact ? 'h-5 w-5' : 'h-7 w-7'
        )} />
      </div>
      <div className="space-y-1">
        <h3 className={cn(
          'font-semibold text-foreground',
          compact ? 'text-ui' : 'text-h4'
        )}>
          {title}
        </h3>
        {description && (
          <p className={cn(
            'text-muted-foreground max-w-[280px]',
            compact ? 'text-caption' : 'text-ui'
          )}>
            {description}
          </p>
        )}
      </div>
      {action}
      {children}
    </div>
  )
}
