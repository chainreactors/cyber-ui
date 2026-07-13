import * as React from 'react'
import { cn } from '@cyber/theme'

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

/**
 * A toggleable filter chip — a small pill button that reads as selected (soft
 * primary) or unselected (muted, hover to foreground). The recurring segmented-
 * filter control in the findings/asset views (severity filters, view tabs).
 * Shape/size is the caller's via className (rounded-full ↔ rounded); this owns
 * the active/inactive colour logic that was hand-rolled per call site.
 */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active = false, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/15 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
)
Chip.displayName = 'Chip'
