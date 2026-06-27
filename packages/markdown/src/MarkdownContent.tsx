import { useMemo, type ComponentType } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@aspect/theme'

interface Props {
  content: string
  compact?: boolean
  muted?: boolean
  inverted?: boolean
  className?: string
}

/* ---------- optional syntax highlighting ---------- */

let SyntaxHighlighter: ComponentType<any> | null = null
let hlStyles: { dark?: Record<string, any>; light?: Record<string, any> } = {}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SyntaxHighlighter = require('react-syntax-highlighter').Prism
  hlStyles = {
    dark: require('react-syntax-highlighter/dist/esm/styles/prism').oneDark,
    light: require('react-syntax-highlighter/dist/esm/styles/prism').oneLight,
  }
} catch {
  // react-syntax-highlighter is an optional peer dependency
}

/* -------------------------------------------------- */

export function MarkdownContent({
  content,
  compact = false,
  muted = false,
  inverted = false,
  className,
}: Props) {
  const components: Components = useMemo(
    () => ({
      h1: ({ children }) => (
        <h1
          className={cn(
            'font-semibold leading-tight',
            compact ? 'text-sm mt-1.5 mb-1' : 'text-[22px] mt-5 mb-2',
            inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2
          className={cn(
            'font-semibold leading-tight',
            compact ? 'text-sm mt-1.5 mb-1' : 'text-h2 mt-5 mb-2',
            inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3
          className={cn(
            'font-semibold leading-tight',
            compact ? 'text-xs mt-1.5 mb-1' : 'text-h3 mt-4 mb-1.5',
            inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4
          className={cn(
            'font-semibold leading-tight',
            compact ? 'text-xs mt-1.5 mb-1' : 'text-h4 mt-4 mb-1.5',
            inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {children}
        </h4>
      ),
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
            'border-l-[3px] pl-2.5',
            compact
              ? 'my-1.5 border-primary'
              : 'my-3 rounded-r-md border-border bg-muted/30 py-1.5 pr-3',
            inverted ? 'text-muted' : 'text-muted-foreground',
          )}
        >
          {children}
        </blockquote>
      ),
      pre: ({ children }) => (
        <pre
          className={cn(
            'overflow-x-auto rounded-md border border-border leading-relaxed',
            compact ? 'my-1.5 bg-input p-2' : 'my-4 bg-muted/40 p-3',
          )}
        >
          {children}
        </pre>
      ),
      code: ({ className: codeClassName, children }) => {
        const langMatch = codeClassName?.match(/language-(\w+)/)
        const isBlock = Boolean(codeClassName)

        if (isBlock && SyntaxHighlighter && langMatch) {
          const lang = langMatch[1]
          const codeStr = String(children).replace(/\n$/, '')
          return (
            <SyntaxHighlighter
              language={lang}
              style={hlStyles.dark}
              customStyle={{
                margin: 0,
                padding: 0,
                fontSize: 'inherit',
                background: 'transparent',
                borderRadius: 0,
              }}
            >
              {codeStr}
            </SyntaxHighlighter>
          )
        }

        return (
          <code
            className={cn(
              'font-mono',
              compact ? 'text-caption' : 'text-xs',
              isBlock
                ? cn(
                    'bg-transparent whitespace-pre',
                    inverted ? 'text-background' : 'text-foreground',
                  )
                : cn(
                    'rounded px-1 py-px break-words',
                    inverted
                      ? 'bg-background/20 text-background'
                      : 'bg-muted text-foreground',
                  ),
            )}
          >
            {children}
          </code>
        )
      },
      table: ({ children }) => (
        <div className={cn('overflow-x-auto', compact ? 'my-1.5' : 'my-4')}>
          <table
            className={cn('w-full border-collapse', compact ? 'text-caption' : 'text-sm')}
          >
            {children}
          </table>
        </div>
      ),
      th: ({ children }) => (
        <th className="border border-border bg-muted px-2 py-1.5 text-left">{children}</th>
      ),
      td: ({ children }) => (
        <td className="border border-border px-2 py-1.5 align-top">{children}</td>
      ),
      hr: () => (
        <hr className={cn('border-none border-t border-border', compact ? 'my-2' : 'my-5')} />
      ),
    }),
    [compact, inverted, muted],
  )

  return (
    <div
      className={cn(
        'break-words',
        compact ? 'text-xs leading-relaxed' : 'text-sm leading-[1.65]',
        inverted ? 'text-background' : muted ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content || ''}
      </ReactMarkdown>
    </div>
  )
}
