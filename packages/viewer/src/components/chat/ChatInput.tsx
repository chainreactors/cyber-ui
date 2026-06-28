import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Slash, Square } from 'lucide-react'
import { cn } from '@aspect/theme'

export interface CommandHint {
  cmd: string
  desc: string
  usage?: string
}

export interface ChatInputProps {
  onSend: (content: string) => void
  onPause?: () => void
  busy?: boolean
  disabled?: boolean
  placeholder?: string
  commands?: CommandHint[]
  className?: string
  inputClassName?: string
}

export default function ChatInput({
  onSend,
  onPause,
  busy,
  disabled,
  placeholder,
  commands = [],
  className,
  inputClassName,
}: ChatInputProps) {
  const [draft, setDraft] = useState('')
  const [showHints, setShowHints] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = draft.trim().length > 0 && !disabled
  const canPause = !!busy && !disabled && !!onPause

  const handleSend = useCallback(() => {
    const text = draft.trim()
    if (!text || disabled) return
    onSend(text)
    setDraft('')
    setShowHints(false)
  }, [draft, disabled, onSend])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowHints(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setDraft(value)
    if (commands.length > 0) {
      setShowHints(value === '/' || (value.startsWith('/') && !value.includes(' ')))
    }
  }

  function insertCommand(cmd: string) {
    setDraft(cmd + ' ')
    setShowHints(false)
    textareaRef.current?.focus()
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [draft])

  const matchingCommands = draft.startsWith('/')
    ? commands.filter((c) => c.cmd.startsWith(draft.split(' ')[0]))
    : commands

  const hasCommands = commands.length > 0
  const defaultPlaceholder = hasCommands
    ? 'Type a message... (/ for commands)'
    : 'Type a message...'

  return (
    <div className={cn('relative border-t border-border bg-card/80 backdrop-blur-sm', className)}>
      {/* command hints popup */}
      {showHints && matchingCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 border-t border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="px-4 py-1.5">
            {matchingCommands.map((c) => (
              <button
                key={c.cmd}
                type="button"
                onClick={() => insertCommand(c.cmd)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
              >
                <Slash className="h-3 w-3 shrink-0 text-primary" />
                <span className="font-mono font-medium text-foreground">{c.cmd}</span>
                <span className="text-muted-foreground">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (draft === '/' && hasCommands) setShowHints(true) }}
            onBlur={() => setTimeout(() => setShowHints(false), 150)}
            disabled={disabled}
            placeholder={placeholder || defaultPlaceholder}
            className={cn(
              'flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-shadow duration-150',
              inputClassName,
            )}
          />
          <button
            type="button"
            onClick={canPause ? onPause : handleSend}
            disabled={canPause ? false : !canSend}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
              'disabled:opacity-50',
              canPause
                ? 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground',
              !canPause && canSend && 'shadow-sm hover:bg-primary/90',
            )}
            aria-label={canPause ? 'Pause response' : 'Send message'}
          >
            {canPause ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
