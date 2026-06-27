import { useRef, useState, type ReactNode } from 'react'
import { Bold, Code2, Eye, Heading2, Italic, Link, List, ListOrdered, Pencil, Quote } from 'lucide-react'
import { cn } from '@aspect/theme'
import { MarkdownContent } from './MarkdownContent'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  textareaClassName?: string
}

type FormatAction = 'heading' | 'bold' | 'italic' | 'quote' | 'list' | 'ordered' | 'code' | 'link'

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  minHeight = '180px',
  disabled = false,
  compact = false,
  className,
  textareaClassName,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  const format = (action: FormatAction) => {
    const textarea = textareaRef.current
    if (!textarea || disabled) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)
    const replacement = formatSelection(action, selected)
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`)
    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + replacement.length)
    })
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card', className)}>
      <div className="flex min-h-8 items-center justify-between gap-2 border-b border-border bg-muted/25 px-2 py-1">
        <div className="flex items-center gap-0.5">
          <ToolButton title="Heading" disabled={disabled || mode !== 'edit'} onClick={() => format('heading')}><Heading2 className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="Bold" disabled={disabled || mode !== 'edit'} onClick={() => format('bold')}><Bold className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="Italic" disabled={disabled || mode !== 'edit'} onClick={() => format('italic')}><Italic className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="Quote" disabled={disabled || mode !== 'edit'} onClick={() => format('quote')}><Quote className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="List" disabled={disabled || mode !== 'edit'} onClick={() => format('list')}><List className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="Numbered list" disabled={disabled || mode !== 'edit'} onClick={() => format('ordered')}><ListOrdered className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="Code" disabled={disabled || mode !== 'edit'} onClick={() => format('code')}><Code2 className="h-3.5 w-3.5" /></ToolButton>
          <ToolButton title="Link" disabled={disabled || mode !== 'edit'} onClick={() => format('link')}><Link className="h-3.5 w-3.5" /></ToolButton>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
          <ModeButton active={mode === 'edit'} onClick={() => setMode('edit')} title="Edit"><Pencil className="h-3.5 w-3.5" /></ModeButton>
          <ModeButton active={mode === 'preview'} onClick={() => setMode('preview')} title="Preview"><Eye className="h-3.5 w-3.5" /></ModeButton>
        </div>
      </div>
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full resize-y rounded-none border-0 bg-background px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:ring-0',
            compact && 'text-xs',
            textareaClassName,
          )}
          style={{ minHeight }}
        />
      ) : (
        <div className="overflow-auto bg-background px-4 py-3 text-sm" style={{ minHeight }}>
          <MarkdownContent content={value || placeholder || 'No content.'} compact={compact} />
        </div>
      )}
    </div>
  )
}

function ToolButton({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
      title={title}
      disabled={disabled}
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
      onClick={onClick}
      className={cn(
        'inline-flex h-6 w-7 items-center justify-center rounded text-muted-foreground transition-colors',
        active && 'bg-primary text-primary-foreground',
      )}
    >
      {children}
    </button>
  )
}

function formatSelection(action: FormatAction, selected: string): string {
  const text = selected || placeholderForAction(action)
  if (action === 'heading') return prefixLines(text, '## ')
  if (action === 'quote') return prefixLines(text, '> ')
  if (action === 'list') return prefixLines(text, '- ')
  if (action === 'ordered') return text.split(/\r?\n/).map((line, index) => `${index + 1}. ${line || 'item'}`).join('\n')
  if (action === 'bold') return `**${text}**`
  if (action === 'italic') return `*${text}*`
  if (action === 'code') return text.includes('\n') ? `\`\`\`\n${text}\n\`\`\`` : `\`${text}\``
  return `[${text}](url)`
}

function prefixLines(value: string, prefix: string): string {
  return value.split(/\r?\n/).map(line => `${prefix}${line || 'text'}`).join('\n')
}

function placeholderForAction(action: FormatAction): string {
  if (action === 'link') return 'text'
  if (action === 'ordered' || action === 'list') return 'item'
  return 'text'
}
