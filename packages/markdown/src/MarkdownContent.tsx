import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@cyber/theme'
import { CodeBlock } from './CodeBlock'
import { remarkCjkAutolinkBoundary } from './remark-cjk-autolink-boundary'

export interface CodeBlockRendererProps {
  code: string
  /** The fence's language tag, absent when the block carries none. */
  language?: string
  compact: boolean
  isDark: boolean
}

interface Props {
  content: string
  compact?: boolean
  muted?: boolean
  inverted?: boolean
  isDark?: boolean
  /** Show anchor links on headings (hover to reveal) */
  headingAnchors?: boolean
  /**
   * Replace the renderer for *fenced* code blocks; inline code is untouched.
   *
   * Lets a host give a block domain treatment — an HTTP packet header, a diff,
   * a signature card — without forking the whole components map to reach the one
   * node it cares about. Absent, blocks render as the ordinary `CodeBlock`.
   */
  codeBlock?: ComponentType<CodeBlockRendererProps>
  className?: string
}

/* ---------- heading anchor helpers ---------- */

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return nodeText((node as { props?: { children?: ReactNode } }).props?.children)
  }
  return ''
}

function anchorSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z0-9#]+;/g, '')
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return (slug || 'section').slice(0, 96)
}

function uniqueAnchorSlug(value: string, slugCounts: Map<string, number>) {
  const base = anchorSlug(value)
  const count = slugCounts.get(base) || 0
  slugCounts.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

function anchoredHeading(
  Tag: HeadingTag,
  slugCounts: Map<string, number>,
  compact: boolean,
  inverted: boolean,
  muted: boolean,
) {
  const sizeClass: Record<HeadingTag, string> = {
    h1: compact ? 'text-sm mt-1.5 mb-1' : 'text-[22px] mt-5 mb-2',
    h2: compact ? 'text-sm mt-1.5 mb-1' : 'text-h2 mt-5 mb-2',
    h3: compact ? 'text-xs mt-1.5 mb-1' : 'text-h3 mt-4 mb-1.5',
    h4: compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
    h5: compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
    h6: compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
  }

  return function Heading({ children }: { children?: ReactNode }) {
    const text = nodeText(children)
    const id = uniqueAnchorSlug(text || 'section', slugCounts)

    return (
      <Tag
        id={id}
        className={cn(
          'group scroll-mt-24 font-semibold leading-tight',
          sizeClass[Tag],
          inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {children}
        <a
          href={`#${id}`}
          aria-label={`Link to ${text}`}
          className="ml-2 inline-flex align-middle text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
        >
          #
        </a>
      </Tag>
    )
  }
}

function plainHeading(
  Tag: HeadingTag,
  compact: boolean,
  inverted: boolean,
  muted: boolean,
) {
  const sizeClass: Record<HeadingTag, string> = {
    h1: compact ? 'text-sm mt-1.5 mb-1' : 'text-[22px] mt-5 mb-2',
    h2: compact ? 'text-sm mt-1.5 mb-1' : 'text-h2 mt-5 mb-2',
    h3: compact ? 'text-xs mt-1.5 mb-1' : 'text-h3 mt-4 mb-1.5',
    h4: compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
    h5: compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
    h6: compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
  }

  return ({ children }: { children?: ReactNode }) => (
    <Tag
      className={cn(
        'font-semibold leading-tight',
        sizeClass[Tag],
        inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      {children}
    </Tag>
  )
}

/* ---------- component ---------- */

export function MarkdownContent({
  content,
  compact = false,
  muted = false,
  inverted = false,
  isDark = false,
  headingAnchors = false,
  codeBlock: CodeBlockRenderer,
  className,
}: Props) {
  const headingSlugs = useMemo(() => new Map<string, number>(), [content])

  const components: Components = useMemo(() => {
    const useDarkCode = inverted || isDark
    const headings = (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).reduce(
      (acc, tag) => {
        acc[tag] = headingAnchors
          ? anchoredHeading(tag, headingSlugs, compact, inverted, muted)
          : plainHeading(tag, compact, inverted, muted)
        return acc
      },
      {} as Record<string, any>,
    )

    return {
      ...headings,
      p: ({ children }) => (
        <p className={cn(compact ? 'my-1 leading-relaxed' : 'my-3 leading-[1.65]')}>{children}</p>
      ),
      a: ({ children, href }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary no-underline hover:underline"
        >
          {children}
        </a>
      ),
      ul: ({ children }) => (
        <ul className={cn('list-disc pl-5', compact ? 'my-1' : 'my-3 space-y-1.5')}>
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className={cn('list-decimal pl-5', compact ? 'my-1' : 'my-3 space-y-1.5')}>
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className={cn(compact ? 'my-0.5' : 'my-1')}>{children}</li>
      ),
      blockquote: ({ children }) => (
        <blockquote
          className={cn(
            'border-l-2 pl-3',
            compact
              ? 'my-1.5 border-accent/45'
              : 'my-3 rounded-r-lg border-accent/35 bg-accent-soft/35 py-2 pr-3',
            inverted ? 'text-muted' : 'text-muted-foreground',
          )}
        >
          {children}
        </blockquote>
      ),
      pre: ({ children }) => (
        <div className={compact ? 'my-1.5' : 'my-4'}>{children}</div>
      ),
      code: ({ className: codeClassName, children }) => {
        const langMatch = codeClassName?.match(/language-(\w+)/)
        const codeStr = String(children).replace(/\n$/, '')
        const isBlock = Boolean(codeClassName) || codeStr.includes('\n')

        if (isBlock) {
          return CodeBlockRenderer ? (
            <CodeBlockRenderer
              code={codeStr}
              language={langMatch?.[1]}
              compact={compact}
              isDark={useDarkCode}
            />
          ) : (
            <CodeBlock
              code={codeStr}
              language={langMatch?.[1]}
              showLineNumbers={!compact}
              copyable
              isDark={useDarkCode}
            />
          )
        }

        return (
          <InlineCode inverted={inverted} compact={compact}>
            {children}
          </InlineCode>
        )
      },
      table: ({ children }) => (
        <div className={cn('overflow-x-auto rounded-lg border border-line bg-surface', compact ? 'my-1.5' : 'my-4')}>
          <table
            className={cn('w-full border-separate border-spacing-0', compact ? 'text-caption' : 'text-sm')}
          >
            {children}
          </table>
        </div>
      ),
      tr: ({ children }) => (
        <tr className="[&:last-child>td]:border-b-0">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="border-b border-line bg-surface-2 px-3 py-2 text-left font-semibold text-muted">{children}</th>
      ),
      td: ({ children }) => (
        <td className="border-b border-line px-3 py-2 align-top">{children}</td>
      ),
      hr: () => (
        <hr className={cn('border-none border-t border-line', compact ? 'my-2' : 'my-5')} />
      ),
    }
  }, [compact, inverted, isDark, muted, headingAnchors, headingSlugs, CodeBlockRenderer])

  return (
    <div
      className={cn(
        'w-full max-w-none break-words',
        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        compact ? 'text-xs leading-relaxed' : 'text-sm leading-[1.65]',
        inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkCjkAutolinkBoundary]} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}

/* ---------- inline code with click-to-copy ---------- */

/**
 * Inline code is useful as a compact token until it starts wrapping. At that
 * point a border and vertical padding are painted once per line fragment by
 * the browser, which makes a long payload look like a stack of overlapping
 * pills. Keep the threshold deliberately conservative: identifiers and short
 * paths retain the copy-chip affordance, while SQL, URLs and JSON stay part of
 * the paragraph without adding a second visual frame.
 */
const LONG_INLINE_CODE_LENGTH = 48

function InlineCode({
  children,
  inverted,
  compact,
}: {
  children: ReactNode
  inverted: boolean
  compact: boolean
}) {
  const [copied, setCopied] = useState(false)
  const text = typeof children === 'string' ? children : nodeText(children)
  const isLong = text.length >= LONG_INLINE_CODE_LENGTH

  const handleClick = () => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <code
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      title={copied ? 'Copied!' : 'Click to copy'}
      data-inline-code={isLong ? 'long' : undefined}
      className={cn(
        'font-mono transition-colors align-baseline',
        isLong ? 'cursor-copy' : 'cursor-pointer',
        compact ? 'text-caption' : 'text-xs',
        isLong
          ? 'text-[0.92em] leading-[inherit] [overflow-wrap:anywhere]'
          : 'rounded border px-1.5 py-0.5 break-words text-[0.92em]',
        copied
          ? isLong
            ? 'text-ok'
            : 'border-ok bg-ok-soft text-ok'
          : isLong
            ? inverted
              ? 'text-background'
              : 'text-accent-fg'
            : inverted
              ? 'border-background/20 bg-background/20 text-background hover:bg-background/30'
              : 'border-line bg-surface-2 text-accent-fg hover:bg-surface-2/60',
      )}
    >
      {children}
    </code>
  )
}
