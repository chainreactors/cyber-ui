export type BadgeTone = 'muted' | 'cyan' | 'yellow' | 'green' | 'red'

export const badgeToneClass: Record<BadgeTone, string> = {
  muted: 'bg-muted/60 text-muted-foreground',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  yellow: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  red: 'bg-destructive/15 text-destructive',
}

export function statusCodeTone(code: string): BadgeTone {
  if (code.startsWith('2')) return 'green'
  if (code.startsWith('3')) return 'cyan'
  if (code.startsWith('4') || code.startsWith('5')) return 'red'
  return 'muted'
}

export function severityTone(severity?: string): BadgeTone {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'red'
    case 'high': return 'red'
    case 'medium': return 'yellow'
    case 'low': return 'cyan'
    default: return 'muted'
  }
}
