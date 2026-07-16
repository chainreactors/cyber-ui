import type { ReactNode } from 'react'
import { cn } from '@cyber/theme'
import { Badge as UIBadge } from '@cyber/ui'
import { type BadgeTone, badgeToneClass } from '../lib/tones'

export function EasmBadge({ children, tone = 'muted' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <UIBadge size="sm" className={cn('border-transparent', badgeToneClass[tone])}>
      {children}
    </UIBadge>
  )
}
