import { useEffect, useRef, type ComponentType, type Dispatch, type ReactNode, type SetStateAction, type SVGProps } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal as XTerm } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { Monitor as LucideMonitor, X as LucideX } from 'lucide-react'
import { cn } from '@cyber/theme'
import { create } from '@bufbuild/protobuf'
import { PtySessionSchema, type PtyProtocolMessage, type PtySession } from '@cyber/aop'
import type { Timestamp } from '@bufbuild/protobuf/wkt'

const Monitor = LucideMonitor as unknown as ComponentType<SVGProps<SVGSVGElement>>
const X = LucideX as unknown as ComponentType<SVGProps<SVGSVGElement>>

export type TerminalStatus = 'connecting' | 'connected' | 'closed' | 'error'
export type PTYFrame = PtyProtocolMessage
export type PTYSession = PtySession

export function TerminalView({ onReady, className }: { onReady: (terminal: XTerm, fit: FitAddon) => void; className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const onReadyRef = useRef(onReady)
  useEffect(() => { onReadyRef.current = onReady }, [onReady])
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const terminal = new XTerm({ cursorBlink: true, convertEol: true, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 12, lineHeight: 1.35, theme: { background: '#060a0d', foreground: '#d7e1ea', cursor: '#38e38b' } })
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(mount)
    const resize = () => { try { fit.fit() } catch {} }
    requestAnimationFrame(resize)
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    onReadyRef.current(terminal, fit)
    terminal.focus()
    return () => { observer.disconnect(); terminal.dispose() }
  }, [])
  return <div className={cn('min-h-0 flex-1 bg-[#060a0d] p-2', className)}><div ref={mountRef} className="h-full min-h-[18rem] w-full" /></div>
}

export function TerminalHeader({ actions, status, title }: { actions?: ReactNode; status: TerminalStatus; title: string }) {
  return <div className="flex h-11 min-w-0 shrink-0 items-center justify-between border-b border-border px-3"><div className="flex min-w-0 items-center gap-2" title={title}><Monitor className="h-4 w-4 shrink-0 text-primary" /><span className="truncate text-sm font-medium text-foreground">{title}</span><span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px]', terminalStatusColor(status))}>{status}</span></div>{actions && <div className="flex items-center gap-1">{actions}</div>}</div>
}

export function SessionNavigator({ activeID, emptyText = 'No sessions', header, listLabel = 'Sessions', onSelect, sessions, summary, unreadIDs }: { activeID: string; emptyText?: string; header?: ReactNode; listLabel?: string; onSelect: (session: PTYSession) => void; sessions: PTYSession[]; summary?: string; unreadIDs?: Set<string> }) {
  return <aside className="flex max-h-72 w-full shrink-0 flex-col border-b border-border lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">{header && <div className="border-b border-border p-2">{header}</div>}<div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-3 text-[10px] uppercase text-muted-foreground"><span>{listLabel}</span>{summary && <span className="truncate">{summary}</span>}</div><div className="min-h-0 flex-1 overflow-auto p-2">{sessions.length === 0 ? <div className="px-2 py-3 text-xs text-muted-foreground">{emptyText}</div> : sessions.map((session) => <SessionButton key={session.id} active={session.id === activeID} details={sessionDetails(session)} meta={sessionMeta(session)} onClick={() => onSelect(session)} state={session.state} title={sessionTitle(session)} unread={!!unreadIDs?.has(session.id)} />)}</div></aside>
}

export function SessionButton({ active, details, meta, onClick, state, title, unread }: { active?: boolean; details?: string; meta?: string; onClick: () => void; state?: string; title: string; unread?: boolean }) {
  return <button type="button" aria-current={active ? 'true' : undefined} onClick={onClick} title={details} className={cn('mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs transition-colors', active ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground')}><span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', stateColor(state), unread && 'ring-2 ring-primary/30')} /><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-1.5"><span className="min-w-0 flex-1 truncate font-medium">{title}</span>{state && <span className={cn('shrink-0 text-[10px]', stateTextColor(state))}>{stateLabel(state)}</span>}</span>{meta && <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{meta}</span>}</span></button>
}

export function DetailPanel({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return <aside className="flex max-h-72 w-full shrink-0 flex-col border-t border-border bg-card lg:max-h-none lg:w-80 lg:border-l lg:border-t-0"><div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3"><span className="text-xs font-medium uppercase text-muted-foreground">{title}</span><button type="button" aria-label="Close details" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-3.5 w-3.5" /></button></div><div className="min-h-0 flex-1 overflow-auto p-3 text-xs">{children}</div></aside>
}
export function DetailGroup({ children, title }: { children: ReactNode; title: string }) { return <section className="mb-4 last:mb-0"><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3><div className="space-y-1">{children}</div></section> }
export function DetailRow({ label, mono, value }: { label: string; mono?: boolean; value?: ReactNode }) { if (value === undefined || value === null || value === '') return null; return <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2"><span className="text-muted-foreground">{label}</span><span className={cn('min-w-0 break-words text-foreground', mono && 'font-mono text-[11px]')}>{value}</span></div> }

export function encodeTerminalData(value: string): Uint8Array { return new TextEncoder().encode(value) }
export function writeTerminalData(terminal: XTerm, frame: PTYFrame) { if (frame.message.case === 'output') terminal.write(new TextDecoder().decode(frame.message.value.data)) }
export function sessionsFromFrame(frame: PTYFrame): PTYSession[] { return frame.message.case === 'sessions' ? frame.message.value.sessions.filter((session) => !!session.id) : [] }
export function sessionFromFrame(frame: PTYFrame): PTYSession | null {
  switch (frame.message.case) {
    case 'opened': return frame.message.value.session ?? null
    case 'attached': return frame.message.value.session ?? null
    case 'closed': return frame.message.value.session ?? null
    case 'state': return frame.message.value.session ?? null
    default: return null
  }
}
export function mergeSession(items: PTYSession[], session: PTYSession): PTYSession[] { const index = items.findIndex((item) => item.id === session.id); if (index < 0) return [...items, session]; const next = [...items]; next[index] = create(PtySessionSchema, { ...next[index], ...session }); return next }
export function upsertSession(setSessions: Dispatch<SetStateAction<PTYSession[]>>, session: PTYSession) { setSessions((items) => mergeSession(items, session)) }
export function compareSessionsByActivity(a: PTYSession, b: PTYSession): number { return timestampValue(b.lastActivityAt) - timestampValue(a.lastActivityAt) || timestampValue(b.startedAt) - timestampValue(a.startedAt) }
export function activitySeq(session: PTYSession): number { return positiveNumber(session.activitySeq) || timestampValue(session.lastActivityAt) || timestampValue(session.startedAt) }
export function sessionTitle(session: PTYSession): string { return session.name || session.command || (session.kind === 'repl' ? 'Main REPL' : session.id || 'Session') }
export function sessionDetails(session: PTYSession): string { return [`id: ${session.id}`, session.kind ? `kind: ${session.kind}` : '', session.state ? `state: ${stateLabel(session.state)}` : '', session.command ? `command: ${session.command}` : '', session.pid ? `pid: ${session.pid}` : '', session.startedAt ? `started: ${formatDateTime(session.startedAt)}` : '', session.lastActivityAt ? `activity: ${formatDateTime(session.lastActivityAt)}` : ''].filter(Boolean).join('\n') }
export function stateLabel(state?: string): string { return state === 'completed' ? 'done' : state || '' }
export function terminalStatusColor(status: TerminalStatus): string { return status === 'connected' ? 'bg-primary/10 text-primary' : status === 'connecting' ? 'bg-yellow-400/10 text-yellow-700 dark:text-yellow-300' : status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground' }
export function formatDateTime(value?: Timestamp | string): string | undefined { if (!value) return undefined; const date = typeof value === 'string' ? new Date(value) : new Date(Number(value.seconds) * 1000 + Math.floor(value.nanos / 1_000_000)); return Number.isNaN(date.getTime()) ? (typeof value === 'string' ? value : undefined) : date.toLocaleString() }
export function formatBytes(value?: number | bigint): string | undefined { const n = positiveNumber(value); if (!n) return undefined; if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1024 / 1024).toFixed(1)} MB` }
export function positiveNumber(value: unknown): number | undefined { if (typeof value === 'bigint') return value > 0n ? Number(value) : undefined; return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined }

function sessionMeta(session: PTYSession): string { return [session.kind, session.pid ? `pid ${session.pid}` : '', formatDateTime(session.lastActivityAt)].filter(Boolean).join(' / ') }
function stateColor(state?: string): string { return state === 'running' ? 'bg-primary' : state === 'failed' || state === 'killed' ? 'bg-destructive' : 'bg-muted-foreground' }
function stateTextColor(state?: string): string { return state === 'running' ? 'text-primary' : state === 'failed' || state === 'killed' ? 'text-destructive' : 'text-muted-foreground' }
function timestampValue(value?: Timestamp): number { return value ? Number(value.seconds) * 1000 + Math.floor(value.nanos / 1_000_000) : 0 }
