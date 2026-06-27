import type { ContentRendererProps } from '../content-registry'
import { isHandoffContent, type HandoffContent } from '../../types'
import { HandoffCard } from '../HandoffCard'
import { TargetNodeBadges } from './shared'
import { registerContentRenderer } from '../content-registry'

function HandoffRenderer({ message, participants }: ContentRendererProps) {
  if (!isHandoffContent(message.content)) return null
  const content = message.content as HandoffContent
  return (
    <>
      <HandoffCard title={content.title} message={content.message} />
      <TargetNodeBadges nodeIds={message.refs?.nodes ?? []} participants={participants} />
    </>
  )
}

registerContentRenderer('handoff', {
  renderer: HandoffRenderer,
})
