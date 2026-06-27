export interface ParsedSearchQuery {
  terms: string[]
  labels: string[]
  is: string[]
  type: string[]
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const terms: string[] = []
  const labels: string[] = []
  const is: string[] = []
  const type: string[] = []
  for (const token of tokenizeSearchQuery(query)) {
    const label = token.match(/^label:(.+)$/i)?.[1]?.trim()
    if (label) { labels.push(normalizeSearchLabel(label)); continue }
    const isMatch = token.match(/^is:(.+)$/i)?.[1]?.trim()
    if (isMatch) { is.push(isMatch.toLowerCase()); continue }
    const typeMatch = token.match(/^type:(.+)$/i)?.[1]?.trim()
    if (typeMatch) { type.push(typeMatch.toLowerCase()); continue }
    terms.push(token.toLowerCase())
  }
  return { terms, labels, is, type }
}

export function toggleSearchLabel(query: string, label: string): string {
  const normalized = normalizeSearchLabel(label)
  let removed = false
  const tokens = tokenizeSearchQuery(query).filter((token) => {
    const value = token.match(/^label:(.+)$/i)?.[1]?.trim()
    if (value && normalizeSearchLabel(value) === normalized) {
      removed = true
      return false
    }
    return true
  })
  if (!removed) tokens.push(`label:${quoteSearchToken(label)}`)
  return tokens.map(formatSearchToken).join(' ')
}

export function normalizeSearchLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function tokenizeSearchQuery(query: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (const char of query) {
    if (quote) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (/\s/.test(char)) {
      if (current) tokens.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current) tokens.push(current)
  return tokens
}

function formatSearchToken(token: string): string {
  const label = token.match(/^label:(.+)$/i)?.[1]?.trim()
  return label ? `label:${quoteSearchToken(label)}` : quoteSearchToken(token)
}

function quoteSearchToken(value: string): string {
  return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
}
