import { useEffect, useState, type CSSProperties } from 'react'
import { Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@cyber/theme'

/* -------------------------------------------------- */

export interface CodeBlockProps {
  code: string
  language?: string
  showLineNumbers?: boolean
  maxHeight?: number
  copyable?: boolean
  /** Explicit override; when omitted, follow the host document's theme markers. */
  isDark?: boolean
  className?: string
}

const hlCustomStyle: CSSProperties = {
  margin: 0,
  padding: '0.75rem',
  fontSize: '0.75rem',
  background: 'transparent',
  borderRadius: 0,
}

const lineNumStyle: CSSProperties = {
  fontSize: '0.65rem',
  minWidth: '2em',
  opacity: 0.5,
}

function hostIsDark(root: HTMLElement): boolean {
  // Cairn stamps `data-theme` before the app mounts and adds `.dark` from its
  // provider. Read both so a code block never paints the light highlighter in
  // the gap between those two writes (and so embedded hosts may use either
  // convention).
  return root.classList.contains('dark') || root.dataset.theme === 'dark'
}

function useHostDarkTheme(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && hostIsDark(document.documentElement),
  )

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(hostIsDark(root))
    sync()
    if (typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] })
    return () => observer.disconnect()
  }, [])

  return dark
}

export function CodeBlock({
  code,
  language,
  showLineNumbers = false,
  maxHeight,
  copyable = false,
  isDark: isDarkProp,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const hostDark = useHostDarkTheme()
  const isDark = isDarkProp ?? hostDark
  const trimmed = code.replace(/\n$/, '')

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trimmed)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wrapClass = cn(
    isDark
      ? 'group relative overflow-hidden rounded-lg border border-line bg-card'
      : 'group relative overflow-hidden rounded-lg border border-line bg-surface-2/80',
    className,
  )

  const scrollStyle: CSSProperties | undefined = maxHeight ? { maxHeight } : undefined

  return (
    <div className={wrapClass}>
      {/* copy button */}
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded border border-line bg-surface text-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        </button>
      )}

      <div className="overflow-auto" style={scrollStyle}>
        {language ? (
          <SyntaxHighlighter
            language={language}
            style={isDark ? oneDark : oneLight}
            PreTag="div"
            customStyle={hlCustomStyle}
            showLineNumbers={showLineNumbers}
            lineNumberStyle={lineNumStyle}
          >
            {trimmed}
          </SyntaxHighlighter>
        ) : (
          <pre className={cn('p-3 font-mono text-xs leading-relaxed', 'text-fg')}>
            {trimmed}
          </pre>
        )}
      </div>
    </div>
  )
}
