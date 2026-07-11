import { Badge } from '@cyber/ui'
import { MarkdownContent } from '@cyber/markdown'
import { contentBody, messageTitle } from './forum-utils'

export interface MessageContentProps {
  content: unknown
  meta?: Record<string, unknown>
}

const BODY_KEYS = ['content', 'text', 'message', 'feedback', 'body', 'description']
const SKIP_KEYS = new Set(['type', ...BODY_KEYS, 'title'])

export function MessageContent({ content, meta }: MessageContentProps) {
  const record = content && typeof content === 'object' && !Array.isArray(content)
    ? content as Record<string, unknown>
    : null
  const contentType = record?.type as string | undefined
  const title = messageTitle(content)
  const body = contentBody(content)

  const metaKind = meta?.kind as string | undefined
  const metaLabels = Array.isArray(meta?.labels) ? (meta.labels as string[]) : []

  const extraFields = record
    ? Object.entries(record).filter(([key, value]) => !SKIP_KEYS.has(key) && value != null && value !== '')
    : []

  const hasTags = Boolean(contentType || metaKind || metaLabels.length > 0)
  const hasBody = Boolean(body && body !== title)

  return (
    <div className="space-y-2">
      {hasTags && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {contentType && (
            <Badge variant="outline" className="rounded-md px-1.5 py-px text-[10px]">
              {contentType}
            </Badge>
          )}
          {metaKind && (
            <Badge variant="secondary" className="rounded-md px-1.5 py-px text-[10px]">
              {metaKind}
            </Badge>
          )}
          {metaLabels.map(label => (
            <Badge key={label} variant="secondary" className="rounded-md px-1.5 py-px text-[10px]">
              {label}
            </Badge>
          ))}
        </div>
      )}
      {hasBody && <MarkdownContent content={body} />}
      {!hasBody && !record && <span className="text-sm text-muted-foreground">Empty message</span>}
      {extraFields.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
          {extraFields.map(([key, value]) => (
            <div key={key} className="flex gap-2 text-xs leading-relaxed">
              <span className="shrink-0 font-medium text-muted-foreground">{key}:</span>
              <span className="min-w-0 break-words text-foreground">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
