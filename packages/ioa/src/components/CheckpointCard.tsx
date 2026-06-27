import type { Checkpoint, CheckpointReply } from '../types'
import { MarkdownContent } from '@aspect/markdown'
import { Badge } from '@aspect/ui'
import { parseFeedbackReply } from './forum-utils'
import { CheckpointFeedbackPreview, CheckpointReviewComposer } from './CheckpointReviewComposer'

export interface CheckpointCardProps {
  checkpoint: Checkpoint
  disabled: boolean
  disabledReason?: string
  error?: string
  onReply: (reply: CheckpointReply) => Promise<void>
}

export function CheckpointCard({
  checkpoint,
  disabled,
  disabledReason,
  error,
  onReply,
}: CheckpointCardProps) {
  const parsedFeedback = parseFeedbackReply(checkpoint.feedback)

  return (
    <div className="rounded-lg border border-border/60 bg-background">
      <div className="border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{checkpoint.title || checkpoint.kind}</h3>
          <Badge variant={checkpoint.status === 'pending' ? 'warning' : 'success'} className="rounded-md px-1.5 py-px text-[10px]">
            {checkpoint.status}
          </Badge>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <MarkdownContent content={checkpoint.content} />
        {parsedFeedback.raw ? (
          <div className="rounded-lg border border-success/20 bg-success/5 p-2.5 text-xs">
            <CheckpointFeedbackPreview
              author={parsedFeedback.actorName || 'Human'}
              option={parsedFeedback.option}
              content={parsedFeedback.text || parsedFeedback.option || parsedFeedback.raw}
            />
          </div>
        ) : checkpoint.status === 'pending' ? (
          <CheckpointReviewComposer
            checkpoint={checkpoint}
            disabled={disabled}
            disabledReason={disabledReason}
            error={error}
            onReply={onReply}
            submitLabel={checkpoint.options.length > 0 ? 'Submit review' : 'Approve'}
            compact
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 bg-card p-2.5 text-xs text-muted-foreground">
            Waiting for IOA feedback sync.
          </div>
        )}
      </div>
    </div>
  )
}
