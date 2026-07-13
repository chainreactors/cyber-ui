import { cn } from '@cyber/theme'

export type MeterTone = 'primary' | 'success' | 'warning' | 'caution' | 'destructive' | 'info'

const meterTone: Record<MeterTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  caution: 'bg-caution',
  destructive: 'bg-destructive',
  info: 'bg-info',
}

export interface MeterProps {
  value: number
  /** Denominator for the fill ratio. Default 100 (i.e. `value` is a percentage). */
  max?: number
  tone?: MeterTone
  /** Overrides the track (e.g. a taller bar); the fill inherits its height. */
  className?: string
  'aria-label'?: string
}

/**
 * A horizontal ratio bar — a tinted fill over a muted track. Replaces the
 * hand-rolled `h-2 rounded-full bg-secondary` + inner `style={{width}}` pattern,
 * and adds the `progressbar` a11y role/values the hand-rolled ones lacked.
 */
export function Meter({ value, max = 100, tone = 'primary', className, ...aria }: MeterProps) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...aria}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
    >
      <div
        className={cn('h-full rounded-full transition-all', meterTone[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
