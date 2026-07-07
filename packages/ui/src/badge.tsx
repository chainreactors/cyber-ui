import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@aspect/theme'

const badgeVariants = cva(
  'inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success/15 text-success',
        warning: 'border-transparent bg-warning/15 text-warning',
        caution: 'border-transparent bg-caution/15 text-caution',
        info: 'border-transparent bg-info/15 text-info',
        // Soft tonal fills completing the muted / primary / danger trio next to the
        // semantic ones above. Severity colours stay in lib/tones.ts — do NOT add
        // critical/high/low variants here (they'd duplicate destructive/caution/…).
        primary: 'border-transparent bg-primary/15 text-primary',
        muted: 'border-transparent bg-muted text-muted-foreground',
        danger: 'border-transparent bg-destructive/15 text-destructive',
      },
      size: {
        // Pill — the original badge shape.
        default: 'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        // Compact square chip for dense contexts (finding tags, asset facts), and
        // the leading-icon `gap`. Replaces the hand-rolled
        // `rounded px-1.5 py-0.5 text-[10px] font-medium` pills across the app.
        sm: 'gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
