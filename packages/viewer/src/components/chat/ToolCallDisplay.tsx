import { useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Loader2,
  Terminal,
  Wrench,
} from 'lucide-react'
import { cn } from '@cyber/theme'
import { CodeBlock } from '@cyber/markdown'
import { stripAnsiControl, formatArgs, summarizeArgs } from '../../lib/tool-utils'

export interface ToolCallDisplayProps {
  toolName: string
  toolArgs?: string
  result?: string
  pending?: boolean
  defaultExpanded?: boolean
  className?: string
}

export default function ToolCallDisplay({
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
    <div
      className={cn(
        'overflow-hidden rounded-lg border transition-colors duration-200',
        pending ? 'border-warning/30' : 'border-border',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-accent/50"
      >
        <Wrench
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-colors',
            pending ? 'text-warning' : 'text-muted-foreground',
          )}
        />
        <span className="shrink-0 rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono font-medium text-foreground">
          {toolName || 'tool'}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-mono text-muted-foreground"
          title={summary || formattedArgs}
        >
          {summary || (pending ? 'running' : 'completed')}
        </span>
        {pending ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-warning" />
        ) : (
          <Check className="h-3 w-3 shrink-0 text-success" />
        )}
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border">
            {toolArgs && (
              <div className="bg-muted/30 px-3 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Arguments
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded font-mono text-xs text-foreground">
                  {formattedArgs}
                </pre>
              </div>
            )}
            {displayResult !== undefined && (
              <div className="border-t border-border px-3 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Result
                </div>
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded font-mono text-xs text-foreground">
                  {displayResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- Code call rendering (uses CodeBlock) ---- */

export interface CodeCallDisplayProps {
  language: string
  label: string
  code: string
  toolCallId?: string
  defaultExpanded?: boolean
  className?: string
}

export function CodeCallDisplay({
  language,
  label,
  code,
  toolCallId,
  defaultExpanded = false,
  className,
}: CodeCallDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const Chevron = expanded ? ChevronDown : ChevronRight
  const firstLine = code.split('\n')[0].slice(0, 80)

  return (
    <div className={cn('overflow-hidden rounded-lg border border-warning/30', className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-w-0 items-center gap-2 bg-warning/10 px-3 py-2 text-left text-xs transition-colors hover:bg-warning/20"
      >
        <Code2 className="h-3.5 w-3.5 shrink-0 text-warning" />
        <span className="text-[10px] font-semibold uppercase text-warning">{label}</span>
        {toolCallId && (
          <span className="ml-auto mr-1 font-mono text-[9px] text-muted-foreground">
            {toolCallId.slice(0, 8)}
          </span>
        )}
        <Chevron className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      {!expanded && (
        <div className="truncate border-t border-border px-3 py-1 font-mono text-[10px] text-muted-foreground">
          {firstLine}
        </div>
      )}

      {expanded && (
        <div className="border-t border-border">
          <CodeBlock
            code={code}
            language={language}
            showLineNumbers
            maxHeight={288}
            className="rounded-none border-0"
          />
        </div>
      )}
    </div>
  )
}

/* ---- Structured BlockingOutput (stdout/stderr/traceback/result) ---- */

export interface BlockingOutputDisplayProps {
  toolName: string
  rawContent: Record<string, unknown>
  toolCallId?: string
  defaultExpanded?: boolean
  className?: string
}

export function BlockingOutputDisplay({
  toolName,
  rawContent,
  toolCallId,
  defaultExpanded = false,
  className,
}: BlockingOutputDisplayProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const stdout = rawContent.stdout as string | undefined
  const stderr = rawContent.stderr as string | undefined
  const result = rawContent.result
  const tb = rawContent.traceback as Record<string, unknown> | undefined

  const hasStdout = stdout && stdout.trim()
  const hasStderr = stderr && stderr.trim()
  const hasTb = !!tb
  const hasResult = result != null

  const summary = hasTb
    ? `Error: ${(tb.exc_type as string) ?? 'Exception'}`
    : hasStdout
      ? stdout.trim().split('\n')[0].slice(0, 80)
      : hasResult
        ? String(typeof result === 'string' ? result : JSON.stringify(result)).slice(0, 80)
        : '(no output)'

  const Chevron = expanded ? ChevronDown : ChevronRight

  return (
    <div className={cn('overflow-hidden rounded-lg border border-success/30', className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full min-w-0 items-center gap-2 bg-success/10 px-3 py-2 text-left text-xs transition-colors hover:bg-success/20"
      >
        <Terminal className="h-3.5 w-3.5 shrink-0 text-success" />
        <span className="text-[10px] font-semibold uppercase text-success">Return</span>
        <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{toolName}</span>
        {toolCallId && (
          <span className="mr-1 font-mono text-[9px] text-muted-foreground">
            {toolCallId.slice(0, 8)}
          </span>
        )}
        <Chevron className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      {!expanded && (
        <div className="truncate border-t border-border px-3 py-1 font-mono text-[10px] text-muted-foreground">
          {summary}
        </div>
      )}

      {expanded && (
        <div className="flex flex-col gap-1.5 border-t border-border p-2">
          {hasTb && (
            <OutputSection
              icon={<AlertTriangle className="h-3 w-3 text-destructive" />}
              label={(tb.exc_type as string) ?? 'Error'}
              labelClass="text-destructive"
              borderClass="border-destructive/30"
              bgClass="bg-destructive/10"
            >
              <div className="px-2 py-1.5 text-xs text-destructive">
                {tb.exc_value as string}
              </div>
              {Array.isArray(tb.frames) && (tb.frames as unknown[]).length > 0 && (
                <pre className="border-t border-destructive/20 px-2 py-1.5 font-mono text-[10px] text-destructive/70">
                  {(tb.frames as Array<Record<string, unknown>>)
                    .map((f) => `  ${f.filename}:${f.lineno} in ${f.name}\n    ${f.line ?? ''}\n`)
                    .join('')}
                </pre>
              )}
            </OutputSection>
          )}

          {hasStdout && (
            <OutputSection
              icon={<Terminal className="h-3 w-3 text-success" />}
              label="stdout"
              labelClass="text-success"
              borderClass="border-success/30"
              bgClass="bg-success/10"
            >
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap px-2 py-1.5 font-mono text-xs text-foreground">
                {stdout.trim()}
              </pre>
            </OutputSection>
          )}

          {hasStderr && (
            <OutputSection
              icon={<AlertTriangle className="h-3 w-3 text-warning" />}
              label="stderr"
              labelClass="text-warning"
              borderClass="border-warning/30"
              bgClass="bg-warning/10"
            >
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap px-2 py-1.5 font-mono text-xs text-warning">
                {stderr.trim()}
              </pre>
            </OutputSection>
          )}

          {hasResult && (
            <OutputSection
              icon={<CheckCircle2 className="h-3 w-3 text-info" />}
              label="result"
              labelClass="text-info"
              borderClass="border-info/30"
              bgClass="bg-info/10"
            >
              <CodeBlock
                code={typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
                language="json"
                maxHeight={192}
                className="rounded-none border-0"
              />
            </OutputSection>
          )}

          {!hasTb && !hasStdout && !hasStderr && !hasResult && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">(no output)</div>
          )}
        </div>
      )}
    </div>
  )
}

export function OutputSection({
  icon,
  label,
  labelClass,
  borderClass,
  bgClass,
  children,
}: {
  icon: ReactNode
  label: string
  labelClass: string
  borderClass: string
  bgClass: string
  children: ReactNode
}) {
  return (
    <div className={cn('overflow-hidden rounded border', borderClass)}>
      <div className={cn('flex items-center gap-1.5 border-b px-2 py-1', borderClass, bgClass)}>
        {icon}
        <span className={cn('text-[10px] font-semibold', labelClass)}>{label}</span>
      </div>
      {children}
    </div>
  )
}
