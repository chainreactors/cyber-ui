import { CodeBlock, MarkdownContent } from '@cyber/markdown'
import { Badge } from '@cyber/ui'
import { stringify as stringifyYaml } from 'yaml'

export interface MessageContentProps {
  content: unknown
  meta?: Record<string, unknown>
  showFrontMatter?: boolean
  showType?: boolean
}

export interface MessageFrontMatterProps {
  content: unknown
  meta?: Record<string, unknown>
  className?: string
}

export interface MessageContentParts {
  markdown: string
  metadata: Record<string, unknown>
  type?: string
}

const PRESENTATION_KEYS = new Set(['title', 'type'])

export function splitMessageContent(
  content: unknown,
  meta?: Record<string, unknown>,
): MessageContentParts {
  if (typeof content === 'string') {
    return { markdown: content, metadata: compactMetadata(meta) }
  }
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return {
      markdown: '',
      metadata: compactMetadata({ ...meta, content }),
    }
  }

  const record = content as Record<string, unknown>
  const contentValue = record.content
  const markdown = typeof contentValue === 'string' ? contentValue : ''
  const metadata = {
    ...compactMetadata(meta),
    ...Object.fromEntries(
      Object.entries(record).filter(([key, value]) => {
        if (PRESENTATION_KEYS.has(key) || value == null || value === '') return false
        return key !== 'content' || typeof value !== 'string'
      }),
    ),
  }
  const type = typeof record.type === 'string' ? record.type : undefined

  return { markdown, metadata, type }
}

export function MessageFrontMatter({ content, meta, className }: MessageFrontMatterProps) {
  const frontMatter = formatFrontMatter(splitMessageContent(content, meta).metadata)
  if (!frontMatter) return null

  return <FrontMatterBlock value={frontMatter} className={className} />
}

export function MessageContent({
  content,
  meta,
  showFrontMatter = true,
  showType = true,
}: MessageContentProps) {
  const { markdown, metadata, type } = splitMessageContent(content, meta)
  const frontMatter = showFrontMatter ? formatFrontMatter(metadata) : ''

  return (
    <div className="space-y-2">
      {showType && type && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-md px-1.5 py-px text-[10px]">
            {type}
          </Badge>
        </div>
      )}
      {frontMatter && <FrontMatterBlock value={frontMatter} />}
      {markdown && <MarkdownContent content={markdown} />}
      {!markdown && !frontMatter && <span className="text-sm text-muted-foreground">Empty message</span>}
    </div>
  )
}

function FrontMatterBlock({ value, className }: { value: string; className?: string }) {
  return (
    <div aria-label="YAML front matter" className={className}>
      <CodeBlock
        code={value}
        language="yaml"
        compact
        copyable
        className="rounded-md"
      />
    </div>
  )
}

function compactMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {}
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value != null && value !== ''),
  )
}

function formatFrontMatter(metadata: Record<string, unknown>) {
  if (Object.keys(metadata).length === 0) return ''
  const yaml = stringifyYaml(metadata, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---`
}
