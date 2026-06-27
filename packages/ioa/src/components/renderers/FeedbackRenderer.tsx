import type { ContentRendererProps } from '../content-registry'
import { isFeedbackContent } from '../../types'
import { contentBody, parseFeedbackReply } from '../forum-utils'
import { CheckpointFeedbackPreview } from '../CheckpointReviewComposer'
import { registerContentRenderer } from '../content-registry'

function FeedbackRenderer({ message }: ContentRendererProps) {
  if (!isFeedbackContent(message.content)) return null
  const feedback = parseFeedbackReply(JSON.stringify(message.content ?? {}))
  return (
    <div className="rounded-lg border border-success/20 bg-success/5 p-3">
      <CheckpointFeedbackPreview
        author={feedback?.actorName || 'Human'}
        option={feedback?.option}
        content={feedback?.text || feedback?.raw || contentBody(message.content)}
      />
    </div>
  )
}

registerContentRenderer('feedback', {
  renderer: FeedbackRenderer,
})
