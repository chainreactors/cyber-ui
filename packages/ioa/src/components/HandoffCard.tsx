import { MarkdownContent } from '@aspect/markdown'

export interface HandoffCardProps {
  title?: string
  message: unknown
}

export function HandoffCard({ title, message }: HandoffCardProps) {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!title && !text) return null

  return (
    <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5">
      {title && (
        <div className={text ? 'border-b border-indigo-500/15 px-3 py-2' : 'px-3 py-2'}>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
      )}
      {text && (
        <div className="px-3 py-2.5">
          <MarkdownContent content={text} />
        </div>
      )}
    </div>
  )
}
