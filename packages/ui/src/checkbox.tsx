import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@cyber/theme'

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, disabled, onCheckedChange, onClick, 'aria-label': ariaLabel, ...props }, ref) => {
    const isChecked = checked === true

    const toggle = () => {
      if (!disabled) onCheckedChange?.(!isChecked)
    }

    return (
      <span
        role="checkbox"
        aria-label={ariaLabel}
        aria-checked={isChecked}
        aria-disabled={disabled || undefined}
        data-state={isChecked ? 'checked' : 'unchecked'}
        tabIndex={disabled ? -1 : 0}
        onClick={(event) => {
          event.stopPropagation()
          toggle()
          onClick?.(event as unknown as React.MouseEvent<HTMLInputElement>)
        }}
        onKeyDown={(event) => {
          if (event.key !== ' ' && event.key !== 'Enter') return
          event.preventDefault()
          toggle()
        }}
        className={cn(
          'inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=unchecked]:bg-background',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {isChecked && <Check className="h-3 w-3" />}
        <input
          {...props}
          ref={ref}
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={() => {}}
          onClick={(event) => event.stopPropagation()}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      </span>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
