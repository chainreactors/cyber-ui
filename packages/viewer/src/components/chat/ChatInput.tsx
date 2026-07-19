import { useState, useRef, useEffect, useCallback, type DragEvent, type ReactNode } from 'react'
import { AtSign, FileText, Paperclip, Send, Slash, Square, Upload, X } from 'lucide-react'
import { cn } from '@cyber/theme'
function formatBytes(bytes: number): string { if (bytes < 1024) return bytes + "B"; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB"; return (bytes / 1048576).toFixed(1) + "MB" }

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

// One entry the composer can @-mention. Sourced from the app's asset pool but
// kept structurally decoupled — the viewer kit never imports PoolAsset.
export interface Mentionable {
  target: string
  label?: string
  source?: string
}

export interface MentionPopupApi {
  query: string
  onSelect: (targets: string[]) => void
  onDismiss: () => void
}

export interface ChatInputProps {
  onSend: (content: string, attachments?: ChatAttachment[]) => void
  onPause?: () => void
  busy?: boolean
  disabled?: boolean
  placeholder?: string
  commands?: CommandHint[]
  mentionables?: Mentionable[]
  // Replace the default @-mention dropdown with a custom renderer (e.g. a
  // CSTXTable picker that supports multi-select). When provided, the built-in
  // simple list is skipped entirely.
  renderMentionPopup?: (api: MentionPopupApi) => ReactNode
  // Append-and-focus signal: bump `nonce` (with the text to insert) to push
  // text into the composer from outside — e.g. an asset-pool "reference" click.
  injectText?: { text: string; nonce: number }
  enableAttachments?: boolean
  contextSizeLimit?: number
  leading?: ReactNode
  // Expandable content rendered *inside* the composer well, above the input row
  // (e.g. the host's Goal / eval config) — so it shares the one lifted surface
  // instead of floating as a separate card stacked above the composer.
  topSlot?: ReactNode
  className?: string
  inputClassName?: string
}

function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  const textExts = ['.txt', '.md', '.json', '.yaml', '.yml', '.toml', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.go', '.rs', '.sh', '.bat', '.conf', '.cfg', '.ini', '.log', '.sql', '.env']
  return textExts.some((ext) => file.name.toLowerCase().endsWith(ext))
}

// The asset token being typed under the caret, if any. The '@' must sit at the
// start or right after whitespace (so it never fires inside an email like
// user@host), and any whitespace closes the token. Returns the '@' index plus
// the query fragment after it, so the popup can filter and insertMention can
// splice the replacement in place (mentions can be mid-message and repeated).
function mentionAt(value: string, caret: number): { start: number; query: string } | null {
  const upto = value.slice(0, caret)
  const at = upto.lastIndexOf('@')
  if (at < 0) return null
  const before = at === 0 ? '' : upto[at - 1]
  if (before && !/\s/.test(before)) return null
  const frag = upto.slice(at + 1)
  if (/\s/.test(frag)) return null
  return { start: at, query: frag }
}

export default function ChatInput({
  onSend,
  onPause,
  busy,
  disabled,
  placeholder,
  commands = [],
  mentionables = [],
  renderMentionPopup,
  injectText,
  enableAttachments = false,
  contextSizeLimit = 10240,
  leading,
  topSlot,
  className,
  inputClassName,
}: ChatInputProps) {
  const [draft, setDraft] = useState('')
  const [showHints, setShowHints] = useState(false)
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Guards the injectText effect: only fire when the nonce actually advances,
  // so a StrictMode double-invoke or an unrelated re-render can't re-append.
  const lastInjectRef = useRef(0)

  const hasContent = draft.trim().length > 0 || attachments.length > 0
  const canSend = hasContent && !disabled
  const canPause = !!busy && !disabled && !!onPause
  const matchingMentions = mention && mentionables.length > 0
    ? mentionables.filter((m) => m.target.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 8)
    : []

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
    setMention(null)
  }, [draft, attachments, disabled, onSend])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // The mention popup claims Enter first, so a half-typed "@frag" resolves to
    // an asset instead of being sent as literal text.
    if (mention && matchingMentions.length > 0 && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      insertMention(matchingMentions[0].target)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowHints(false)
      setMention(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setDraft(value)
    if (commands.length > 0) {
      setShowHints(value === '/' || (value.startsWith('/') && !value.includes(' ')))
    }
    const caret = e.target.selectionStart ?? value.length
    setMention(mentionables.length > 0 ? mentionAt(value, caret) : null)
  }

  // Re-evaluate the mention token when the caret moves without a text change
  // (arrow keys, or clicking into an existing @token).
  function handleSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    if (mentionables.length === 0) return
    const el = e.currentTarget
    const caret = el.selectionStart ?? el.value.length
    setMention(mentionAt(el.value, caret))
  }

  function insertCommand(cmd: string) {
    setDraft(cmd + ' ')
    setShowHints(false)
    textareaRef.current?.focus()
  }

  // Splice the asset in place of the "@frag" under the caret (mentions can be
  // mid-message), leaving the caret right after the inserted "@target ".
  function insertMention(target: string) {
    insertMentions([target])
  }

  function insertMentions(targets: string[]) {
    if (targets.length === 0) return
    const el = textareaRef.current
    const caret = el?.selectionStart ?? draft.length
    const start = mention ? mention.start : caret
    const token = targets.map((t) => `@${t}`).join(' ') + ' '
    const next = draft.slice(0, start) + token + draft.slice(caret)
    setDraft(next)
    setMention(null)
    const pos = start + token.length
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos) })
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
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [draft])

  // Text pushed in from outside (e.g. an asset-pool "reference" click): append
  // it, focus, and drop the caret at the end. nonce-guarded so it lands exactly
  // once per bump and never clobbers what the user is mid-typing.
  useEffect(() => {
    if (!injectText || injectText.nonce === lastInjectRef.current) return
    lastInjectRef.current = injectText.nonce
    setDraft((prev) => (prev && !/\s$/.test(prev) ? prev + ' ' + injectText.text : prev + injectText.text))
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
    })
  }, [injectText])

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
      {showHints && !mention && matchingCommands.length > 0 && (
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

      {/* @-mention popup — custom renderer or built-in simple list */}
      {mention && renderMentionPopup && (
        <div className="absolute bottom-full left-0 right-0 border-t border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
          {renderMentionPopup({
            query: mention.query,
            onSelect: insertMentions,
            onDismiss: () => setMention(null),
          })}
        </div>
      )}
      {mention && !renderMentionPopup && matchingMentions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 border-t border-border bg-card shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="max-h-52 overflow-y-auto px-4 py-1.5">
            {matchingMentions.map((m) => (
              <button
                key={m.target}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(m.target) }}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
              >
                <AtSign className="h-3 w-3 shrink-0 text-ai" />
                <span className="min-w-0 flex-1 truncate font-mono font-medium text-foreground">{m.target}</span>
                {m.source && <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">{m.source}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-3 py-2 md:px-4 md:py-3">
        {topSlot && (
          <div className="mb-2 overflow-hidden rounded-lg border border-border/60 bg-card/60 animate-in fade-in slide-in-from-bottom-1 duration-200">
            {topSlot}
          </div>
        )}

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
                <span className="text-muted-foreground">{formatBytes(a.file.size)}</span>
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

        <div className="flex items-end gap-2 rounded-lg border border-border/70 bg-card/40 p-1 transition-shadow duration-150 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20">
          {leading && <div className="shrink-0">{leading}</div>}

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
            onSelect={handleSelect}
            onFocus={() => { if (draft === '/' && hasCommands) setShowHints(true) }}
            onBlur={() => setTimeout(() => setShowHints(false), 150)}
            disabled={disabled}
            placeholder={placeholder || defaultPlaceholder}
            className={cn(
              'min-h-9 max-h-[120px] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-5 text-foreground',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              inputClassName,
            )}
          />

          <button
            type="button"
            onClick={canPause ? onPause : handleSend}
            disabled={canPause ? false : !canSend}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-50',
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
