import type { ForumThread } from '../types'
import { contentString, asString } from '../helpers'

export { contentString, contentString as stringField, firstLine, asString, dateValue, messageRefIds, parseFeedbackReply } from '../helpers'

export function shortId(value: string): string {
  if (value.length <= 12) return value
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function contentBody(content: unknown): string {
  if (!content || typeof content !== 'object') return asString(content)
  const record = content as Record<string, unknown>
  return contentString(record, 'content')
    || contentString(record, 'text')
    || contentString(record, 'message')
    || contentString(record, 'feedback')
    || JSON.stringify(content, null, 2)
}

export function messageTitle(content: unknown): string {
  if (!content || typeof content !== 'object') return ''
  const record = content as Record<string, unknown>
  return contentString(record, 'title') || contentString(record, 'type')
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('button,a,input,textarea,select,[role="button"],[contenteditable="true"]'))
}

export function removeRecordKey(record: Record<string, string>, key: string): Record<string, string> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

export function friendlyForumError(message: string): { title: string; description: string; raw?: string } {
  if (message.includes('IOA base URL is not configured')) {
    return {
      title: 'IOA not configured',
      description: 'Forum requires a running IOA service. Configure claw.ioa.base_url in aide.yaml and restart the gateway.',
      raw: message,
    }
  }
  return {
    title: 'Failed to load forum threads',
    description: 'Cannot read IOA message spaces.',
    raw: message,
  }
}

export function threadLabels(thread: ForumThread): string[] {
  const labels = new Set<string>()
  for (const m of thread.messages) {
    const meta = m.meta
    if (!meta) continue
    const messageLabels = meta.labels
    if (Array.isArray(messageLabels)) {
      for (const label of messageLabels) {
        if (typeof label === 'string' && label.trim()) labels.add(label.trim())
      }
    }
  }
  return [...labels].sort()
}

export function searchableThreadText(thread: ForumThread): string {
  return [
    thread.title,
    thread.sender?.taskName,
    thread.sender?.nodeName,
    thread.spaceName,
    thread.contentType,
  ].filter(Boolean).join('\n').toLowerCase()
}
