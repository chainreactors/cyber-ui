import { cn } from '@aspect/theme'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)} role="status">
      <div
        className={cn(
          'animate-spin rounded-full border-muted-foreground/25 border-t-primary',
          sizeMap[size]
        )}
      />
      {label && <span className="text-ui text-muted-foreground">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  )
}
