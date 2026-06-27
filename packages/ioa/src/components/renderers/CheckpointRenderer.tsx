import type { ContentRendererProps } from '../content-registry'
import type { Checkpoint, CheckpointReply, CheckpointSubmittedContent } from '../../types'
import { isCheckpointContent } from '../../types'
import { CheckpointCard } from '../CheckpointCard'
import { registerContentRenderer } from '../content-registry'

function CheckpointRenderer({ message, extra }: ContentRendererProps) {
  if (!isCheckpointContent(message.content)) return null
  const cpContent = message.content as CheckpointSubmittedContent
  const checkpoints = extra.checkpoints as Map<string, Checkpoint> | undefined
  const checkpoint = checkpoints?.get(cpContent.id)
  if (!checkpoint) return null

  const submittingId = extra.submittingId as string | null
  const submitErrors = (extra.submitErrors as Record<string, string>) ?? {}
  const onCheckpointReply = extra.onCheckpointReply as ((entityId: string, reply: CheckpointReply) => Promise<void>) | undefined

  const checkpointTaskId = checkpoint.taskId || ''
  const canResume = Boolean(checkpointTaskId)
  const isSubmitting = Boolean(submittingId === cpContent.id)

  return (
    <CheckpointCard
      checkpoint={checkpoint}
      disabled={!canResume || isSubmitting}
      disabledReason={!canResume ? 'Checkpoint task metadata missing; this checkpoint cannot be resumed.' : ''}
      error={submitErrors[cpContent.id] ?? ''}
      onReply={reply => onCheckpointReply?.(cpContent.id, reply) ?? Promise.resolve()}
    />
  )
}

registerContentRenderer('checkpoint', {
  renderer: CheckpointRenderer,
})
