import { Moon, Sun } from 'lucide-react'
import { Button } from './button'
import { cn } from '@aspect/theme'

export interface ThemeToggleProps {
  isDark: boolean
  onToggle: () => void
  className?: string
  size?: 'default' | 'sm'
}

export function ThemeToggle({ isDark, onToggle, className, size = 'default' }: ThemeToggleProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  const btnSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={onToggle}
      className={cn(btnSize, 'shrink-0 text-muted-foreground', className)}
    >
      {isDark ? <Sun className={iconSize} /> : <Moon className={iconSize} />}
    </Button>
  )
}
