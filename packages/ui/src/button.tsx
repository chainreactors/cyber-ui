import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@aspect/theme'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Soft-tinted primary — the "recessed / launch" affordance used by toolbars
        // and rails across the deck (e.g. SessionList's local-agent launch button),
        // instead of hand-rolled `bg-primary/10 text-primary`.
        soft: 'bg-primary/10 text-primary hover:bg-primary/15',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        // Dense micro-action (rail/toolbar rows): shorter than `sm`, 10px text.
        // Replaces the hand-rolled `h-6 px-2 text-[10px]` buttons in SessionList
        // /App that had no matching Button size.
        xs: 'h-6 gap-1 rounded px-2 text-[10px]',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /**
   * Pressed / selected state for toggle-style buttons (toolbar tabs, rail items).
   * Applies the soft-primary tint over the chosen variant and sets `aria-pressed`,
   * so a `ghost` button reads as "active" without callers re-implementing it.
   */
  active?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, active = false, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          active && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
          className,
        )}
        ref={ref}
        aria-pressed={active || undefined}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
