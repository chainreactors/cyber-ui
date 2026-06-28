import { useState, type ReactNode } from 'react'
import { Bot, Check, ChevronDown, ChevronRight, CircleDashed, Loader2, User, Wrench } from 'lucide-react'
import { cn } from '@aspect/theme'

export interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  actorName?: string | null
  timestamp?: string
  streaming?: boolean
  children?: ReactNode
  className?: string
}

export function MessageBubble({ role, actorName, timestamp, streaming, children, className }: MessageBubbleProps) {
  const isUser = role === 'user'
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : ''

  if (role === 'system') {
    return (
      <div className={cn('w-full rounded-md border border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground', className)}>
        {children || <span className="italic">Empty message</span>}
      </div>
    )
  }

  return (
    <div className={cn('flex w-full gap-3', isUser && 'flex-row-reverse', className)}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary/15 text-primary' : 'bg-purple-400/20 text-purple-600 dark:text-purple-300',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div className={cn('min-w-0 space-y-1', isUser ? 'flex max-w-[min(82%,52rem)] flex-col items-end' : 'flex-1')}>
        <div className={cn('flex items-center gap-2 text-[10px] text-muted-foreground', isUser && 'flex-row-reverse')}>
          <span className="font-medium">{isUser ? 'You' : actorName || 'Assistant'}</span>
          {time && <span className="font-mono">{time}</span>}
        </div>
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-sm leading-relaxed',
            isUser ? 'bg-primary/10 text-foreground' : 'border border-border bg-card text-foreground',
            streaming && 'border-primary/40',
          )}
        >
          {children || (!streaming && <span className="text-muted-foreground italic">Empty message</span>)}
          {streaming && <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-primary align-text-bottom" />}
        </div>
      </div>
    </div>
  )
}

export function ChatThinking({ actorName, children, className }: {
  actorName?: string | null
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex gap-3', className)}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-400/20 text-purple-600 dark:text-purple-300">
        <CircleDashed className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-[10px] font-medium text-muted-foreground">{actorName || 'Agent'}</div>
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          {children || (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms] [animation-duration:1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms] [animation-duration:1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms] [animation-duration:1s]" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export interface ToolCallDisplayProps {
  toolName: string
  toolArgs?: string
  result?: string
  pending?: boolean
  defaultExpanded?: boolean
  className?: string
}

export function ToolCallDisplay({
  toolName,
  toolArgs = '',
  result,
  pending = false,
  defaultExpanded = false,
  className,
}: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const summary = summarizeArgs(toolArgs)
  const formattedArgs = formatArgs(toolArgs)
  const displayResult = result === undefined ? undefined : stripAnsiControl(result)

  return (
    <div className={cn('overflow-hidden rounded-md bg-muted/30 transition-colors', pending && 'bg-yellow-400/10', className)}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent/50"
      >
        <Wrench className={cn('h-3.5 w-3.5 shrink-0', pending ? 'text-yellow-500' : 'text-muted-foreground')} />
        <span className="shrink-0 font-mono font-medium text-foreground">
          {toolName || 'tool'}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground" title={summary || formattedArgs}>
          {summary || (pending ? 'running' : 'completed')}
        </span>
        {pending ? <Loader2 className="h-3 w-3 shrink-0 animate-spin text-yellow-500" /> : <Check className="h-3 w-3 shrink-0 text-primary" />}
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-in-out', expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-border/70">
            {toolArgs && (
              <div className="px-2.5 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Arguments</div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded font-mono text-xs text-foreground">{formattedArgs}</pre>
              </div>
            )}
            {displayResult !== undefined && (
              <div className="border-t border-border/70 px-2.5 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Result</div>
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded font-mono text-xs text-foreground">{displayResult}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AssistantResponse({
  actorName,
  labels,
  response,
  streaming,
  thinking,
  timestamp,
  tools,
}: {
  actorName?: string | null
  labels?: { thinking?: string; tools?: string; response?: string }
  response?: ReactNode
  streaming?: boolean
  thinking?: ReactNode
  timestamp?: string
  tools?: ReactNode
}) {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : ''
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-400/20 text-purple-600 dark:text-purple-300">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-medium">{actorName || 'Assistant'}</span>
          {time && <span className="font-mono">{time}</span>}
        </div>
        <div className={cn('rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground', streaming && 'border-primary/40')}>
          <div className="space-y-2">
            {thinking && <ResponseSection label={labels?.thinking || 'Thinking'} muted>{thinking}</ResponseSection>}
            {tools && <ResponseSection label={labels?.tools || 'Tools'}>{tools}</ResponseSection>}
            {response && <div>{response}</div>}
            {streaming && <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-primary align-text-bottom" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResponseSection({ children, label, muted, streaming }: {
  children: ReactNode
  label: string
  muted?: boolean
  streaming?: boolean
}) {
  return (
    <div className={cn('border-b border-border/70 pb-2 last:border-b-0 last:pb-0', muted ? 'text-muted-foreground' : 'text-foreground')}>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
      {streaming && <span className="ml-0.5 inline-block h-[14px] w-[2px] animate-pulse bg-primary align-text-bottom" />}
    </div>
  )
}

function formatArgs(args: string): string {
  try {
    return JSON.stringify(JSON.parse(args), null, 2)
  } catch {
    return args
  }
}

export function summarizeArgs(args: string): string {
  const raw = args.trim()
  if (!raw) return ''
  try {
    return compactSummary(summaryFromValue(JSON.parse(raw)))
  } catch {
    return compactSummary(raw)
  }
}

function summaryFromValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(summaryFromValue).filter(Boolean).join(' ')
  if (typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  for (const key of ['command', 'cmd', 'query', 'url', 'target', 'input', 'prompt', 'text', 'content', 'path', 'pattern', 'selector', 'code', 'args']) {
    const summary = summaryFromValue(record[key])
    if (summary) return summary
  }
  for (const item of Object.values(record)) {
    const summary = summaryFromValue(item)
    if (summary) return summary
  }
  return ''
}

function compactSummary(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripAnsiControl(value: string): string {
  return value
    .replace(/[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, '')
    .replace(/\r\n?/g, '\n')
}
