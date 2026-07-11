import { useEffect, useRef, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { Monitor, X } from 'lucide-react'
import { cn } from '@cyber/theme'

export type TerminalStatus = 'connecting' | 'connected' | 'closed' | 'error'

export interface TerminalMessage {
  type: string
  task_id?: string
  stream_id?: string
  data?: string
  data_b64?: string
  payload?: unknown
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

export function parseTerminalMessage(value: string): TerminalMessage | null {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && typeof parsed.type === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function writeTerminalData(terminal: XTerm, msg: TerminalMessage) {
  terminal.write(messageData(msg))
}

export function sessionPayload(msg: TerminalMessage): PTYSession[] {
  const payload = payloadObject(msg)
  const sessions = Array.isArray(payload.sessions) ? payload.sessions : []
  return sessions.map(normalizeSession).filter((session): session is PTYSession => !!session)
}

export function sessionFromPayload(msg: TerminalMessage): PTYSession | null {
  const payload = payloadObject(msg)
  const session = normalizeSession(payload.session)
  if (session) return session
  return normalizeSession(payload)
}

export function stringPayload(msg: TerminalMessage, key: string): string {
  const payload = payloadObject(msg)
  const value = payload[key]
  return typeof value === 'string' ? value : ''
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

function payloadObject(msg: TerminalMessage): Record<string, unknown> {
  if (!msg.payload) return {}
  if (typeof msg.payload === 'string') {
    try {
      const parsed = JSON.parse(msg.payload)
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
    } catch {
      return {}
    }
  }
  return typeof msg.payload === 'object' ? msg.payload as Record<string, unknown> : {}
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

function messageData(msg: TerminalMessage): string {
  if (msg.data_b64) {
    try {
      const binary = atob(msg.data_b64)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    } catch {
      return ''
    }
  }
  return msg.data || ''
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
