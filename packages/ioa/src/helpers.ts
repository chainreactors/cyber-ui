export function contentString(obj: unknown, key: string): string {
  if (typeof obj !== 'object' || obj === null) return ''
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function firstLine(value: string): string {
  return value.split(/\r?\n/).map(line => line.trim()).find(Boolean) ?? ''
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

export function dateValue(value?: string | null): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function messageRefIds(message?: { refs?: { messages?: string[] } }): string[] {
  const refs = message?.refs?.messages
  return Array.isArray(refs) ? refs.filter(Boolean) : []
}

export function serializeFeedbackContent(content: unknown): string {
  const record = content && typeof content === 'object' && !Array.isArray(content)
    ? content as Record<string, unknown>
    : {}
  const feedback = typeof record.feedback === 'string' ? record.feedback.trim() : ''
  const option = typeof record.option === 'string' ? record.option.trim() : ''
  const actor = record.actor && typeof record.actor === 'object' && !Array.isArray(record.actor)
    ? record.actor as Record<string, unknown>
    : {}
  const actorName = typeof actor.name === 'string'
    ? actor.name.trim()
    : typeof actor.type === 'string'
      ? actor.type.trim()
      : ''
  if (!feedback && !option && !actorName) return ''
  return JSON.stringify({
    option,
    text: feedback,
    feedback,
    actor: Object.keys(actor).length > 0 ? actor : undefined,
  })
}

export function parseFeedbackReply(rawValue: string): { raw: string; option: string; text: string; actorName: string } {
  const raw = rawValue.trim()
  if (!raw) return { raw: '', option: '', text: '', actorName: '' }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      const option = asString(record.option).trim()
      const text = asString(record.text).trim() || asString(record.feedback).trim()
      const actor = record.actor && typeof record.actor === 'object' && !Array.isArray(record.actor)
        ? record.actor as Record<string, unknown>
        : {}
      const actorName = asString(actor.name).trim() || asString(actor.type).trim()
      if (option || text || actorName) return { raw, option, text: text || option, actorName }
    }
  } catch {
    const selected = raw.match(/^Selected option:\s*([^\r\n]+)(?:\r?\n\r?\nAdditional feedback:\r?\n([\s\S]*))?$/)
    if (selected) return { raw, option: selected[1].trim(), text: (selected[2] || '').trim() || selected[1].trim(), actorName: '' }
    const bracketed = raw.match(/^\[([^\]]+)\]\s*(.*)$/s)
    if (bracketed) return { raw, option: bracketed[1].trim(), text: bracketed[2].trim() || bracketed[1].trim(), actorName: '' }
    return { raw, option: '', text: raw, actorName: '' }
  }
  return { raw, option: '', text: raw, actorName: '' }
}
