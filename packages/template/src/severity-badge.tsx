import { Badge } from '@cyber/ui'
import { cn } from '@cyber/theme'
import { getSeverityConfig } from './severity'

interface SeverityBadgeProps {
  severity: string
  className?: string
  showIcon?: boolean
  showLabel?: boolean
  variant?: 'default' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function SeverityBadge({
  severity,
  className,
  showIcon = true,
  showLabel = true,
  variant = 'outline',
  size = 'md',
}: SeverityBadgeProps) {
  const config = getSeverityConfig(severity)

  const sizeClasses = {
    sm: 'text-xs h-5',
    md: 'text-xs',
    lg: 'text-sm',
  }

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }

  const iconWithSize = showIcon && config.icon ? (
    <span className={cn('inline-flex items-center', iconSizes[size])}>
      {config.icon}
    </span>
  ) : null

  return (
    <Badge
      variant={variant}
      className={cn(
        'font-medium border inline-flex items-center gap-1',
        config.className,
        sizeClasses[size],
        className,
      )}
    >
      {iconWithSize}
      {showLabel && (
        <span className="inline-flex items-center">
          {config.label}
        </span>
      )}
    </Badge>
  )
}
