import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@aspect/theme'

export interface ResultLineProps {
  /** `true` → success (check glyph + primary tint); `false` → failure (alert + destructive). */
  ok: boolean
  /** Full text revealed on hover when the line truncates (native `title`). */
  title?: string
  className?: string
  children: ReactNode
}

/**
 * A one-line inline probe / check result: leading status glyph + tinted,
 * optionally-truncating text. For connection-test / health-probe rows where a
 * `Badge` pill is too rigid and a `Callout` block is too heavy. Success reads
 * `primary` (the deck's "ok" tint), not a green success — matching the existing
 * probe rows it collapses.
 */
export function ResultLine({ ok, title, className, children }: ResultLineProps) {
  const Icon = ok ? CheckCircle : AlertCircle
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-xs',
        ok ? 'text-primary' : 'text-destructive',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className={cn('min-w-0', title && 'truncate')} title={title}>
        {children}
      </span>
    </span>
  )
}
