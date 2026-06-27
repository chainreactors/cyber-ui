import type { ForumParticipant } from '../../types'
import { ArrowRight } from 'lucide-react'
import { shortId } from '../forum-utils'

export function TargetNodeBadges({
  nodeIds,
  participants,
}: {
  nodeIds: string[]
  participants: Map<string, ForumParticipant>
}) {
  if (nodeIds.length === 0) return null
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
      <ArrowRight className="h-3 w-3 shrink-0" />
      {nodeIds.map(id => {
        const p = participants.get(id)
        const label = p?.taskName || p?.nodeName || shortId(id)
        return (
          <span key={id} className="inline-flex items-center rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
            {label}
          </span>
        )
      })}
    </div>
  )
}
