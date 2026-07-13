import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@cyber/theme'

export type CalloutTone = 'info' | 'success' | 'warning' | 'destructive' | 'primary' | 'ai'

const toneClass: Record<CalloutTone, string> = {
  info: 'border-info/30 bg-info/10 text-info',
  primary: 'border-primary/30 bg-primary/10 text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  ai: 'border-ai/30 bg-ai/5 text-ai',
}

export interface CalloutProps {
  tone?: CalloutTone
  /** Leading glyph, top-aligned with the first line of the message. */
  icon?: ReactNode
  /** When set, renders a dismiss (×) button that calls this. */
  onDismiss?: () => void
  className?: string
  children: ReactNode
}

/**
 * A tinted inline alert box: leading icon + message on a role-coloured surface.
 * Replaces the ~10 hand-rolled `border-{tone}/30 bg-{tone}/10 text-{tone}` boxes
 * across the chat, config and session panels. Use `Badge` / `StatusIndicator`
 * for one-line status pills — Callout is for multi-line notices.
 */
export function Callout({ tone = 'info', icon, onDismiss, className, children }: CalloutProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-relaxed',
        toneClass[tone],
        className,
      )}
    >
      {icon && <span className="mt-0.5 flex shrink-0 items-center">{icon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 shrink-0 rounded p-0.5 text-current opacity-60 transition hover:bg-foreground/10 hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
