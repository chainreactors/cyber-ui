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
import { cn, copyToClipboard } from '@cyber/theme'
import { CodeBlock, MarkdownContent } from '@cyber/markdown'
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@cyber/ui'
import { stripAnsiControl, extractShellCommand, formatArgs, summarizeArgs, summarizeResult, summarizeToolCall } from '../../lib/tool-utils'
import { resolveToolResultFormat, type ToolResultFormat } from '../../lib/tool-result-format'

const CODE_BLOCK_CLASS_ACCENT = 'rounded-md border-l-2 border-l-accent [&_code]:!whitespace-pre-wrap [&_code]:[overflow-wrap:anywhere] [&_pre]:whitespace-pre-wrap [&_pre]:break-words'
const CODE_BLOCK_CLASS = 'rounded-md [&_code]:!whitespace-pre-wrap [&_code]:[overflow-wrap:anywhere] [&_pre]:whitespace-pre-wrap [&_pre]:break-words'

/**
 * How a result is framed. `auto` keeps the renderer's long-standing choice —
 * a Markdown document is rendered, code is highlighted, anything else is plain
 * text — while `code` puts every result in the same block as the request, which
 * is what a detail inspector wants: one frame, line numbers, wrapping.
 */
export type ToolResultMode = 'auto' | 'code'

function requestCopyValue(args: string, language?: string): string {
  const command = language ? extractShellCommand(args) : undefined
  return command || formatArgs(args)
}

function CopyButton({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    try {
      const ok = await copyToClipboard(value, event.currentTarget)
      if (!ok) return
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

function RequestContent({ args, language, mode }: { args: string; language?: string; mode: ToolResultMode }) {
  const formatted = formatArgs(args)
  const command = language ? extractShellCommand(args) : undefined
  const prompt = language === 'powershell' ? 'PS> ' : language === 'batch' ? '> ' : '$ '
  const body = command
    ? command.split('\n').map((line, index) => index === 0 ? `${prompt}${line}` : line).join('\n')
    : formatted
  if (mode === 'code') {
    // The framed mode claims a syntax and line numbers for every payload, so a
    // plain-text request is framed like the response beside it.
    const syntax = command ? language : formatted.trim().startsWith('{') || formatted.trim().startsWith('[') ? 'json' : 'text'
    return (
      <CodeBlock
        code={body}
        language={syntax}
        showLineNumbers
        maxHeight={192}
        className={cn(CODE_BLOCK_CLASS, command && 'border-l-2 border-l-accent')}
      />
    )
  }
  // Chat keeps the request as it was: a shell command or JSON is highlighted, and
  // arguments that are neither stay unclaimed text.
  if (command) {
    return <CodeBlock code={body} language={language} maxHeight={192} className={CODE_BLOCK_CLASS_ACCENT} />
  }
  let json = false
  try {
    JSON.parse(args)
    json = true
  } catch {
    // Keep plain-text legacy arguments as text rather than claiming JSON.
  }
  return <CodeBlock code={formatted} language={json ? 'json' : undefined} maxHeight={192} className={CODE_BLOCK_CLASS} />
}

/** The text and syntax a result is shown with, whichever mode frames it. */
function resultContent(result: string, toolArgs: string, mode: ToolResultMode, format: ToolResultFormat): {
  code: string
  language?: string
} {
  if (mode === 'code') {
    return format.kind === 'code'
      ? { code: format.code ?? result, language: format.language }
      : { code: result, language: 'text' }
  }
  if (format.kind === 'code') return { code: format.code ?? result, language: format.language }
  return { code: result }
}

function ToolResultContent({ result, toolArgs, mode }: { result: string; toolArgs: string; mode: ToolResultMode }) {
  const format = resolveToolResultFormat(toolArgs, result)
  // A Markdown document is rendered as a document unless the caller asked for
  // the uniform code frame; inside that frame its source is what is shown.
  if (mode === 'auto' && format.kind === 'markdown') {
    return (
      <div className="max-h-80 overflow-auto rounded-md border border-border/60 bg-card px-3 py-2">
        <MarkdownContent content={result} compact />
      </div>
    )
  }
  const content = resultContent(result, toolArgs, mode, format)
  return (
    <CodeBlock
      code={content.code}
      language={content.language}
      showLineNumbers
      maxHeight={320}
      className={CODE_BLOCK_CLASS}
    />
  )
}

/** Host-supplied strings, so this package stays free of i18n dependencies. */
export interface ToolCallLabels {
  arguments: string
  result: string
  failed: string
  running: string
  completed: string
}

const DEFAULT_LABELS: ToolCallLabels = {
  arguments: 'Arguments',
  result: 'Result',
  failed: 'failed',
  running: 'running',
  completed: 'completed',
}

/** Host-supplied labels for the payload sections and their copy buttons. */
export interface ToolCallSectionLabels {
  thinking?: string
  request?: string
  response?: string
  copyRequest?: string
  copyResponse?: string
  copied?: string
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
  /** Frame the result as the same code block as the request, line numbers included. */
  resultMode?: ToolResultMode
  /** Keep request/response summaries out of the compact header when desired. */
  showHeaderSummary?: boolean
  /** Host theme override for the compact header's hover treatment. */
  headerClassName?: string
  /** Enable a localized status hint on hover and keyboard focus. */
  statusLabels?: {
    completed: string
    pending: string
    error: string
    noErrorDetails: string
    expand: string
  }
  /** Optional localized labels for the expanded body sections. */
  sectionLabels?: ToolCallSectionLabels
  className?: string
  /** Optional content rendered in the shared call header (for example, an
   *  owning Oracle intent). Keeping this slot here lets host surfaces reuse the
   *  Harness renderer instead of rebuilding a second tool card. */
  headerMeta?: ReactNode
  labels?: Partial<ToolCallLabels>
  headerExtra?: ReactNode
  children?: ReactNode
  /** Reuse the same body inside a host-owned card, without another disclosure. */
  bodyOnly?: boolean
  /** Separate execution anchors can show each payload once. Arguments remain available for result formatting. */
  content?: 'all' | 'arguments' | 'result'
}

export interface ToolCallBodyProps extends Pick<ToolCallDisplayProps,
  'toolArgs' | 'result' | 'labels' | 'sectionLabels' | 'requestLanguage' | 'thinking' |
  'resultMode' | 'children' | 'bodyOnly' | 'content'> {
}

function PayloadSection({ kind, label, copy, secondary, children }: {
  kind: 'arguments' | 'result' | 'thinking'
  label: string
  copy?: { value: string; label: string; copiedLabel: string }
  secondary: boolean
  children: ReactNode
}) {
  const copyButton = copy && <CopyButton value={copy.value} label={copy.label} copiedLabel={copy.copiedLabel} />
  if (secondary) {
    return (
      <details className="border-t border-border px-3 py-2" data-testid={`tool-${kind}`}>
        <summary className="cursor-pointer text-xs text-muted-foreground">{label}</summary>
        <div className="mt-2">{children}</div>
      </details>
    )
  }
  return (
    <div className="px-3 py-2" data-testid={`tool-${kind}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {copyButton}
      </div>
      {children}
    </div>
  )
}

export function ToolCallBody({
  toolArgs = '',
  result,
  labels,
  sectionLabels,
  requestLanguage,
  thinking,
  resultMode = 'auto',
  children,
  bodyOnly = false,
  content = 'all',
}: ToolCallBodyProps) {
  const l = { ...DEFAULT_LABELS, ...labels }
  const displayResult = result === undefined ? undefined : stripAnsiControl(result)
  const displayThinking = thinking?.trim() || undefined
  // A host opts into the copy affordance by naming it, so a host that never
  // asked for one keeps its card free of extra controls.
  const copied = sectionLabels?.copied || 'Copied'
  const secondary = !!children && !bodyOnly
  return <div className="min-w-0" data-testid="tool-content">
    {children}
    {content !== 'result' && displayThinking && (
      <PayloadSection kind="thinking" label={sectionLabels?.thinking || 'Thinking'} secondary={secondary}>
        <MarkdownContent content={displayThinking} compact muted />
      </PayloadSection>
    )}
    {content !== 'result' && toolArgs && (
      <PayloadSection
        kind="arguments"
        label={sectionLabels?.request || l.arguments}
        copy={sectionLabels?.copyRequest
          ? { value: requestCopyValue(toolArgs, requestLanguage), label: sectionLabels.copyRequest, copiedLabel: copied }
          : undefined}
        secondary={secondary}
      >
        <RequestContent args={toolArgs} language={requestLanguage} mode={resultMode} />
      </PayloadSection>
    )}
    {content !== 'arguments' && displayResult !== undefined && (
      <PayloadSection
        kind="result"
        label={sectionLabels?.response || l.result}
        copy={sectionLabels?.copyResponse
          ? { value: displayResult, label: sectionLabels.copyResponse, copiedLabel: copied }
          : undefined}
        secondary={secondary}
      >
        <ToolResultContent result={displayResult} toolArgs={toolArgs} mode={resultMode} />
      </PayloadSection>
    )}
  </div>
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
  resultMode = 'auto',
  showHeaderSummary = true,
  headerClassName,
  statusLabels,
  sectionLabels,
  className,
  headerMeta,
  labels,
  headerExtra,
  children,
  bodyOnly = false,
  content = 'all',
}: ToolCallDisplayProps) {
  // Keep every tool body collapsed on first render, including calls that have
  // persisted reasoning. Thinking remains available in the body when the user
  // explicitly opens the call, which keeps long tool lists scannable.
  const [expanded, setExpanded] = useState(defaultExpanded)
  const summary = summarizeArgs(toolArgs)
  const formattedArgs = formatArgs(toolArgs)
  const displayResult = useMemo(
    () => result === undefined ? undefined : stripAnsiControl(result),
    [result],
  )
  const rowSummary = summarizeToolCall(toolArgs, displayResult, pending, error)
  const errorSummary = error ? rowSummary : ''
  const l = { ...DEFAULT_LABELS, ...labels }
  const statusLabel = statusLabels && (error ? statusLabels.error : pending ? statusLabels.pending : statusLabels.completed)
  const statusDetail = statusLabels && error ? summarizeResult(displayResult ?? '') || statusLabels.noErrorDetails : ''
  const body = (
    <ToolCallBody
      toolArgs={toolArgs}
      result={result}
      labels={labels}
      sectionLabels={sectionLabels}
      requestLanguage={requestLanguage}
      thinking={thinking}
      resultMode={resultMode}
      bodyOnly={bodyOnly}
      content={content}
    >
      {children}
    </ToolCallBody>
  )
  if (bodyOnly) return <div className={cn('min-w-0', className)}>{body}</div>

  const header = (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      aria-expanded={expanded}
      className={cn(
        'flex w-full min-w-0 items-center gap-2 bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-surface-2',
        headerClassName,
      )}
    >
      <Wrench
        aria-hidden="true"
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-colors',
          error ? 'text-destructive' : pending ? 'text-warning' : 'text-muted-foreground',
        )}
      />
      <span className="shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono font-medium text-foreground">
        {toolName || 'tool'}
      </span>
      {statusLabel && <span className="sr-only">{statusLabel}</span>}
      {headerMeta}
      {showHeaderSummary ? (
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-mono',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
          title={errorSummary || summary || formattedArgs}
        >
          {rowSummary || (error ? l.failed : pending ? l.running : l.completed)}
        </span>
      ) : headerMeta ? null : (
        <span className="min-w-0 flex-1" aria-hidden="true" />
      )}
      {headerExtra}
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
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-colors duration-200',
        error ? 'border-destructive/35' : pending ? 'border-warning/30' : 'border-border',
        className,
      )}
    >
      {statusLabels ? (
        <Tooltip>
          <TooltipTrigger asChild>{header}</TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              align="start"
              sideOffset={6}
              collisionPadding={8}
              className="z-[100] max-w-[min(24rem,calc(100vw-2rem))] whitespace-pre-wrap break-words text-xs leading-relaxed"
            >
              <div className="font-medium">{statusLabel}</div>
              {statusDetail && <div className="mt-1">{statusDetail}</div>}
              {!expanded && <div className="mt-1 text-muted-foreground">{statusLabels.expand}</div>}
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      ) : header}

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-border border-t border-border">
            {body}
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
