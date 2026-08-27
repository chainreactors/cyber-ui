import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Loader2,
  Terminal,
  Wrench,
} from 'lucide-react'
import { cn } from '@cyber/theme'
import { CodeBlock, MarkdownContent } from '@cyber/markdown'
import { stripAnsiControl, extractShellCommand, formatArgs, summarizeArgs, summarizeToolCall } from '../../lib/tool-utils'
import { resolveToolResultFormat, type ToolResultFormat } from '../../lib/tool-result-format'

function ToolResultContent({ result, format }: { result: string; format: ToolResultFormat }) {
  if (format.kind === 'markdown') {
    return (
      <div className="max-h-80 overflow-auto rounded-md border border-border/60 bg-card px-3 py-2">
        <MarkdownContent content={result} compact />
      </div>
    )
  }
  if (format.kind === 'code') {
    return (
      <CodeBlock
        code={format.code ?? result}
        language={format.language}
        showLineNumbers
        maxHeight={320}
        className="rounded-md"
      />
    )
  }
  return (
    <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded font-mono text-xs text-foreground">
      {result}
    </pre>
  )
}

function requestCopyValue(args: string, language?: string): string {
  const command = language ? extractShellCommand(args) : undefined
  return command || formatArgs(args)
}

function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    try {
      if (!navigator.clipboard?.writeText) return
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard access can be denied in an embedded/insecure browser context.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-surface-2 hover:text-accent-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function RequestContent({ args, language }: { args: string; language?: string }) {
  const formatted = formatArgs(args)
  const command = language ? extractShellCommand(args) : undefined
  if (command) {
    const prompt = language === 'powershell' ? 'PS> ' : language === 'batch' ? '> ' : '$ '
    const code = command
      .split('\n')
      .map((line, index) => index === 0 ? `${prompt}${line}` : line)
      .join('\n')
    return <CodeBlock code={code} language={language} maxHeight={192} className="rounded-md border-l-2 border-l-accent [&_code]:!whitespace-pre-wrap [&_code]:[overflow-wrap:anywhere] [&_pre]:whitespace-pre-wrap [&_pre]:break-words" />
  }
  let json = false
  try {
    JSON.parse(args)
    json = true
  } catch {
    // Keep plain-text legacy arguments as text rather than claiming JSON.
  }
  return <CodeBlock code={formatted} language={json ? 'json' : undefined} maxHeight={192} className="rounded-md [&_code]:!whitespace-pre-wrap [&_code]:[overflow-wrap:anywhere] [&_pre]:whitespace-pre-wrap [&_pre]:break-words" />
}

export interface ToolCallDisplayProps {
  toolName: string
  toolArgs?: string
  result?: string
  /** Syntax used for shell-like requests; unknown shapes fall back to JSON. */
  requestLanguage?: string
  /** Reasoning emitted in the same agent turn as this call. */
  thinking?: string
  pending?: boolean
  error?: boolean
  defaultExpanded?: boolean
  /** Keep request/response summaries out of the compact header when desired. */
  showHeaderSummary?: boolean
  /** Host theme override for the compact header's hover treatment. */
  headerClassName?: string
  /** Optional localized labels for the expanded body sections. */
  sectionLabels?: {
    thinking?: string
    request?: string
    response?: string
    copyRequest?: string
    copyResponse?: string
    copied?: string
  }
  className?: string
  /** Optional content rendered in the shared call header (for example, an
   *  owning Oracle intent). Keeping this slot here lets host surfaces reuse the
   *  Harness renderer instead of rebuilding a second tool card. */
  headerMeta?: ReactNode
}

export default function ToolCallDisplay({
  toolName,
  toolArgs = '',
  result,
  requestLanguage,
  thinking,
  pending = false,
  error = false,
  defaultExpanded = false,
  showHeaderSummary = true,
  headerClassName,
  sectionLabels,
  className,
  headerMeta,
}: ToolCallDisplayProps) {
  // Keep every tool body collapsed on first render, including calls that have
  // persisted reasoning. Thinking remains available in the body when the user
  // explicitly opens the call, which keeps long tool lists scannable.
  const [expanded, setExpanded] = useState(defaultExpanded)
  const summary = summarizeArgs(toolArgs)
  const formattedArgs = formatArgs(toolArgs)
  const displayResult = result === undefined ? undefined : stripAnsiControl(result)
  const displayThinking = thinking?.trim() || undefined
  const rowSummary = summarizeToolCall(toolArgs, displayResult, pending, error)
  const errorSummary = error ? rowSummary : ''
  const labels = {
    thinking: sectionLabels?.thinking || 'Thinking',
    request: sectionLabels?.request || 'Arguments',
    response: sectionLabels?.response || 'Result',
  }
  const copyLabels = {
    request: sectionLabels?.copyRequest || `Copy ${labels.request.toLowerCase()}`,
    response: sectionLabels?.copyResponse || `Copy ${labels.response.toLowerCase()}`,
    copied: sectionLabels?.copied || 'Copied',
  }
  const displayResultFormat = useMemo(
    () => displayResult === undefined ? undefined : resolveToolResultFormat(toolArgs, displayResult),
    [toolArgs, displayResult],
  )
  const formattedResult = displayResult === undefined
    ? undefined
    : displayResultFormat?.kind === 'code'
      ? (displayResultFormat.code ?? displayResult)
      : displayResult

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-colors duration-200',
        error ? 'border-destructive/35' : pending ? 'border-warning/30' : 'border-border',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full min-w-0 items-center gap-2 bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-surface-2',
          headerClassName,
        )}
      >
        <Wrench
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-colors',
            error ? 'text-destructive' : pending ? 'text-warning' : 'text-muted-foreground',
          )}
        />
        <span className="shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono font-medium text-foreground">
          {toolName || 'tool'}
        </span>
        {headerMeta}
        {showHeaderSummary ? (
          <span
            className={cn(
              'min-w-0 flex-1 truncate font-mono',
              error ? 'text-destructive' : 'text-muted-foreground',
            )}
            title={errorSummary || summary || formattedArgs}
          >
            {rowSummary}
          </span>
        ) : headerMeta ? null : (
          <span className="min-w-0 flex-1" aria-hidden="true" />
        )}
        {error ? (
          <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
        ) : pending ? (
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
          <div className="divide-y divide-border border-t border-border">
            {displayThinking && (
              <div className="bg-card px-3 py-2">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {labels.thinking}
                </div>
                <MarkdownContent content={displayThinking} compact muted />
              </div>
            )}
            {toolArgs && (
              <div className="bg-card px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>{labels.request}</span>
                  <CopyButton value={requestCopyValue(toolArgs, requestLanguage)} label={copyLabels.request} copiedLabel={copyLabels.copied} />
                </div>
                <RequestContent args={toolArgs} language={requestLanguage} />
              </div>
            )}
            {displayResult !== undefined && (
              <div className="px-3 py-2">
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>{labels.response}</span>
                  <CopyButton value={formattedResult ?? displayResult} label={copyLabels.response} copiedLabel={copyLabels.copied} />
                </div>
                <ToolResultContent result={displayResult} format={displayResultFormat ?? { kind: 'text' }} />
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
