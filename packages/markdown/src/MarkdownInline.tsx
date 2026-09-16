import { memo, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkCjkAutolinkBoundary } from './remark-cjk-autolink-boundary'

/** Flatten block structure into a label without losing inline formatting.
 * Labels often sit inside buttons, so links, copy controls, images and task
 * checkboxes must not create nested controls or fetch external resources. */
function InlineBlock({ children }: { children?: ReactNode }) {
  return <>{children}{' '}</>
}

const components: Components = {
  p: InlineBlock,
  h1: InlineBlock,
  h2: InlineBlock,
  h3: InlineBlock,
  h4: InlineBlock,
  h5: InlineBlock,
  h6: InlineBlock,
  blockquote: InlineBlock,
  pre: InlineBlock,
  ul: InlineBlock,
  ol: InlineBlock,
  li: InlineBlock,
  table: InlineBlock,
  thead: InlineBlock,
  tbody: InlineBlock,
  tr: InlineBlock,
  th: InlineBlock,
  td: InlineBlock,
  a: ({ children }) => <span className="text-accent-fg">{children}</span>,
  code: ({ children }) => (
    <code className="rounded border border-line bg-surface-2 px-1 font-mono text-[0.92em] text-accent-fg">
      {children}
    </code>
  ),
  img: ({ alt }) => <>{alt}</>,
  input: ({ checked }) => <>{checked ? '☑ ' : '☐ '}</>,
  br: () => <> </>,
  hr: () => <> · </>,
}

const allowedElements = [
  ...Object.keys(components), 'strong', 'em', 'del', 'sup', 'sub',
]
const remarkPlugins = [remarkGfm, remarkCjkAutolinkBoundary]

export const MarkdownInline = memo(function MarkdownInline({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={components}
        allowedElements={allowedElements}
        unwrapDisallowed
        skipHtml
      >
        {content}
      </ReactMarkdown>
    </span>
  )
})
