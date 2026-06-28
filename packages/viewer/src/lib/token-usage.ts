export interface TokenUsageSummary extends Record<string, unknown> {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cachedInputTokens?: number
  cacheReadInputTokens?: number
  cacheCreationInputTokens?: number
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function firstNumeric(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key])
    if (value !== null) return value
  }
  return null
}

export function normalizeTokenUsage(value: unknown): TokenUsageSummary | null {
  const record = asRecord(value)
  if (Object.keys(record).length === 0) return null

  const inputTokens = firstNumeric(record, ['input_tokens', 'inputTokens', 'request_tokens', 'prompt_tokens'])
  const outputTokens = firstNumeric(record, ['output_tokens', 'outputTokens', 'response_tokens', 'completion_tokens'])
  const totalTokens = firstNumeric(record, ['total_tokens', 'totalTokens'])
  const cachedInputTokens = firstNumeric(record, ['cached_input_tokens', 'cachedInputTokens'])
  const cacheReadInputTokens = firstNumeric(record, ['cache_read_input_tokens', 'cacheReadInputTokens'])
  const cacheCreationInputTokens = firstNumeric(record, ['cache_creation_input_tokens', 'cacheCreationInputTokens'])

  if (
    inputTokens === null
    && outputTokens === null
    && totalTokens === null
    && cachedInputTokens === null
    && cacheReadInputTokens === null
    && cacheCreationInputTokens === null
  ) {
    return null
  }

  const normalized: TokenUsageSummary = {
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
    totalTokens: totalTokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0)),
  }

  if (cachedInputTokens !== null && cachedInputTokens > 0) {
    normalized.cachedInputTokens = cachedInputTokens
  }
  if (cacheReadInputTokens !== null && cacheReadInputTokens > 0) {
    normalized.cacheReadInputTokens = cacheReadInputTokens
  }
  if (cacheCreationInputTokens !== null && cacheCreationInputTokens > 0) {
    normalized.cacheCreationInputTokens = cacheCreationInputTokens
  }

  return normalized
}

export function mergeTokenUsage(
  ...usages: Array<TokenUsageSummary | null | undefined>
): TokenUsageSummary | null {
  const present = usages.filter((usage): usage is TokenUsageSummary => Boolean(usage))
  if (present.length === 0) return null

  let inputTokens = 0
  let outputTokens = 0
  let totalTokens = 0
  let cachedInputTokens = 0
  let cacheReadInputTokens = 0
  let cacheCreationInputTokens = 0
  let hasCachedInputTokens = false
  let hasCacheReadInputTokens = false
  let hasCacheCreationInputTokens = false

  for (const usage of present) {
    inputTokens += usage.inputTokens
    outputTokens += usage.outputTokens
    totalTokens += usage.totalTokens

    if (typeof usage.cachedInputTokens === 'number') {
      cachedInputTokens += usage.cachedInputTokens
      hasCachedInputTokens = true
    }
    if (typeof usage.cacheReadInputTokens === 'number') {
      cacheReadInputTokens += usage.cacheReadInputTokens
      hasCacheReadInputTokens = true
    }
    if (typeof usage.cacheCreationInputTokens === 'number') {
      cacheCreationInputTokens += usage.cacheCreationInputTokens
      hasCacheCreationInputTokens = true
    }
  }

  const merged: TokenUsageSummary = {
    inputTokens,
    outputTokens,
    totalTokens: totalTokens || (inputTokens + outputTokens),
  }

  if (hasCachedInputTokens && cachedInputTokens > 0) {
    merged.cachedInputTokens = cachedInputTokens
  }
  if (hasCacheReadInputTokens && cacheReadInputTokens > 0) {
    merged.cacheReadInputTokens = cacheReadInputTokens
  }
  if (hasCacheCreationInputTokens && cacheCreationInputTokens > 0) {
    merged.cacheCreationInputTokens = cacheCreationInputTokens
  }

  return merged
}

export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
  return `${Math.round(value)}`
}

export function formatTokenUsageShort(usage: TokenUsageSummary | null | undefined): string {
  if (!usage) return ''
  return `${formatTokenCount(usage.totalTokens)} tok`
}

export function formatTokenUsageLong(usage: TokenUsageSummary | null | undefined): string {
  if (!usage) return ''
  const parts = [
    `${formatTokenCount(usage.totalTokens)} tok`,
    `in ${formatTokenCount(usage.inputTokens)}`,
    `out ${formatTokenCount(usage.outputTokens)}`,
  ]
  if (typeof usage.cachedInputTokens === 'number' && usage.cachedInputTokens > 0) {
    parts.push(`cached ${formatTokenCount(usage.cachedInputTokens)}`)
  }
  return parts.join(' · ')
}
