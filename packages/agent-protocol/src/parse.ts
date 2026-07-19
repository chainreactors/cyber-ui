/**
 * JSONL parsing utilities for AOP events.
 */

import type { AOPEvent } from './types'
import { AOP_VERSION } from './types'

/**
 * Parse a single JSONL line into an AOPEvent, or null if invalid.
 */
export function parseLine(line: string): AOPEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed[0] !== '{') return null
  try {
    const obj: unknown = JSON.parse(trimmed)
    return isAOPEvent(obj) ? obj : null
  } catch {
    return null
  }
}

/**
 * Check whether a parsed object looks like a valid AOP event.
 */
export function isAOPEvent(obj: unknown): obj is AOPEvent {
  if (typeof obj !== 'object' || obj === null) return false
  const e = obj as Record<string, unknown>
  return (
    e.v === AOP_VERSION &&
    typeof e.type === 'string' &&
    typeof e.ts === 'string' &&
    typeof e.session_id === 'string' &&
    typeof e.agent === 'string' &&
    typeof e.data === 'object' &&
    e.data !== null
  )
}

/**
 * Yield AOP events from an async line iterator (e.g. ReadableStream).
 */
export async function* parseLines(
  lines: AsyncIterable<string>,
): AsyncGenerator<AOPEvent> {
  for await (const line of lines) {
    const event = parseLine(line)
    if (event) yield event
  }
}
