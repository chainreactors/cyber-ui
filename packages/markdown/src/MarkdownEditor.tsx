import { Fragment, useId, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { Bold, ChevronDown, Code2, Eye, Heading2, Italic, Link, List, ListOrdered, Pencil, Quote, Type } from 'lucide-react'
import { cn } from '@cyber/theme'
import { MarkdownContent } from './MarkdownContent'

interface Props extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'style'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  textareaClassName?: string
  labels?: Partial<typeof defaultLabels>
  /** Keep formatting available without giving it a permanent row of buttons. */
  toolbar?: 'always' | 'collapsible'
  /** Host-supplied attachments or actions, kept inside the editor in both modes. */
  footer?: ReactNode
}

type FormatAction = 'heading' | 'bold' | 'italic' | 'quote' | 'list' | 'ordered' | 'code' | 'link'

const defaultLabels = {
  heading: 'Heading', bold: 'Bold', italic: 'Italic', quote: 'Quote',
  list: 'List', ordered: 'Numbered list', code: 'Code', link: 'Link',
  edit: 'Edit', preview: 'Preview', empty: 'Nothing to preview yet.',
  emptyHint: 'Write something, then preview its formatting here.',
  text: 'text', item: 'item',
  format: 'Formatting', syntax: 'Markdown supported',
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = '180px',
  disabled = false,
  compact = false,
  className,
  textareaClassName,
  labels: labelOverrides,
  toolbar = 'always',
  footer,
  ...textareaProps
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const toolsId = useId()
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [formattingOpen, setFormattingOpen] = useState(false)
  const labels = { ...defaultLabels, ...labelOverrides }
  const showFormatting = toolbar === 'always' || (formattingOpen && mode === 'edit')

  const format = (action: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea || disabled || textareaProps.readOnly) return
    let start = textarea.selectionStart
    let end = textarea.selectionEnd
    // Block formatting applies to whole lines, including a caret within a line.
    if (['heading', 'quote', 'list', 'ordered'].includes(action)) {
      start = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
      if (end > start && value[end - 1] === '\n') end -= 1
      const lineEnd = value.indexOf('\n', end)
      end = lineEnd === -1 ? value.length : lineEnd
    }
    const selected = value.slice(start, end)
    const replacement = formatSelection(action, selected, labels)
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`)
    window.requestAnimationFrame(() => {
      if (textarea.isConnected) {
        textarea.focus()
        textarea.setSelectionRange(start, start + replacement.length)
      }
    })
  }

  const formatTools = (
    <div id={toolsId} data-editor-part="format-tools" role="group" aria-label={labels.format} className="flex flex-wrap items-center gap-0.5">
      {([
        ['heading', Heading2], ['bold', Bold], ['italic', Italic], ['quote', Quote],
        ['list', List], ['ordered', ListOrdered], ['code', Code2], ['link', Link],
      ] as const).map(([action, Icon]) => (
        <Fragment key={action}>
          {(action === 'quote' || action === 'code') && <span data-editor-part="tool-divider" aria-hidden="true" className="mx-1 h-4 w-px bg-border" />}
          <ToolButton title={labels[action]} disabled={disabled || textareaProps.readOnly || mode !== 'edit'} onClick={() => format(action)}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></ToolButton>
        </Fragment>
      ))}
    </div>
  )

  return (
    <div data-editor-mode={mode} data-invalid={textareaProps['aria-invalid']} className={cn('relative overflow-hidden rounded-lg border border-border bg-card focus-within:ring-2 focus-within:ring-ring/30', className)}>
      <div data-editor-part="header" className="flex min-h-8 flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-2 py-1">
        {toolbar === 'always' ? formatTools : (
          <div data-editor-part="format-control" className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              data-editor-part="format-toggle"
              aria-expanded={showFormatting}
              aria-controls={toolsId}
              disabled={disabled || textareaProps.readOnly || mode !== 'edit'}
              onClick={() => setFormattingOpen(open => !open)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Type className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{labels.format}</span>
              <ChevronDown className={cn('h-3 w-3 transition-transform', showFormatting && 'rotate-180')} aria-hidden="true" />
            </button>
            <span data-editor-part="syntax" className="text-xs text-muted-foreground">{labels.syntax}</span>
          </div>
        )}
        <div data-editor-part="modes" className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-border bg-background p-0.5">
          <ModeButton active={mode === 'edit'} onClick={() => {
            setMode('edit')
            requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }))
          }} title={labels.edit}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /></ModeButton>
          <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} title={labels.preview}><Eye className="h-3.5 w-3.5" aria-hidden="true" /></ModeButton>
        </div>
      </div>
      {toolbar === 'collapsible' && (
        <div data-editor-part="format-panel" hidden={!showFormatting} className="border-b border-border px-2 py-1">
          {formatTools}
        </div>
      )}
      <textarea
        {...textareaProps}
        data-editor-part="input"
        ref={textareaRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        onFocus={event => {
          // Keep the same native input mounted: label clicks and validation
          // can return to editing, and preview never loses form values.
          setMode('edit')
          textareaProps.onFocus?.(event)
        }}
        onKeyDown={event => {
          textareaProps.onKeyDown?.(event)
          if (event.defaultPrevented || event.nativeEvent.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)) return
          const key = event.key.toLowerCase()
          if (key === 'b' || key === 'i') {
            event.preventDefault()
            format(key === 'b' ? 'bold' : 'italic')
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-hidden={mode === 'preview' ? true : textareaProps['aria-hidden']}
        tabIndex={mode === 'preview' ? -1 : textareaProps.tabIndex}
        className={cn(
          'block w-full resize-y rounded-none border-0 bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:ring-0',
          compact && 'text-xs',
          textareaClassName,
          mode === 'preview' && 'sr-only',
        )}
        style={mode === 'edit' ? { minHeight } : undefined}
      />
      {mode === 'preview' && (
        <div data-editor-part="preview" role="region" tabIndex={0} aria-label={labels.preview} className="max-h-96 overflow-auto bg-background px-4 py-3 text-sm [overflow-wrap:anywhere]" style={{ minHeight }}>
          {value.trim() ? <MarkdownContent content={value} compact={compact} /> : (
            <div data-editor-part="empty-preview" className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <Eye size={24} strokeWidth={1.5} aria-hidden="true" />
              <p className="font-medium">{labels.empty}</p>
              <span className="text-xs">{labels.emptyHint}</span>
            </div>
          )}
        </div>
      )}
      {footer && <div data-editor-part="footer" className="border-t border-border px-3 py-2">{footer}</div>}
    </div>
  )
}

function ToolButton({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-secondary hover:text-foreground',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function ModeButton({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-6 items-center justify-center gap-1 rounded px-2 text-xs text-muted-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
        active && 'bg-primary text-primary-foreground',
      )}
    >
      {children}
      <span>{title}</span>
    </button>
  )
}

function formatSelection(action: FormatAction, selected: string, labels: typeof defaultLabels): string {
  const text = selected || (action === 'ordered' || action === 'list' ? labels.item : labels.text)
  if (action === 'heading') return prefixLines(text, '## ')
  if (action === 'quote') return prefixLines(text, '> ')
  if (action === 'list') return prefixLines(text, '- ')
  if (action === 'ordered') return text.split(/\r?\n/).map((line, index) => `${index + 1}. ${line || labels.item}`).join('\n')
  if (action === 'bold') return `**${text}**`
  if (action === 'italic') return `*${text}*`
  if (action === 'code') return text.includes('\n') ? `\`\`\`\n${text}\n\`\`\`` : `\`${text}\``
  return `[${text}](url)`
}

function prefixLines(value: string, prefix: string): string {
  return value.split(/\r?\n/).map(line => `${prefix}${line}`).join('\n')
}
