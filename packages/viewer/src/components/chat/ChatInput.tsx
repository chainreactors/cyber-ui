import { useState, useRef, useEffect, useCallback, useId, type DragEvent, type ReactNode } from 'react'
import { AtSign, CircleHelp, FileText, Keyboard, Paperclip, Send, Slash, Square, Upload, Wrench, X } from 'lucide-react'
import { cn } from '@cyber/theme'
import { Tooltip, TooltipContent, TooltipTrigger } from '@cyber/ui'
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
  navigation?: PopupNavigationCommand
  // Present when the host composer accepts file attachments. A categorized
  // mention popup (e.g. a "File" entry) calls this to drop the half-typed
  // "@frag" and open the native file picker, funnelling the choice into the
  // same attachment tray as the paperclip button.
  onAttach?: () => void
}

export type ComposerHelpPrefix = '@' | '/' | '!'

export interface ComposerHelpItem {
  prefix: ComposerHelpPrefix
  title: string
  description: string
  meta?: string
  disabled?: boolean
}

export interface ComposerHelpContent {
  label: string
  closeLabel: string
  title: string
  hint: string
  items: ComposerHelpItem[]
}

export type PopupNavigationKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'Enter'

export interface PopupNavigationCommand {
  key: PopupNavigationKey
  sequence: number
}

export interface ChatInputProps {
  onSend: (content: string, attachments?: ChatAttachment[]) => void
  onPause?: () => void
  busy?: boolean
  disabled?: boolean
  placeholder?: string
  commands?: CommandHint[]
  toolCommands?: CommandHint[]
  mentionables?: Mentionable[]
  composerHelp?: ComposerHelpContent
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

type SimplePopupKind = 'command' | 'tool' | 'mention'

const popupSurfaceClass = 'absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-30 overflow-hidden rounded-xl border border-border/70 bg-popover/95 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 duration-150'

function SuggestionPopup({
  kind,
  options,
  activeIndex,
  onPick,
}: {
  kind: SimplePopupKind
  options: CommandHint[]
  activeIndex: number
  onPick: (option: CommandHint) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const meta = kind === 'command'
    ? { prefix: '/', label: 'Commands', Icon: Slash, tone: 'text-primary bg-primary/10' }
    : kind === 'tool'
      ? { prefix: '!', label: 'Tools', Icon: Wrench, tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400' }
      : { prefix: '@', label: 'Mentions', Icon: AtSign, tone: 'text-ai bg-ai/10' }

  useEffect(() => {
    const list = listRef.current
    const activeOption = list?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
    if (!list || !activeOption) return
    const listRect = list.getBoundingClientRect()
    const optionRect = activeOption.getBoundingClientRect()
    if (optionRect.top < listRect.top) {
      list.scrollTop -= listRect.top - optionRect.top
    } else if (optionRect.bottom > listRect.bottom) {
      list.scrollTop += optionRect.bottom - listRect.bottom
    }
  }, [activeIndex, kind, options.length])

  return (
    <div className={popupSurfaceClass} role="listbox" aria-label={meta.label}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs">
        <span className={cn('grid h-6 w-6 place-items-center rounded-md font-mono font-semibold', meta.tone)}>{meta.prefix}</span>
        <span className="font-medium text-foreground">{meta.label}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">← ↑ ↓ → · Enter</span>
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto p-1.5">
        {options.length === 0 && (
          <div className="px-2.5 py-5 text-center text-xs text-muted-foreground">No matching suggestions</div>
        )}
        {options.map((option, index) => (
          <button
            key={`${kind}-${option.cmd}`}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => {
              event.preventDefault()
              onPick(option)
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-xs outline-none transition-colors',
              index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/70',
            )}
          >
            <meta.Icon className={cn('h-3.5 w-3.5 shrink-0', kind === 'tool' ? 'text-amber-500' : kind === 'mention' ? 'text-ai' : 'text-primary')} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono font-semibold text-foreground">{option.cmd}</span>
              {option.desc && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{option.desc}</span>}
            </span>
            {option.usage && option.usage !== option.cmd && (
              <span className="max-w-[45%] shrink-0 truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{option.usage}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
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
  toolCommands = [],
  mentionables = [],
  composerHelp,
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
  const [showToolHints, setShowToolHints] = useState(false)
  const [showComposerHelp, setShowComposerHelp] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(0)
  const [mentionNavigation, setMentionNavigation] = useState<PopupNavigationCommand | undefined>()
  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const composerHelpID = useId()
  // Guards the injectText effect: only fire when the nonce actually advances,
  // so a StrictMode double-invoke or an unrelated re-render can't re-append.
  const lastInjectRef = useRef(0)
  // Coalesce a byte-identical resend fired within a frame of the previous one.
  // The CJK-IME confirm Enter can invoke handleSend twice off a single keypress
  // (see handleKeyDown); both calls close over the same not-yet-cleared draft and
  // would post the message — and start an agent run — twice. This backstops the
  // isComposing/keyCode 229 guard, which some engines don't report on that keydown.
  const lastSendRef = useRef({ sig: '', at: 0 })

  const hasContent = draft.trim().length > 0 || attachments.length > 0
  const canSend = hasContent && !disabled
  const canPause = !!busy && !disabled && !!onPause
  const matchingMentions = mention && mentionables.length > 0
    ? mentionables.filter((m) => m.target.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 8)
    : []

  const matchingCommands = draft.startsWith('/')
    ? commands.filter((c) => c.cmd.startsWith(draft.split(' ')[0]))
    : commands
  const matchingToolCommands = draft.startsWith('!')
    ? toolCommands.filter((c) => {
        const token = draft.split(/\s/, 1)[0].toLowerCase()
        return c.cmd.toLowerCase().startsWith(token) || c.desc.toLowerCase().includes(token.slice(1))
      })
    : toolCommands
  const simplePopupKind: SimplePopupKind | null = mention
    ? (!renderMentionPopup && matchingMentions.length > 0 ? 'mention' : null)
    : showHints
      ? 'command'
      : showToolHints
        ? 'tool'
        : null
  const simpleOptions: CommandHint[] = simplePopupKind === 'command'
    ? matchingCommands
    : simplePopupKind === 'tool'
      ? matchingToolCommands
      : matchingMentions.map((item) => ({ cmd: item.target, desc: item.source || '', usage: item.label }))

  useEffect(() => {
    setActiveOptionIndex(0)
  }, [simplePopupKind, draft])

  const addFiles = useCallback((files: FileList | File[]) => {
    const newAttachments: ChatAttachment[] = Array.from(files).map((file) => ({
      file,
      mode: (isTextFile(file) && file.size <= contextSizeLimit) ? 'context' as const : 'upload' as const,
      status: 'pending' as const,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [contextSizeLimit])

  const openFilePicker = useCallback(() => {
    const input = fileInputRef.current
    if (!input || disabled) return
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // Fall through for browsers that expose showPicker but reject it for a
      // hidden input. A direct click remains supported by older engines.
    }
    input.click()
  }, [disabled])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const toggleMode = useCallback((index: number) => {
    setAttachments((prev) => prev.map((a, i) => i === index ? { ...a, mode: a.mode === 'context' ? 'upload' as const : 'context' as const } : a))
  }, [])

  const handleSend = useCallback(() => {
    const text = draft.trim()
    if ((!text && attachments.length === 0) || disabled) return
    const sig = JSON.stringify([text, attachments.length])
    const now = Date.now()
    if (sig === lastSendRef.current.sig && now - lastSendRef.current.at < 500) return
    lastSendRef.current = { sig, at: now }
    onSend(text, attachments.length > 0 ? attachments : undefined)
    setDraft('')
    setAttachments([])
    setShowHints(false)
    setShowToolHints(false)
    setShowComposerHelp(false)
    setMention(null)
  }, [draft, attachments, disabled, onSend])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ignore keys mid-IME-composition (CJK input). The Enter that confirms a
    // candidate reports isComposing (keyCode 229 on older engines) here — it must
    // not send. Without this guard it both sends the half-composed text and, since
    // handleSend closes over a draft that setDraft('') hasn't cleared yet, can fire
    // a second identical send off the same keypress and spawn a duplicate run.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (mention && renderMentionPopup && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key) && !e.shiftKey) {
      e.preventDefault()
      setMentionNavigation((previous) => ({
        key: e.key as PopupNavigationKey,
        sequence: (previous?.sequence ?? 0) + 1,
      }))
      return
    }
    if (simplePopupKind && simpleOptions.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const delta = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1
      setActiveOptionIndex((index) => (index + delta + simpleOptions.length) % simpleOptions.length)
      return
    }
    if (simplePopupKind && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const option = simpleOptions[activeOptionIndex] ?? simpleOptions[0]
      if (option) {
        if (simplePopupKind === 'mention') insertMention(option.cmd)
        else insertCommand(option.cmd)
      }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowHints(false)
      setShowToolHints(false)
      setShowComposerHelp(false)
      setMention(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setDraft(value)
    setShowComposerHelp(false)
    setShowHints(value === '/' || (value.startsWith('/') && !value.includes(' ')))
    setShowToolHints(value === '!' || (value.startsWith('!') && !value.includes(' ')))
    const caret = e.target.selectionStart ?? value.length
    setMention(mentionables.length > 0 || renderMentionPopup ? mentionAt(value, caret) : null)
  }

  // Re-evaluate the mention token when the caret moves without a text change
  // (arrow keys, or clicking into an existing @token).
  function handleSelect(e: React.SyntheticEvent<HTMLTextAreaElement>) {
    if (mentionables.length === 0 && !renderMentionPopup) return
    const el = e.currentTarget
    const caret = el.selectionStart ?? el.value.length
    setMention(mentionAt(el.value, caret))
  }

  function insertCommand(cmd: string) {
    setDraft(cmd + ' ')
    setShowHints(false)
    setShowToolHints(false)
    textareaRef.current?.focus()
  }

  function insertHelpPrefix(prefix: ComposerHelpPrefix) {
    setShowComposerHelp(false)
    setShowHints(false)
    setShowToolHints(false)

    const el = textareaRef.current
    if (prefix === '@') {
      const caret = el?.selectionStart ?? draft.length
      const needsSpace = caret > 0 && !/\s/.test(draft[caret - 1] ?? '')
      const token = `${needsSpace ? ' ' : ''}@`
      const start = caret + (needsSpace ? 1 : 0)
      const next = draft.slice(0, caret) + token + draft.slice(caret)
      const pos = caret + token.length
      setDraft(next)
      setMention({ start, query: '' })
      requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos) })
      return
    }

    // Slash and tool commands are only recognized at the start of a message.
    // Help actions never overwrite an in-progress draft.
    if (draft.trim()) {
      el?.focus()
      return
    }
    setDraft(prefix)
    setMention(null)
    setShowHints(prefix === '/')
    setShowToolHints(prefix === '!')
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(1, 1) })
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

  // Bridge for a categorized mention popup's "File" entry: drop the half-typed
  // "@frag" under the caret, then open the native file picker. The chosen files
  // land in the same attachment tray as the paperclip button (via addFiles).
  function requestAttach() {
    const el = textareaRef.current
    if (mention) {
      const caret = el?.selectionStart ?? draft.length
      setDraft(draft.slice(0, mention.start) + draft.slice(caret))
    }
    setMention(null)
    openFilePicker()
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

  useEffect(() => {
    if (!showComposerHelp) return
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setShowComposerHelp(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowComposerHelp(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePress)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showComposerHelp])

  const hasCommands = commands.length > 0
  const defaultPlaceholder = hasCommands
    ? 'Type a message... (/ for commands)'
    : enableAttachments
      ? 'Type a message or drop files...'
      : 'Type a message...'

  return (
    <div
      ref={rootRef}
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

      {simplePopupKind && (
        <SuggestionPopup
          kind={simplePopupKind}
          options={simpleOptions}
          activeIndex={Math.min(activeOptionIndex, simpleOptions.length - 1)}
          onPick={(option) => {
            if (simplePopupKind === 'mention') insertMention(option.cmd)
            else insertCommand(option.cmd)
          }}
        />
      )}

      {showComposerHelp && composerHelp && (
        <div
          id={composerHelpID}
          role="dialog"
          aria-label={composerHelp.label}
          className="absolute bottom-[calc(100%+0.5rem)] right-0 z-40 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border/70 bg-popover/95 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
            <CircleHelp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">{composerHelp.title}</h2>
            <button
              type="button"
              onClick={() => setShowComposerHelp(false)}
              className="ml-auto grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={composerHelp.closeLabel}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-1.5">
            {composerHelp.items.map((item) => {
              const blockedByDraft = item.prefix !== '@' && draft.trim().length > 0
              return (
                <button
                  key={item.prefix}
                  type="button"
                  disabled={item.disabled || blockedByDraft}
                  onClick={() => insertHelpPrefix(item.prefix)}
                  className="group flex w-full items-start gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-accent/70 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-md font-mono text-sm font-semibold',
                    item.prefix === '@' && 'bg-ai/10 text-ai',
                    item.prefix === '/' && 'bg-primary/10 text-primary',
                    item.prefix === '!' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  )}>
                    {item.prefix}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{item.title}</span>
                      {item.meta && <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{item.meta}</span>}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{item.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="flex items-start gap-2 border-t border-border/60 bg-muted/30 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
            <Keyboard className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{composerHelp.hint}</span>
          </div>
        </div>
      )}

      {/* @-mention popup — custom renderer or built-in simple list */}
      {mention && renderMentionPopup && (
        <div className={popupSurfaceClass}>
          {renderMentionPopup({
            query: mention.query,
            onSelect: insertMentions,
            onDismiss: () => setMention(null),
            onAttach: enableAttachments ? requestAttach : undefined,
            navigation: mentionNavigation,
          })}
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
                tabIndex={-1}
                className="sr-only"
                onChange={(e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = '' } }}
              />
              <button
                type="button"
                onClick={openFilePicker}
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
            onFocus={() => {
              if (draft === '/') setShowHints(true)
              if (draft === '!') setShowToolHints(true)
            }}
            onBlur={() => setTimeout(() => {
              setShowHints(false)
              setShowToolHints(false)
            }, 150)}
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

          {composerHelp && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setShowHints(false)
                    setShowToolHints(false)
                    setMention(null)
                    setShowComposerHelp((open) => !open)
                  }}
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                    showComposerHelp && 'bg-accent text-foreground',
                  )}
                  aria-label={composerHelp.label}
                  aria-expanded={showComposerHelp}
                  aria-controls={composerHelpID}
                  aria-haspopup="dialog"
                >
                  <CircleHelp className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{composerHelp.label}</TooltipContent>
            </Tooltip>
          )}

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
