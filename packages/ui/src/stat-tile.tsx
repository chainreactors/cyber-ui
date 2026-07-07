import type { ReactNode } from 'react'
import { cn } from '@aspect/theme'

export type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'caution' | 'destructive' | 'muted'

const valueTone: Record<StatTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  caution: 'text-caution',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
}

export interface StatTileProps {
  label: ReactNode
  value: ReactNode
  tone?: StatTone
  /** Optional leading glyph next to the label. */
  icon?: ReactNode
  className?: string
}

/**
 * A compact metric tile — uppercase label over a mono value. The building block
 * of the scan/asset metric grids (hosts / services / loots / …). Promoted out of
 * AssetResultView's private `Metric`, which recurred there (×9) and in
 * FindingsSummary.
 */
export function StatTile({ label, value, tone = 'default', icon, className }: StatTileProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon && <span className="flex shrink-0 items-center">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-1 font-mono text-sm', valueTone[tone])}>{value}</div>
    </div>
  )
}
