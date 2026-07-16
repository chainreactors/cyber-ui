import type { HighlightRange, TrafficHighlightSource } from './types'

function normalizeValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  }
  if (typeof value === 'string' && value.length > 0) return [value]
  return []
}

export function collectHighlightTexts(record: TrafficHighlightSource): Set<string> {
  const texts = new Set<string>()

  for (const result of record.match_results ?? []) {
    for (const condition of result.conditions ?? []) {
      if (!condition.matched) continue
      for (const location of condition.locations ?? []) {
        if (location.matched_text) texts.add(location.matched_text)
      }
    }
  }

  for (const values of Object.values(record.poc_matchers ?? {})) {
    normalizeValues(values).forEach((value) => texts.add(value))
  }

  for (const values of Object.values(record.poc_extractors ?? {})) {
    normalizeValues(values).forEach((value) => texts.add(value))
  }

  return texts
}

export function findHighlightRanges(text: string, highlightTexts: Set<string>): HighlightRange[] {
  const ranges: HighlightRange[] = []

  for (const highlightText of highlightTexts) {
    if (!highlightText) continue
    let index = text.indexOf(highlightText)
    while (index !== -1) {
      ranges.push({ start: index, end: index + highlightText.length })
      index = text.indexOf(highlightText, index + 1)
    }
  }

  if (ranges.length === 0) return []
  ranges.sort((a, b) => a.start - b.start)

  const merged: HighlightRange[] = []
  let current = ranges[0]
  for (let i = 1; i < ranges.length; i += 1) {
    const next = ranges[i]
    if (next.start <= current.end) {
      current = { start: current.start, end: Math.max(current.end, next.end) }
      continue
    }
    merged.push(current)
    current = next
  }
  merged.push(current)
  return merged
}

export function normalizeHttpBodyForDisplay(body?: string): string {
  if (!body) return ''
  return body
    .replace(/^\uFEFF/, '')
    .replace(/^(?:[ \t]*\r?\n){2,}/, '\n')
    .replace(/(?:\r?\n[ \t]*){3,}$/, '\n\n')
}

export function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return 'text-green-600 bg-green-50 border-green-200'
  if (code >= 300 && code < 400) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  if (code >= 400 && code < 500) return 'text-orange-600 bg-orange-50 border-orange-200'
  if (code >= 500) return 'text-red-600 bg-red-50 border-red-200'
  return 'text-gray-600 bg-gray-50 border-gray-200'
}

export function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-blue-600 bg-blue-50 border-blue-200',
    POST: 'text-green-600 bg-green-50 border-green-200',
    PUT: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    DELETE: 'text-red-600 bg-red-50 border-red-200',
    PATCH: 'text-purple-600 bg-purple-50 border-purple-200',
  }
  return colors[method.toUpperCase()] || 'text-gray-600 bg-gray-50 border-gray-200'
}
