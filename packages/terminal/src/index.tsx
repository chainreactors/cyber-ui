import { useCallback, useEffect, useRef, useState, type ComponentType, type Dispatch, type ReactNode, type SetStateAction, type SVGProps } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm, type ILink } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { Monitor as LucideMonitor, X as LucideX } from 'lucide-react'
import { cn } from '@cyber/theme'

const Monitor = LucideMonitor as unknown as ComponentType<SVGProps<SVGSVGElement>>
const X = LucideX as unknown as ComponentType<SVGProps<SVGSVGElement>>

export type TerminalStatus = 'connecting' | 'connected' | 'closed' | 'error'

export type PTYFrameType =
  | 'open'
  | 'opened'
  | 'attach'
  | 'attached'
  | 'input'
  | 'output'
  | 'resize'
  | 'detach'
  | 'detached'
  | 'kill'
  | 'list'
  | 'sessions'
  | 'closed'
  | 'error'

export interface PTYFrame {
  type: PTYFrameType
  stream_id?: string
  session_id?: string
  kind?: string
  name?: string
  command?: string
  args?: string[]
  data?: string
  cols?: number
  rows?: number
  bytes?: number
  offset?: number
  singleton?: boolean
  error?: string
  state?: string
  exit_code?: number
  session?: PTYSession
  sessions?: PTYSession[]
}

export interface PTYSession {
  id: string
  name?: string
  kind?: string
  command?: string
  state?: string
  pid?: number
  started_at?: string
  last_activity_at?: string
  ended_at?: string
  exit_code?: number
  kill_cause?: string
  output_bytes?: number
  activity_seq?: number
  [key: string]: unknown
}

export interface TerminalLink {
  text: string
  start: number
  end: number
  value?: string
}

export interface WebSocketTerminalLabels {
  readOnly: string
  reconnecting: string
  disconnected: string
  sessionClosed: string
  errorPrefix: string
}

export interface WebSocketTerminalProps {
  actions?: ReactNode
  canConnect?: boolean
  className?: string
  connectUrl: string
  initialInput?: string
  kind?: string
  killOnUnmount?: boolean
  labels?: Partial<WebSocketTerminalLabels>
  onCommandComplete?: () => void
  onLinkActivate?: (link: TerminalLink) => void
  onSessionChange?: (session: PTYSession | null) => void
  onStatusChange?: (status: TerminalStatus) => void
  reconnectAttempts?: number
  reconnectDelayMs?: number
  resolveLinks?: (line: string) => TerminalLink[]
  sessionName: string
  title?: string
}

const DEFAULT_TERMINAL_LABELS: WebSocketTerminalLabels = {
  readOnly: 'Read-only terminal',
  reconnecting: 'PTY disconnected, reconnecting…',
  disconnected: 'PTY disconnected.',
  sessionClosed: '[session closed]',
  errorPrefix: '[pty error]',
}

export function TerminalView({ onReady, className }: {
  onReady: (terminal: XTerm, fit: FitAddon) => void
  className?: string
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const onReadyRef = useRef(onReady)

  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const terminal = new XTerm({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 12,
      lineHeight: 1.35,
      theme: {
        background: '#060a0d',
        foreground: '#d7e1ea',
        cursor: '#38e38b',
        black: '#0b1115',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#22d3ee',
        white: '#e5edf4',
      },
    })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(mount)

    const fitTerminal = () => {
      try {
        fit.fit()
      } catch {}
    }
    requestAnimationFrame(fitTerminal)
    const observer = new ResizeObserver(fitTerminal)
    observer.observe(mount)
    onReadyRef.current(terminal, fit)
    terminal.focus()

    return () => {
      observer.disconnect()
      terminal.dispose()
    }
  }, [])

  return (
    <div className={cn('min-h-0 flex-1 bg-[#060a0d] p-2', className)}>
      <div ref={mountRef} className="h-full min-h-[18rem] w-full" />
    </div>
  )
}

export function TerminalHeader({ actions, status, title }: {
  actions?: ReactNode
  status: TerminalStatus
  title: string
}) {
  return (
    <div className="flex h-11 min-w-0 shrink-0 items-center justify-between border-b border-border px-3">
      <div className="flex min-w-0 items-center gap-2" title={title}>
        <Monitor className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px]', terminalStatusColor(status))}>
          {status}
        </span>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  )
}

export function WebSocketTerminal({
  actions,
  canConnect = true,
  className,
  connectUrl,
  initialInput,
  kind = 'shell',
  killOnUnmount = true,
  labels: labelsInput,
  onCommandComplete,
  onLinkActivate,
  onSessionChange,
  onStatusChange,
  reconnectAttempts = 3,
  reconnectDelayMs = 1200,
  resolveLinks,
  sessionName,
  title = 'Terminal',
}: WebSocketTerminalProps) {
  const labels = { ...DEFAULT_TERMINAL_LABELS, ...labelsInput }
  const [status, setStatus] = useState<TerminalStatus>('connecting')
  const [sessionTitle, setSessionTitle] = useState('')
  const termRef = useRef<XTerm | null>(null)
  const [readySeq, setReadySeq] = useState(0)
  const commandCompleteRef = useRef(onCommandComplete)
  const linkActivateRef = useRef(onLinkActivate)
  const linksRef = useRef(resolveLinks)
  const sessionChangeRef = useRef(onSessionChange)
  const statusChangeRef = useRef(onStatusChange)

  commandCompleteRef.current = onCommandComplete
  linkActivateRef.current = onLinkActivate
  linksRef.current = resolveLinks
  sessionChangeRef.current = onSessionChange
  statusChangeRef.current = onStatusChange

  const updateStatus = useCallback((next: TerminalStatus) => {
    setStatus(next)
    statusChangeRef.current?.(next)
  }, [])

  const handleReady = useCallback((terminal: XTerm, _fit: FitAddon) => {
    termRef.current = terminal
    setReadySeq((value) => value + 1)
  }, [])

  useEffect(() => {
    if (!readySeq) return
    const terminal = termRef.current
    if (!terminal) return

    terminal.reset()
    setSessionTitle('')
    sessionChangeRef.current?.(null)
    if (!canConnect) {
      updateStatus('closed')
      terminal.writeln(`\x1b[90m${labels.readOnly}\x1b[0m`)
      return
    }

    let disposed = false
    let socket: WebSocket | null = null
    let reconnectTimer = 0
    let reconnects = 0
    let activeSession = ''
    let initializedSession = ''

    const send = (message: Record<string, unknown>) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    }
    const size = () => ({ cols: terminal.cols, rows: terminal.rows })

    const dataDisposable = terminal.onData((data) => {
      if (!activeSession) return
      send({ type: 'input', session_id: activeSession, data: encodeTerminalData(data) })
      if (/\r|\n/.test(data)) window.setTimeout(() => commandCompleteRef.current?.(), 400)
    })
    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      if (activeSession) send({ type: 'resize', session_id: activeSession, cols, rows })
    })
    const linkProvider = terminal.registerLinkProvider({
      provideLinks(lineNumber, callback) {
        const resolver = linksRef.current
        if (!resolver) {
          callback(undefined)
          return
        }
        const line = terminal.buffer.active.getLine(lineNumber - 1)?.translateToString(true) ?? ''
        const links: ILink[] = resolver(line).map((link) => ({
          text: link.text,
          range: {
            start: { x: link.start + 1, y: lineNumber },
            end: { x: link.end, y: lineNumber },
          },
          activate: () => linkActivateRef.current?.(link),
        }))
        callback(links.length ? links : undefined)
      },
    })

    const connect = () => {
      if (disposed) return
      updateStatus('connecting')
      const nextSocket = new WebSocket(connectUrl)
      socket = nextSocket

      nextSocket.onopen = () => {
        reconnects = 0
        updateStatus('connected')
        send({ type: 'open', kind, name: sessionName, ...size() })
      }
      nextSocket.onmessage = (event) => {
        if (typeof event.data !== 'string') return
        const message = parsePTYFrame(event.data)
        if (!message) return
        switch (message.type) {
          case 'opened':
          case 'attached': {
            const session = sessionFromFrame(message)
            activeSession = message.session_id || session?.id || ''
            setSessionTitle(session?.name || activeSession)
            sessionChangeRef.current?.(session)
            updateStatus('connected')
            if (activeSession && initialInput && initializedSession !== activeSession) {
              initializedSession = activeSession
              send({
                type: 'input',
                session_id: activeSession,
                data: encodeTerminalData(initialInput),
              })
            }
            terminal.focus()
            break
          }
          case 'output':
            writeTerminalData(terminal, message)
            break
          case 'closed':
            activeSession = ''
            setSessionTitle('')
            sessionChangeRef.current?.(null)
            updateStatus('closed')
            terminal.writeln(`\r\n\x1b[90m${labels.sessionClosed}\x1b[0m`)
            break
          case 'error':
            updateStatus('error')
            terminal.writeln(`\r\n\x1b[31m${labels.errorPrefix} ${message.error || 'unknown error'}\x1b[0m`)
            break
        }
      }
      nextSocket.onerror = () => updateStatus('error')
      nextSocket.onclose = () => {
        if (socket === nextSocket) socket = null
        activeSession = ''
        sessionChangeRef.current?.(null)
        if (disposed) return
        if (reconnects < reconnectAttempts) {
          reconnects += 1
          updateStatus('connecting')
          terminal.writeln(`\r\n\x1b[90m${labels.reconnecting}\x1b[0m`)
          reconnectTimer = window.setTimeout(connect, reconnectDelayMs)
        } else {
          updateStatus('closed')
          terminal.writeln(`\r\n\x1b[90m${labels.disconnected}\x1b[0m`)
        }
      }
    }

    connect()
    return () => {
      disposed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (socket?.readyState === WebSocket.OPEN) {
        if (killOnUnmount && activeSession) {
          socket.send(JSON.stringify({ type: 'kill', session_id: activeSession }))
        }
        socket.send(JSON.stringify({ type: 'detach', session_id: activeSession || undefined }))
      }
      socket?.close()
      dataDisposable.dispose()
      resizeDisposable.dispose()
      linkProvider.dispose()
    }
  }, [
    canConnect,
    connectUrl,
    initialInput,
    killOnUnmount,
    kind,
    labels.disconnected,
    labels.errorPrefix,
    labels.readOnly,
    labels.reconnecting,
    labels.sessionClosed,
    readySeq,
    reconnectAttempts,
    reconnectDelayMs,
    sessionName,
    updateStatus,
  ])

  return (
    <div className={cn('flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-[#060a0d]', className)}>
      <TerminalHeader actions={actions} status={status} title={sessionTitle || title} />
      <TerminalView onReady={handleReady} className="min-h-0" />
    </div>
  )
}

export function SessionNavigator({
  activeID,
  emptyText = 'No sessions',
  header,
  listLabel = 'Sessions',
  onSelect,
  sessions,
  summary,
  unreadIDs,
}: {
  activeID: string
  emptyText?: string
  header?: ReactNode
  listLabel?: string
  onSelect: (session: PTYSession) => void
  sessions: PTYSession[]
  summary?: string
  unreadIDs?: Set<string>
}) {
  return (
    <aside className="flex max-h-72 w-full shrink-0 flex-col border-b border-border lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">
      {header && <div className="border-b border-border p-2">{header}</div>}
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-3 text-[10px] uppercase text-muted-foreground">
        <span>{listLabel}</span>
        {summary && <span className="truncate">{summary}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {sessions.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">{emptyText}</div>
        ) : (
          sessions.map((session) => (
            <SessionButton
              key={session.id}
              active={session.id === activeID}
              details={sessionDetails(session)}
              meta={sessionMeta(session)}
              onClick={() => onSelect(session)}
              state={session.state}
              title={sessionTitle(session)}
              unread={!!unreadIDs?.has(session.id)}
            />
          ))
        )}
      </div>
    </aside>
  )
}

export function SessionButton({
  active,
  details,
  meta,
  onClick,
  state,
  title,
  unread,
}: {
  active?: boolean
  details?: string
  meta?: string
  onClick: () => void
  state?: string
  title: string
  unread?: boolean
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'true' : undefined}
      onClick={onClick}
      title={details}
      className={cn(
        'mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors',
        active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', stateColor(state), unread && 'ring-2 ring-primary/30')} />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
          {state && <span className={cn('shrink-0 text-[10px]', stateTextColor(state))}>{stateLabel(state)}</span>}
        </span>
        {meta && <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{meta}</span>}
      </span>
    </button>
  )
}

export function DetailPanel({ children, onClose, title }: {
  children: ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <aside className="flex max-h-72 w-full shrink-0 flex-col border-t border-border bg-card lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-medium uppercase text-muted-foreground">{title}</span>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3 text-xs">{children}</div>
    </aside>
  )
}

export function DetailGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

export function DetailRow({ label, mono, value }: { label: string; mono?: boolean; value?: ReactNode }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 break-words text-foreground', mono && 'font-mono text-[11px]')}>{value}</span>
    </div>
  )
}

export function parsePTYFrame(value: string): PTYFrame | null {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && isPTYFrameType(parsed.type) ? parsed as PTYFrame : null
  } catch {
    return null
  }
}

export function encodeTerminalData(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function writeTerminalData(terminal: XTerm, frame: PTYFrame) {
  terminal.write(frameData(frame))
}

export function sessionsFromFrame(frame: PTYFrame): PTYSession[] {
  const sessions = Array.isArray(frame.sessions) ? frame.sessions : []
  return sessions.map(normalizeSession).filter((session): session is PTYSession => !!session)
}

export function sessionFromFrame(frame: PTYFrame): PTYSession | null {
  const session = normalizeSession(frame.session)
  if (session) return session
  return normalizeSession(frame)
}

export function mergeSession(items: PTYSession[], session: PTYSession): PTYSession[] {
  const index = items.findIndex((item) => item.id === session.id)
  if (index < 0) return [...items, session]
  const next = [...items]
  next[index] = { ...next[index], ...session }
  return next
}

export function upsertSession(setSessions: Dispatch<SetStateAction<PTYSession[]>>, session: PTYSession) {
  setSessions((items) => mergeSession(items, session))
}

export function compareSessionsByActivity(a: PTYSession, b: PTYSession): number {
  // Order strictly by timestamps (both always populated by the backend view).
  // Do NOT fold in activity_seq: it is a small per-session event counter that is
  // only present for sessions the *current* connection's activity tracker has
  // observed, so mixing it with epoch-millisecond timestamps in one subtraction
  // produced an incoherent, churning order (finished tasks jumped rank every
  // 350ms broadcast). activity_seq stays reserved for unread detection only.
  return timestampValue(b.last_activity_at) - timestampValue(a.last_activity_at)
    || timestampValue(b.started_at) - timestampValue(a.started_at)
}

export function activitySeq(session: PTYSession): number {
  return positiveNumber(session.activity_seq) || timestampValue(session.last_activity_at) || timestampValue(session.started_at)
}

export function sessionTitle(session: PTYSession): string {
  if (session.name) return session.name
  if (session.command) return session.command
  if (session.kind === 'repl') return 'Main REPL'
  return session.id || 'Session'
}

export function sessionDetails(session: PTYSession): string {
  return [
    `id: ${session.id}`,
    session.kind ? `kind: ${session.kind}` : '',
    session.state ? `state: ${stateLabel(session.state)}` : '',
    session.command ? `command: ${session.command}` : '',
    session.pid ? `pid: ${session.pid}` : '',
    session.started_at ? `started: ${formatDateTime(session.started_at)}` : '',
    session.last_activity_at ? `activity: ${formatDateTime(session.last_activity_at)}` : '',
  ].filter(Boolean).join('\n')
}

export function stateLabel(state?: string): string {
  switch (state) {
    case 'running':
      return 'running'
    case 'completed':
      return 'done'
    case 'failed':
      return 'failed'
    case 'killed':
      return 'killed'
    default:
      return state || ''
  }
}

export function terminalStatusColor(status: TerminalStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-primary/10 text-primary'
    case 'connecting':
      return 'bg-yellow-400/10 text-yellow-700 dark:text-yellow-300'
    case 'error':
      return 'bg-destructive/10 text-destructive'
    case 'closed':
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function formatDateTime(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function formatBytes(value?: number): string | undefined {
  const n = positiveNumber(value)
  if (!n) return undefined
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function sessionMeta(session: PTYSession): string {
  return [session.kind, session.pid ? `pid ${session.pid}` : '', formatDateTime(session.last_activity_at)].filter(Boolean).join(' / ')
}

function stateColor(state?: string): string {
  switch (state) {
    case 'running':
      return 'bg-primary'
    case 'completed':
      return 'bg-muted-foreground'
    case 'failed':
    case 'killed':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground'
  }
}

function stateTextColor(state?: string): string {
  switch (state) {
    case 'running':
      return 'text-primary'
    case 'failed':
    case 'killed':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

function normalizeSession(value: unknown): PTYSession | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const id = stringValue(record.id) || stringValue(record.session_id)
  if (!id) return null
  return {
    ...record,
    id,
    name: stringValue(record.name),
    kind: stringValue(record.kind),
    command: stringValue(record.command),
    state: stringValue(record.state),
    pid: numberValue(record.pid),
    started_at: stringValue(record.started_at),
    last_activity_at: stringValue(record.last_activity_at),
    ended_at: stringValue(record.ended_at),
    exit_code: numberValue(record.exit_code),
    kill_cause: stringValue(record.kill_cause),
    output_bytes: numberValue(record.output_bytes),
    activity_seq: numberValue(record.activity_seq),
  }
}

function frameData(frame: PTYFrame): string {
  if (!frame.data) return ''
  try {
    const binary = atob(frame.data)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

function isPTYFrameType(value: unknown): value is PTYFrameType {
  return typeof value === 'string' && [
    'open', 'opened', 'attach', 'attached', 'input', 'output', 'resize',
    'detach', 'detached', 'kill', 'list', 'sessions', 'closed', 'error',
  ].includes(value)
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function timestampValue(value?: string): number {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}
