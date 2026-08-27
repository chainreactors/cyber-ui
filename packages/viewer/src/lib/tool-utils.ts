export function stripAnsiControl(value: string): string {
  // eslint-disable-next-line no-control-regex
  const ansiPattern = /[\x1B\x9B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\x07)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g
  return value.replace(ansiPattern, '').replace(/\r\n?/g, '\n')
}

export function formatArgs(args: string): string {
  try {
    return JSON.stringify(JSON.parse(args), null, 2)
  } catch {
    return args
  }
}

/** Extract the command-like payload used by shell tools. A few historical
 * callers persisted the command as plain text, while current Runner calls use
 * an object; malformed or unrelated JSON deliberately returns undefined so
 * the caller can keep the complete request in the JSON/text fallback. */
export function extractShellCommand(args: string): string | undefined {
  const raw = args.trim()
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const record = parsed as Record<string, unknown>
    for (const key of ['command', 'cmd', 'script', 'shell_command', 'input']) {
      if (typeof record[key] === 'string' && record[key].trim()) return (record[key] as string).trim()
    }
    if (Array.isArray(record.commands)) {
      const commands = record.commands.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      if (commands.length > 0) return commands.join('\n')
    }
  } catch {
    return raw
  }
  return undefined
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

const RESULT_SUMMARY_MAX = 240

/** Keep the concrete failure visible in a collapsed tool row while the full
 * result remains available in the expanded inspector. */
export function summarizeResult(result: string): string {
  const compact = stripAnsiControl(result).replace(/\s+/g, ' ').trim()
  if (compact.length <= RESULT_SUMMARY_MAX) return compact
  return `${compact.slice(0, RESULT_SUMMARY_MAX - 1)}…`
}

export function summarizeToolCall(
  args: string,
  result: string | undefined,
  pending: boolean,
  error: boolean,
): string {
  if (error) return summarizeResult(result ?? '') || 'No failure details returned'
  return summarizeArgs(args) || (pending ? 'running' : 'completed')
}

function summaryFromValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(summaryFromValue).filter(Boolean).join(' ')
  if (typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  const preferredKeys = [
    'command', 'cmd', 'query', 'url', 'target', 'input', 'prompt',
    'text', 'content', 'path', 'pattern', 'selector', 'code', 'args',
  ]
  for (const key of preferredKeys) {
    const summary = summaryFromValue(record[key])
    if (summary) return summary
  }
  for (const item of Object.values(record)) {
    const summary = summaryFromValue(item)
    if (summary) return summary
  }
  try { return JSON.stringify(value) } catch { return '' }
}

function compactSummary(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
