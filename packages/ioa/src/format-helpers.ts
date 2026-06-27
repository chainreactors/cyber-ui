export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = parseDateValue(value)
  if (!date) return value
  return formatAbsoluteDateTime(date)
}

export function formatTimelineTimestamp(value?: string | null): string {
  if (!value) return '--'
  const date = parseDateValue(value)
  if (!date) return value
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  const sameYear = date.getFullYear() === now.getFullYear()
  const time = formatClockTime(date)
  if (sameDay) return time
  const datePart = sameYear
    ? formatMonthDay(date)
    : formatShortDate(date)
  return `${datePart} ${time}`
}

export function fullTimelineTimestamp(value: string): string {
  const date = parseDateValue(value)
  if (!date) return value
  return formatAbsoluteDateTime(date)
}

function formatAbsoluteDateTime(date: Date): string {
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${formatClockTime(date)}:${pad(date.getSeconds())}`,
  ].join(' ')
}

function formatMonthDay(date: Date): string {
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatShortDate(date: Date): string {
  return `${String(date.getFullYear()).slice(-2)}-${formatMonthDay(date)}`
}

function formatClockTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function parseDateValue(value?: string | null): Date | null {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || !looksLikeTimestamp(text)) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function looksLikeTimestamp(value: string): boolean {
  if (/^step\b/i.test(value)) return false
  if (/^\d{1,4}$/.test(value)) return false
  return /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s]|$)/.test(value)
    || /^\d{4}\/\d{1,2}\/\d{1,2}(?:[T\s]|$)/.test(value)
}
