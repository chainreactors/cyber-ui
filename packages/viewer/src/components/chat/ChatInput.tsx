import { useState, useRef, useEffect, useCallback, type DragEvent } from 'react'
import { FileText, Paperclip, Send, Slash, Square, Upload, X } from 'lucide-react'
import { cn } from '@aspect/theme'

export interface CommandHint {
  cmd: string
  desc: string
  usage?: string
}

export type AttachmentMode = 'context' | 'upload'

export interface ChatAttachment {
  file: File
  mode: AttachmentMode
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress?: number
}

export interface ChatInputProps {
  onSend: (content: string, attachments?: ChatAttachment[]) => void
  onPause?: () => void
  busy?: boolean
  disabled?: boolean
  placeholder?: string
  commands?: CommandHint[]
  enableAttachments?: boolean
  contextSizeLimit?: number
  className?: string
  inputClassName?: string
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  const textExts = ['.txt', '.md', '.json', '.yaml', '.yml', '.toml', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.go', '.rs', '.sh', '.bat', '.conf', '.cfg', '.ini', '.log', '.sql', '.env']
  return textExts.some((ext) => file.name.toLowerCase().endsWith(ext))
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function ChatInput({
  onSend,
  onPause,
  busy,
  disabled,
  placeholder,
  commands = [],
  enableAttachments = false,
  contextSizeLimit = 10240,
  className,
  inputClassName,
}: ChatInputProps) {
  const [draft, setDraft] = useState('')
  const [showHints, setShowHints] = useState(false)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasContent = draft.trim().length > 0 || attachments.length > 0
  const canSend = hasContent && !disabled
  const canPause = !!busy && !disabled && !!onPause

  const addFiles = useCallback((files: FileList | File[]) => {
    const newAttachments: ChatAttachment[] = Array.from(files).map((file) => ({
      file,
      mode: (isTextFile(file) && file.size <= contextSizeLimit) ? 'context' as const : 'upload' as const,
      status: 'pending' as const,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [contextSizeLimit])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const toggleMode = useCallback((index: number) => {
    setAttachments((prev) => prev.map((a, i) => i === index ? { ...a, mode: a.mode === 'context' ? 'upload' as const : 'context' as const } : a))
  }, [])

  const handleSend = useCallback(() => {
    const text = draft.trim()
    if ((!text && attachments.length === 0) || disabled) return
    onSend(text, attachments.length > 0 ? attachments : undefined)
    setDraft('')
    setAttachments([])
    setShowHints(false)
  }, [draft, attachments, disabled, onSend])

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

  function handleDragOver(e: DragEvent) {
    if (!enableAttachments) return
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (!enableAttachments || !e.dataTransfer.files.length) return
    addFiles(e.dataTransfer.files)
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (!enableAttachments) return
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter(Boolean) as File[]
    if (files.length > 0) {
      e.preventDefault()
      addFiles(files)
    }
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
    : enableAttachments
      ? 'Type a message or drop files...'
      : 'Type a message...'

  return (
    <div
      className={cn(
        'relative border-t border-border bg-card/80 backdrop-blur-sm',
        dragOver && 'ring-2 ring-primary ring-inset',
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* drag overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/5">
          <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-primary bg-card/90 px-4 py-2 text-sm font-medium text-primary">
            <Upload className="h-4 w-4" />
            Drop files to attach
          </div>
        </div>
      )}

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
        {/* attachment chips */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((a, i) => (
              <span
                key={`${a.file.name}-${i}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                  a.mode === 'context'
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-warning/30 bg-warning/5 text-warning',
                )}
              >
                <FileText className="h-3 w-3 shrink-0" />
                <span className="max-w-[120px] truncate">{a.file.name}</span>
                <span className="text-muted-foreground">{formatSize(a.file.size)}</span>
                <button
                  type="button"
                  onClick={() => toggleMode(i)}
                  className={cn(
                    'rounded px-1 py-0.5 text-[10px] font-medium transition-colors',
                    a.mode === 'context'
                      ? 'bg-primary/10 hover:bg-primary/20'
                      : 'bg-warning/10 hover:bg-warning/20',
                  )}
                  title={a.mode === 'context' ? 'Injected as context — click to upload to remote' : 'Upload to remote — click to inject as context'}
                >
                  {a.mode === 'context' ? 'CTX' : 'UP'}
                </button>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* attachment button */}
          {enableAttachments && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = '' } }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                aria-label="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
