import { Loader2 } from 'lucide-react'
import { cn } from '@aspect/theme'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center gap-2" role="status">
      <Loader2 className={cn('animate-spin text-primary', sizeMap[size], className)} />
      {label && <span className="text-ui text-muted-foreground">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  )
}
