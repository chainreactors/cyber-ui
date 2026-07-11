import type { ContentRendererProps } from '../content-registry'
import { isSwarmContent, type SwarmMessageContent } from '../../types'
import { MarkdownContent } from '@cyber/markdown'
import { registerContentRenderer } from '../content-registry'

function SwarmRenderer({ message }: ContentRendererProps) {
  if (!isSwarmContent(message.content)) return null
  const content = message.content as SwarmMessageContent
  return (
    <div className="space-y-2">
      <MarkdownContent content={content.content} />
      {content.targets && content.targets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {content.targets.map((t, i) => (
            <span key={i} className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

registerContentRenderer('swarm', {
  renderer: SwarmRenderer,
})
